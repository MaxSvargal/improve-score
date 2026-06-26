export type EventStatus = "draft" | "active" | "closed";

export type RoundStatus = "open" | "closed";

export type Team = {
  id: string;
  name: string;
  color: string;
  emoji: string;
  imageDataUrl?: string;
  order: number;
};

export type Judge = {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  order: number;
};

export type Round = {
  id: string;
  number: number;
  status: RoundStatus;
  startedAt: string;
  finishedAt?: string;
};

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: EventStatus;
  currentRoundId?: string;
  createdAt: string;
  updatedAt: string;
  teams: Team[];
  judges: Judge[];
  rounds: Round[];
};

export type ScoreEvent = {
  id: string;
  eventSlug: string;
  roundId: string;
  judgeId: string;
  teamId: string;
  delta: 1 | -1;
  createdAt: string;
};

export type TeamRoundTotals = Record<string, number>;

export type JudgeRoundTotals = Record<string, Record<string, number>>;

export type RoundJudgeTotals = Record<string, Record<string, TeamRoundTotals>>;

export type EventSnapshot = {
  event: EventRecord;
  currentRound: Round | null;
  scoreEvents: ScoreEvent[];
  teamTotals: Record<string, number>;
  roundTotals: Record<string, TeamRoundTotals>;
  roundJudgeTotals: RoundJudgeTotals;
  judgeTotals: Record<string, TeamRoundTotals>;
  judgeMatrix: Record<string, TeamRoundTotals>;
  leaderboard: Array<{
    teamId: string;
    total: number;
  }>;
  recentScores: ScoreEvent[];
};

export type PersistedState = {
  eventSlugs: string[];
  events: Record<string, EventRecord>;
  scores: Record<string, ScoreEvent[]>;
};
