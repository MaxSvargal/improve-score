import { NextResponse } from "next/server";

import { isHostAuthed } from "@/lib/auth";
import {
  addJudge,
  advanceRound,
  closeEvent,
  finishCurrentRound,
  getEvent,
  getEventSnapshot,
  reopenEvent,
  setEventTeams,
  startNextRound,
  toggleJudge,
  updateEvent,
  updateJudgeName,
} from "@/lib/store";
import type { EventRecord, Team } from "@/lib/types";

function findJudgeByToken(event: EventRecord, token: string) {
  return event.judges.find((judge) => judge.token === token) ?? null;
}

function publicEvent(event: EventRecord) {
  return {
    ...event,
    judges: event.judges.map((judge) => ({
      id: judge.id,
      name: judge.name,
      isActive: judge.isActive,
      order: judge.order,
    })),
  };
}

export async function GET(request: Request, context: RouteContext<"/api/events/[slug]">) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const host = await isHostAuthed();
  const bundle = await getEvent(slug);

  if (!bundle) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (host) {
    return NextResponse.json({
      host: true,
      event: bundle.event,
      snapshot: bundle.snapshot,
    });
  }

  if (!token) {
    return NextResponse.json({ error: "Judge token required" }, { status: 401 });
  }

  const judge = findJudgeByToken(bundle.event, token);
  if (!judge) {
    return NextResponse.json({ error: "Invalid judge token" }, { status: 403 });
  }

  return NextResponse.json({
    host: false,
    judge: {
      id: judge.id,
      name: judge.name,
      isActive: judge.isActive,
      order: judge.order,
    },
    event: publicEvent(bundle.event),
    snapshot: bundle.snapshot,
  });
}

export async function PATCH(request: Request, context: RouteContext<"/api/events/[slug]">) {
  const authed = await isHostAuthed();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const body = await request.json();
  const action = typeof body?.action === "string" ? body.action : "";

  try {
    if (action === "update-meta") {
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      await updateEvent(slug, (event) => ({
        ...event,
        title: title || event.title,
        description,
      }));
    } else if (action === "set-teams") {
      const teams = Array.isArray(body?.teams) ? (body.teams as Array<Partial<Team>>) : [];
      await setEventTeams(slug, teams);
    } else if (action === "add-judge") {
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json({ error: "Judge name is required" }, { status: 400 });
      }
      await addJudge(slug, name);
    } else if (action === "rename-judge") {
      const judgeId = typeof body?.judgeId === "string" ? body.judgeId : "";
      const name = typeof body?.name === "string" ? body.name : "";
      await updateJudgeName(slug, judgeId, name);
    } else if (action === "toggle-judge") {
      const judgeId = typeof body?.judgeId === "string" ? body.judgeId : "";
      await toggleJudge(slug, judgeId);
    } else if (action === "start-next-round") {
      await startNextRound(slug);
    } else if (action === "next-round") {
      await advanceRound(slug);
    } else if (action === "finish-round") {
      await finishCurrentRound(slug);
    } else if (action === "close-event") {
      await closeEvent(slug);
    } else if (action === "reopen-event") {
      await reopenEvent(slug);
    } else {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const snapshot = await getEventSnapshot(slug);
  return NextResponse.json({ ok: true, snapshot });
}
