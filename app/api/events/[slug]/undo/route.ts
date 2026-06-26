import { NextResponse } from "next/server";

import { addScoreEvent, getEvent } from "@/lib/store";

export async function POST(request: Request, context: RouteContext<"/api/events/[slug]/undo">) {
  const { slug } = await context.params;
  const body = await request.json();
  const token = typeof body?.token === "string" ? body.token : "";

  const bundle = await getEvent(slug);
  if (!bundle) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const judge = bundle.event.judges.find((item) => item.token === token);
  if (!judge) {
    return NextResponse.json({ error: "Invalid judge token" }, { status: 403 });
  }
  if (!bundle.event.currentRoundId) {
    return NextResponse.json({ error: "Round already finished" }, { status: 409 });
  }

  const recentJudgeScore = [...bundle.scores]
    .reverse()
    .find((score) => score.judgeId === judge.id && score.roundId === bundle.event.currentRoundId && score.delta === 1);

  if (!recentJudgeScore) {
    return NextResponse.json({ error: "Nothing to undo" }, { status: 400 });
  }

  const score = await addScoreEvent(slug, {
    judgeId: judge.id,
    roundId: bundle.event.currentRoundId,
    teamId: recentJudgeScore.teamId,
    delta: -1,
  });

  return NextResponse.json({ ok: true, score });
}
