import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";

import { computeSnapshot } from "./compute";
import type { EventRecord, EventSnapshot, PersistedState, ScoreEvent, Team } from "./types";
import { clampTeamCount, fallbackTeamColor, fallbackTeamEmoji, nowIso, randomId, sanitizeColor, slugify } from "./utils";

const FILE_PATH = path.join(process.cwd(), ".data", "score-store.json");
const EVENT_INDEX_KEY = "improve-score:event-index";
const EVENT_KEY_PREFIX = "improve-score:event:";
const SCORE_KEY_PREFIX = "improve-score:scores:";
const isVercelDeployment = process.env.VERCEL === "1" && process.env.VERCEL_ENV !== "development";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

let writeQueue = Promise.resolve();

export class StoreConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoreConfigurationError";
  }
}

function getStoreBackend() {
  if (redis) {
    return "redis" as const;
  }

  if (isVercelDeployment) {
    throw new StoreConfigurationError(
      "Production storage is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel, then redeploy.",
    );
  }

  return "file" as const;
}

function parseStoredJson<T>(value: unknown): T | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function defaultState(): PersistedState {
  return {
    eventSlugs: [],
    events: {},
    scores: {},
  };
}

async function readFileState(): Promise<PersistedState> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      eventSlugs: parsed.eventSlugs ?? [],
      events: parsed.events ?? {},
      scores: parsed.scores ?? {},
    };
  } catch {
    return defaultState();
  }
}

async function writeFileState(state: PersistedState) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function readState(): Promise<PersistedState> {
  const backend = getStoreBackend();
  if (backend === "file") {
    return readFileState();
  }

  const client = redis!;
  const index = ((await client.smembers(EVENT_INDEX_KEY)) as string[] | null) ?? [];
  const events: Record<string, EventRecord> = {};
  const scores: Record<string, ScoreEvent[]> = {};

  for (const slug of index) {
    const meta = await client.get(`${EVENT_KEY_PREFIX}${slug}`);
    if (meta) {
      events[slug] = parseStoredJson<EventRecord>(meta) as EventRecord;
    }
    const eventScores = (await client.lrange(`${SCORE_KEY_PREFIX}${slug}`, 0, -1)) as unknown[] | null;
    scores[slug] = (eventScores ?? [])
      .map((item) => parseStoredJson<ScoreEvent>(item))
      .filter((item): item is ScoreEvent => item !== null);
  }

  return {
    eventSlugs: index,
    events,
    scores,
  };
}

async function writeState(state: PersistedState) {
  const backend = getStoreBackend();
  if (backend === "file") {
    await writeFileState(state);
    return;
  }

  const client = redis!;
  await client.del(EVENT_INDEX_KEY);
  if (state.eventSlugs.length > 0) {
    for (const slug of state.eventSlugs) {
      await client.sadd(EVENT_INDEX_KEY, slug);
    }
  }

  for (const [slug, event] of Object.entries(state.events)) {
    await client.set(`${EVENT_KEY_PREFIX}${slug}`, JSON.stringify(event));
  }

  const existingSlugs = new Set(Object.keys(state.scores));
  for (const slug of state.eventSlugs) {
    await client.del(`${SCORE_KEY_PREFIX}${slug}`);
    const eventScores = state.scores[slug] ?? [];
    if (eventScores.length > 0) {
      for (const score of eventScores.map((item) => JSON.stringify(item))) {
        await client.rpush(`${SCORE_KEY_PREFIX}${slug}`, score);
      }
    }
    existingSlugs.delete(slug);
  }

  for (const slug of existingSlugs) {
    await client.del(`${SCORE_KEY_PREFIX}${slug}`);
  }
}

