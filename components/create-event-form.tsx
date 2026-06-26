"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { fallbackTeamColor, fallbackTeamEmoji, slugify } from "@/lib/utils";

type Props = {
  defaultTeamCount?: number;
};

export function CreateEventForm({ defaultTeamCount = 2 }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [teamCount, setTeamCount] = useState(defaultTeamCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const teams = Array.from({ length: teamCount }, (_, index) => ({
      name: `Team ${index + 1}`,
      color: fallbackTeamColor(index),
      emoji: fallbackTeamEmoji(index),
    }));

    const response = await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        slug: slugify(slug || title),
        description,
        teamCount,
        teams,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to create event");
      return;
    }

    const data = (await response.json()) as { event?: { slug: string } };
    router.push(`/host/${data.event?.slug ?? slugify(title)}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-[20px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:grid-cols-[1.5fr_1fr]"
    >
      <div className="grid gap-3">
        <label className="grid gap-2 text-sm text-slate-200">
          Event title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70"
            placeholder="Comedy Season 1"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Event slug
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70"
            placeholder="comedy-season-1"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-200">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70"
            placeholder="Tap-to-score event for judges and host"
          />
        </label>
      </div>
      <div className="flex flex-col gap-3">
        <label className="grid gap-2 text-sm text-slate-200">
          Team count
          <input
            type="number"
            min={2}
            max={6}
            value={teamCount}
            onChange={(event) => setTeamCount(Number(event.target.value))}
            className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300/70"
          />
        </label>
        <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
          Team colors and emoji default to a vivid preset and can be edited on the event page.
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          disabled={pending}
          className="mt-auto inline-flex items-center justify-center rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creating..." : "Create event"}
        </button>
      </div>
    </form>
  );
}
