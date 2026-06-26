import { NextResponse } from "next/server";

import { requireHostAuth } from "@/lib/auth";
import { createEvent, listEvents } from "@/lib/store";
import { clampTeamCount, slugify } from "@/lib/utils";

export async function GET() {
  await requireHostAuth();
  const events = await listEvents();
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  await requireHostAuth();
  const body = await request.json();
  const title = typeof body?.title === "string" ? body.title : "";
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const description = typeof body?.description === "string" ? body.description : "";
  const teamCount = clampTeamCount(Number(body?.teamCount ?? 2));
  const teams = Array.isArray(body?.teams) ? body.teams : undefined;

  if (!title.trim()) {
    return NextResponse.json({ error: "Event title is required" }, { status: 400 });
  }

  const created = await createEvent({
    title,
    slug: slugify(slug || title),
    description,
    teamCount,
    teams,
  });

  return NextResponse.json({ event: created }, { status: 201 });
}
