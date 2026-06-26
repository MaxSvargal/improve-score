import type { EventRecord, EventSnapshot, Round, RoundJudgeTotals, ScoreEvent, TeamRoundTotals } from "./types";

function emptyTotals(event: EventRecord) {
  return Object.fromEntries(event.teams.map((team) => [team.id, 0])) as Record<string, number>;
}

function roundById(event: EventRecord, roundId?: string) {
  return roundId ? event.rounds.find((round) => round.id === roundId) ?? null : null;
}

export function computeSnapshot(event: EventRecord, scoreEvents: ScoreEvent[]): EventSnapshot {
  const teamTotals = emptyTotals(event);
  const roundTotals: Record<string, TeamRoundTotals> = {};
  const roundJudgeTotals: RoundJudgeTotals = {};
  const judgeTotals: Record<string, TeamRoundTotals> = {};
  const judgeMatrix: Record<string, TeamRoundTotals> = {};

  for (const round of event.rounds) {
    roundTotals[round.id] = emptyTotals(event);
    roundJudgeTotals[round.id] = {};
  }

  for (const score of scoreEvents) {
    const teamBucket = teamTotals[score.teamId] ?? 0;
    teamTotals[score.teamId] = teamBucket + score.delta;

    if (!roundTotals[score.roundId]) {
      roundTotals[score.roundId] = emptyTotals(event);
    }
    roundTotals[score.roundId][score.teamId] = (roundTotals[score.roundId][score.teamId] ?? 0) + score.delta;

    if (!roundJudgeTotals[score.roundId]) {
      roundJudgeTotals[score.roundId] = {};
    }
    if (!roundJudgeTotals[score.roundId][score.judgeId]) {
      roundJudgeTotals[score.roundId][score.judgeId] = emptyTotals(event);
    }
    roundJudgeTotals[score.roundId][score.judgeId][score.teamId] =
      (roundJudgeTotals[score.roundId][score.judgeId][score.teamId] ?? 0) + score.delta;

    if (!judgeTotals[score.judgeId]) {
      judgeTotals[score.judgeId] = emptyTotals(event);
    }
    judgeTotals[score.judgeId][score.teamId] = (judgeTotals[score.judgeId][score.teamId] ?? 0) + score.delta;

    if (!judgeMatrix[score.judgeId]) {
      judgeMatrix[score.judgeId] = emptyTotals(event);
    }
    judgeMatrix[score.judgeId][score.teamId] = (judgeMatrix[score.judgeId][score.teamId] ?? 0) + score.delta;
  }

  const currentRound = roundById(event, event.currentRoundId);
  const leaderboard = [...event.teams]
    .map((team) => ({
      teamId: team.id,
      total: teamTotals[team.id] ?? 0,
    }))
    .sort((a, b) => b.total - a.total || a.teamId.localeCompare(b.teamId));

  const recentScores = [...scoreEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    event,
    currentRound,
    scoreEvents,
    teamTotals,
    roundTotals,
    roundJudgeTotals,
    judgeTotals,
    judgeMatrix,
    leaderboard,
    recentScores,
  };
}

export function activeRound(event: EventRecord): Round | null {
  return event.rounds.find((round) => round.status === "open") ?? null;
}
