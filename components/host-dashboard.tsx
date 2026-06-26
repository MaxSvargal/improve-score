"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CopyButton } from "@/components/copy-button";
import { fallbackTeamColor, fallbackTeamEmoji } from "@/lib/utils";
import type { EventSnapshot, Team } from "@/lib/types";

type Props = {
  slug: string;
  initialSnapshot: EventSnapshot;
};

type TeamDraft = Team;

export function HostDashboard({ slug, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [teams, setTeams] = useState<TeamDraft[]>(initialSnapshot.event.teams);
  const [title, setTitle] = useState(initialSnapshot.event.title);
  const [description, setDescription] = useState(initialSnapshot.event.description);
  const [judgeName, setJudgeName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const response = await fetch(`/api/events/${slug}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { snapshot?: EventSnapshot };
      if (alive && data.snapshot) {
        setSnapshot(data.snapshot);
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [slug]);

  async function post(action: string, payload: Record<string, unknown> = {}) {
    setBusy(action);
    setMessage(null);

    const response = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    });

    setBusy(null);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(data?.error ?? "Update failed");
      return;
    }

    const data = (await response.json()) as { snapshot?: EventSnapshot };
    if (data.snapshot) {
      setSnapshot(data.snapshot);
      setTeams(data.snapshot.event.teams);
      setTitle(data.snapshot.event.title);
      setDescription(data.snapshot.event.description);
    }
    setMessage("Updated");
  }

  async function saveMeta() {
    await post("update-meta", { title, description });
  }

  async function saveTeams() {
    await post("set-teams", { teams });
  }

  async function addJudge() {
    if (!judgeName.trim()) return;
    await post("add-judge", { name: judgeName });
    setJudgeName("");
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Event settings</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{snapshot.event.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              {snapshot.event.description || "Configure teams, judges, and private scoring links."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              /tournament/{slug}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              {snapshot.event.status.toUpperCase()}
            </span>
            {message ? <span className="text-cyan-200">{message}</span> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Event details</h2>
          <p className="mt-1 text-sm text-slate-300">Update the event name and description shown to the host team.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_auto]">
          <label className="grid gap-2 text-sm text-slate-200">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/70"
            />
          </label>
          <button
            onClick={saveMeta}
            disabled={busy !== null}
            className="self-end rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            Save details
          </button>
        </div>
      </section>

      <section className="grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Teams</h2>
            <p className="mt-1 text-sm text-slate-300">Colors, emoji, and uploaded images flow through to judge buttons.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              onClick={() =>
                setTeams((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name: `Team ${current.length + 1}`,
                    color: fallbackTeamColor(current.length),
                    emoji: fallbackTeamEmoji(current.length),
                    order: current.length,
                  },
                ])
              }
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex-none"
            >
              Add team
            </button>
            <button
              onClick={saveTeams}
              disabled={busy !== null}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 sm:flex-none"
            >
              Save teams
            </button>
          </div>
        </div>
        <div className="grid gap-3">
          {teams.map((team, index) => (
            <TeamEditorRow
              key={team.id}
              team={team}
              index={index}
              onChange={(next) =>
                setTeams((current) => current.map((item) => (item.id === team.id ? next : item)))
              }
              onRemove={() => setTeams((current) => current.filter((item) => item.id !== team.id))}
              canRemove={teams.length > 2}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Judges</h2>
            <p className="mt-1 text-sm text-slate-300">Each judge gets a private named link for the event.</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(180px,1fr)_auto]">
            <input
              value={judgeName}
              onChange={(event) => setJudgeName(event.target.value)}
              placeholder="Judge name"
              className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2 text-white outline-none focus:border-cyan-300/70"
            />
            <button
              onClick={addJudge}
              disabled={busy !== null}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
            >
              Add judge
            </button>
          </div>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {snapshot.event.judges.map((judge) => (
            <article key={judge.id} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <input
                  value={judge.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setSnapshot((current) => ({
                      ...current,
                      event: {
                        ...current.event,
                        judges: current.event.judges.map((item) =>
                          item.id === judge.id ? { ...item, name } : item,
                        ),
                      },
                    }));
                  }}
                  onBlur={(event) => post("rename-judge", { judgeId: judge.id, name: event.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-300/70"
                />
                <button
                  onClick={() => post("toggle-judge", { judgeId: judge.id })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  {judge.isActive ? "Active" : "Disabled"}
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                /tournament/{slug}?j={judge.token}
              </div>
              <CopyButton value={`/tournament/${slug}?j=${judge.token}`} label="Copy link" />
            </article>
          ))}
          {snapshot.event.judges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-slate-300">
              No judge links yet. Add the first judge above to generate a private URL.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TeamEditorRow({
  team,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  team: TeamDraft;
  index: number;
  onChange: (team: TeamDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-4 lg:grid-cols-[1.2fr_1fr_0.8fr]">
      <label className="grid gap-2 text-sm text-slate-200">
        Team name
        <input
          value={team.name}
          onChange={(event) => onChange({ ...team, name: event.target.value })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-300/70"
        />
      </label>
      <label className="grid gap-2 text-sm text-slate-200">
        Color
        <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-2">
          <input
            type="color"
            value={team.color}
            onChange={(event) => onChange({ ...team, color: event.target.value })}
            className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1"
          />
          <input
            value={team.color}
            onChange={(event) => onChange({ ...team, color: event.target.value })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-300/70"
          />
        </div>
      </label>
      <label className="grid gap-2 text-sm text-slate-200">
        Emoji
        <input
          value={team.emoji}
          onChange={(event) => onChange({ ...team, emoji: event.target.value })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-300/70"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
        <label className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10">
          Upload image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const dataUrl = await fileToDataUrl(file);
              onChange({ ...team, imageDataUrl: dataUrl });
            }}
          />
        </label>
        {team.imageDataUrl ? (
          <button
            type="button"
            onClick={() => onChange({ ...team, imageDataUrl: undefined })}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
          >
            Clear image
          </button>
        ) : null}
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-xl border border-white/10 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
          >
            Remove
          </button>
        ) : null}
      </div>
      <div className="lg:col-span-3">
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-black/20 p-3">
          <div
            className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl text-3xl"
            style={{ background: team.color }}
          >
            {team.imageDataUrl ? (
              <Image
                src={team.imageDataUrl}
                alt={team.name}
                width={112}
                height={112}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              team.emoji
            )}
          </div>
          <div className="text-xs text-slate-300">
            <div className="font-medium text-white">
              Team {index + 1}
              <span className="ml-2 text-slate-400">{team.name}</span>
            </div>
            <div className="mt-1">Judge buttons use this same visual treatment.</div>
          </div>
        </div>
      </div>
    </article>
  );
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