async function mutateState(mutator: (state: PersistedState) => Promise<void> | void) {
  const next = writeQueue.then(async () => {
    const state = await readState();
    await mutator(state);
    await writeState(state);
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

function normalizeTeams(inputCount: number, rawTeams?: Array<Partial<Team>>) {
  const teamCount = clampTeamCount(inputCount);
  return Array.from({ length: teamCount }, (_, index) => {
    const team = rawTeams?.[index];
    return {
      id: team?.id ?? randomId("team"),
      name: team?.name?.trim() || `Team ${index + 1}`,
      color: sanitizeColor(team?.color ?? "", fallbackTeamColor(index)),
      emoji: team?.emoji?.trim() || fallbackTeamEmoji(index),
      imageDataUrl: team?.imageDataUrl?.trim() || undefined,
      order: index,
    };
  });
}

export async function listEvents() {
  const state = await readState();
  return state.eventSlugs
    .map((slug) => state.events[slug])
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEvent(slug: string) {
  const state = await readState();
  const event = state.events[slug];
  if (!event) return null;
  return {
    event,
    scores: state.scores[slug] ?? [],
    snapshot: computeSnapshot(event, state.scores[slug] ?? []),
  };
}

export async function createEvent(input: {
  title: string;
  slug?: string;
  description?: string;
  teamCount: number;
  teams?: Array<Partial<Team>>;
}) {
  const slug = slugify(input.slug || input.title);
  if (!slug) {
    throw new Error("Event slug cannot be empty");
  }

  let created: EventRecord | null = null;

  await mutateState(async (state) => {
    if (state.events[slug]) {
      throw new Error("An event with that slug already exists");
    }

    const now = nowIso();
    const event: EventRecord = {
      id: randomId("event"),
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || "",
      status: "active",
      createdAt: now,
      updatedAt: now,
      currentRoundId: undefined,
      teams: normalizeTeams(input.teamCount, input.teams),
      judges: [],
      rounds: [
        {
          id: randomId("round"),
          number: 1,
          status: "open",
          startedAt: now,
        },
      ],
    };

    event.currentRoundId = event.rounds[0]?.id;
    state.eventSlugs.push(slug);
    state.events[slug] = event;
    state.scores[slug] = [];
    created = event;
  });

  if (!created) {
    throw new Error("Unable to create event");
  }
  return created;
}

export async function updateEvent(
  slug: string,
  updater: (event: EventRecord) => EventRecord | Promise<EventRecord>,
) {
  await mutateState(async (state) => {
    const event = state.events[slug];
    if (!event) {
      throw new Error("Event not found");
    }
    const next = await updater(event);
    next.updatedAt = nowIso();
    state.events[slug] = next;
  });
}

export async function addScoreEvent(slug: string, score: Omit<ScoreEvent, "id" | "createdAt" | "eventSlug">) {
  let nextScore: ScoreEvent | null = null;

  await mutateState(async (state) => {
    const event = state.events[slug];
    if (!event) {
      throw new Error("Event not found");
    }

    nextScore = {
      id: randomId("score"),
      eventSlug: slug,
      createdAt: nowIso(),
      ...score,
    };

    state.scores[slug] = [...(state.scores[slug] ?? []), nextScore];
    event.updatedAt = nextScore.createdAt;
    state.events[slug] = event;
  });

  if (!nextScore) {
    throw new Error("Unable to save score");
  }
  return nextScore;
}

export async function getEventSnapshot(slug: string): Promise<EventSnapshot | null> {
  const bundle = await getEvent(slug);
  return bundle?.snapshot ?? null;
}

export async function setEventTeams(slug: string, teams: Array<Partial<Team>>) {
  await updateEvent(slug, (event) => ({
    ...event,
    teams: normalizeTeams(teams.length, teams),
  }));
}

export async function addJudge(slug: string, name: string) {
  await updateEvent(slug, (event) => {
    const now = nowIso();
    return {
      ...event,
      judges: [
        ...event.judges,
        {
          id: randomId("judge"),
          name: name.trim(),
          token: crypto.randomUUID().replaceAll("-", ""),
          isActive: true,
          order: event.judges.length,
        },
      ],
      updatedAt: now,
    };
  });
}

export async function toggleJudge(slug: string, judgeId: string) {
  await updateEvent(slug, (event) => ({
    ...event,
    judges: event.judges.map((judge) =>
      judge.id === judgeId ? { ...judge, isActive: !judge.isActive } : judge,
    ),
  }));
}

export async function updateJudgeName(slug: string, judgeId: string, name: string) {
  await updateEvent(slug, (event) => ({
    ...event,
    judges: event.judges.map((judge) => (judge.id === judgeId ? { ...judge, name: name.trim() } : judge)),
  }));
}

export async function startNextRound(slug: string) {
  await updateEvent(slug, (event) => {
    const openRound = event.rounds.find((round) => round.status === "open");
    if (openRound) {
      return event;
    }
    const nextNumber = event.rounds.length + 1;
    const newRound = {
      id: randomId("round"),
      number: nextNumber,
      status: "open" as const,
      startedAt: nowIso(),
    };
    return {
      ...event,
      status: "active",
      currentRoundId: newRound.id,
      rounds: [...event.rounds, newRound],
    };
  });
}

export async function advanceRound(slug: string) {
  await updateEvent(slug, (event) => {
    if (event.status === "closed") {
      throw new Error("Event closed");
    }

    const now = nowIso();
    const currentRound = event.rounds.find((round) => round.id === event.currentRoundId && round.status === "open");
    const nextNumber = (currentRound?.number ?? event.rounds.length) + 1;

    const rounds = event.rounds.map((round) =>
      round.id === currentRound?.id
        ? {
            ...round,
            status: "closed" as const,
            finishedAt: now,
          }
        : round,
    );

    const nextRound = {
      id: randomId("round"),
      number: nextNumber,
      status: "open" as const,
      startedAt: now,
    };

    return {
      ...event,
      status: "active",
      currentRoundId: nextRound.id,
      rounds: [...rounds, nextRound],
    };
  });
}

export async function finishCurrentRound(slug: string) {
  await updateEvent(slug, (event) => {
    const currentRound = event.rounds.find((round) => round.id === event.currentRoundId && round.status === "open");
    if (!currentRound) {
      return event;
    }
    return {
      ...event,
      currentRoundId: undefined,
      rounds: event.rounds.map((round) =>
        round.id === currentRound.id
          ? {
              ...round,
              status: "closed",
              finishedAt: nowIso(),
            }
          : round,
      ),
    };
  });
}

export async function closeEvent(slug: string) {
  await updateEvent(slug, (event) => ({
    ...event,
    status: "closed",
    currentRoundId: undefined,
    rounds: event.rounds.map((round) =>
      round.status === "open"
        ? {
            ...round,
            status: "closed",
            finishedAt: nowIso(),
          }
        : round,
    ),
  }));
}

export async function reopenEvent(slug: string) {
  await updateEvent(slug, (event) => ({
    ...event,
    status: "active",
  }));
}
