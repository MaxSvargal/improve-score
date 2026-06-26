"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { EventSnapshot, ScoreEvent } from "@/lib/types";

type Props = {
  slug: string;
  initialSnapshot: EventSnapshot;
};

export function HostMonitor({ slug, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
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
    const timer = window.setInterval(refresh, 1500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [slug]);

  async function post(action: string) {
    setBusy(action);
    setMessage(null);

    const response = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
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
    }
    setMessage("Updated");
  }

  const activeJudges = snapshot.event.judges.filter((judge) => judge.isActive).length;
  const totalTapCount = snapshot.scoreEvents.filter((score) => score.delta > 0).length;

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 rounded-[24px] border border-white/10 bg-white/6 p-3 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Link
              href={`/host/${slug}/settings`}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex-none"
            >
              Configure
            </Link>
            <button
              onClick={() => post("next-round")}
              disabled={busy !== null || snapshot.event.status === "closed"}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60 sm:flex-none"
            >
              Next round
            </button>
            <button
              onClick={() => post(snapshot.event.status === "closed" ? "reopen-event" : "close-event")}
              disabled={busy !== null}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gray-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-60 sm:flex-none"
            >
              {snapshot.event.status === "closed" ? "Reopen event" : "Close event"}
            </button>
          </div>
        </div>
      </section>
      
      <section className="grid gap-5 rounded-[24px] border border-white/10 bg-white/6 p-4 sm:p-5">
        <div className="grid gap-4">
          <div className="md:hidden">
            <div className="grid gap-3">
              {snapshot.event.judges.map((judge) => {
                const totals = snapshot.judgeMatrix[judge.id] ?? {};
                const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
                return (
                  <article key={judge.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{judge.name}</div>
                      <div className="text-sm text-cyan-200">{total}</div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {snapshot.event.teams.map((team) => (
                        <div key={team.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                          <span className="text-slate-200">{team.name}</span>
                          <span className="font-semibold text-white">{totals[team.id] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}

              <article className="rounded-2xl border border-white/10 bg-cyan-500/10 p-4">
                <div className="text-sm font-semibold text-white">Team totals</div>
                <div className="mt-3 grid gap-2">
                  {snapshot.event.teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
                      <span className="text-slate-200">{team.name}</span>
                      <span className="font-semibold text-white">{snapshot.teamTotals[team.id] ?? 0}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Source</th>
                  {snapshot.event.teams.map((team) => (
                    <th key={team.id} className="px-4 py-3 font-medium">
                      {team.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.event.judges.map((judge) => {
                  const totals = snapshot.judgeMatrix[judge.id] ?? {};
                  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
                  return (
                    <tr key={judge.id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-slate-100">{judge.name}</td>
                      {snapshot.event.teams.map((team) => (
                        <td key={team.id} className="px-4 py-3 text-slate-200">
                          {totals[team.id] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 font-semibold text-white">{total}</td>
                    </tr>
                  );
                })}
                {snapshot.event.rounds.map((round) => {
                  const totals = snapshot.roundTotals[round.id] ?? {};
                  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
                  return (
                    <tr key={round.id} className="border-t border-white/10 bg-white/[0.03]">
                      <td className="px-4 py-3 text-slate-100">
                        Round {round.number}
                        <span className="ml-2 text-xs text-slate-400">{round.status}</span>
                      </td>
                      {snapshot.event.teams.map((team) => (
                        <td key={team.id} className="px-4 py-3 text-slate-200">
                          {totals[team.id] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-slate-300">{total}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-white/10 bg-cyan-500/10">
                  <td className="px-4 py-3 font-semibold text-white">Team totals</td>
                  {snapshot.event.teams.map((team) => (
                    <td key={team.id} className="px-4 py-3 font-semibold text-white">
                      {snapshot.teamTotals[team.id] ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-slate-300">{totalTapCount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">History</div>
              </div>
              <div className="text-xs text-slate-400">{snapshot.recentScores.length} records shown</div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/45">
              <div className="grid divide-y divide-white/10">
                {snapshot.recentScores.map((score) => (
                  <RecentTapRow key={score.id} score={score} snapshot={snapshot} />
                ))}
                {snapshot.recentScores.length === 0 ? (
                  <div className="p-4 text-sm text-slate-300">No taps yet for this event.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function RecentTapRow({ score, snapshot }: { score: ScoreEvent; snapshot: EventSnapshot }) {
  const judge = snapshot.event.judges.find((item) => item.id === score.judgeId);
  const team = snapshot.event.teams.find((item) => item.id === score.teamId);
  const round = snapshot.event.rounds.find((item) => item.id === score.roundId);

  return (
    <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="truncate font-semibold text-white">
          {judge?.name ?? "Unknown judge"}
          <span className="ml-2 font-normal text-slate-300">{team?.name ?? "Unknown team"}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {round ? `Round ${round.number}` : "Round"} · {new Date(score.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${score.delta > 0 ? "bg-cyan-500/15 text-cyan-100" : "bg-rose-500/15 text-rose-100"}`}>
        {score.delta > 0 ? "+1" : "-1"}
      </div>
    </article>
  );
}
