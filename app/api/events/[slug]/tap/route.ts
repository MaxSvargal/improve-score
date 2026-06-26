import { NextResponse } from "next/server";

import { addScoreEvent, getEvent } from "@/lib/store";

export async function POST(request: Request, context: RouteContext<"/api/events/[slug]/tap">) {
  const { slug } = await context.params;
  const body = await request.json();
  const token = typeof body?.token === "string" ? body.token : "";
  const teamId = typeof body?.teamId === "string" ? body.teamId : "";

  const bundle = await getEvent(slug);
  if (!bundle) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const judge = bundle.event.judges.find((item) => item.token === token);
  if (!judge) {
    return NextResponse.json({ error: "Invalid judge token" }, { status: 403 });
  }
  if (!judge.isActive) {
    return NextResponse.json({ error: "Judge link disabled" }, { status: 403 });
  }
  if (bundle.event.status === "closed") {
    return NextResponse.json({ error: "Event closed" }, { status: 403 });
  }
  if (!bundle.event.currentRoundId) {
    return NextResponse.json({ error: "Round already finished" }, { status: 409 });
  }
  if (!bundle.event.teams.some((team) => team.id === teamId)) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const score = await addScoreEvent(slug, {
    judgeId: judge.id,
    roundId: bundle.event.currentRoundId,
    teamId,
    delta: 1,
  });

  return NextResponse.json({ ok: true, score });
}
