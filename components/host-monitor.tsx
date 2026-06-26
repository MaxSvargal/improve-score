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

    const response = await fetch(`/api/events/${slug}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    setBusy(null);

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { snapshot?: EventSnapshot };
    if (data.snapshot) {
      setSnapshot(data.snapshot);
    }
  }

  const totalTapCount = snapshot.scoreEvents.filter((score) => score.delta > 0).length;
  const roundsDescending = [...snapshot.event.rounds].sort((a, b) => b.number - a.number);

  return (
    <div className="grid gap-5">
      <button
        type="button"
        onClick={() => post("next-round")}
        disabled={busy !== null || snapshot.event.status === "closed"}
        aria-label="Advance to next round"
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-cyan-400 px-5 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.35)] transition hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-[0_20px_48px_rgba(34,211,238,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 sm:bottom-8 sm:right-8"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/10">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
          </svg>
        </span>
        <span className="whitespace-nowrap">Next round</span>
      </button>

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
          <div className="grid gap-4">
            <ScoreTableCard
              title="Total"
              subtitle={`${totalTapCount} votes`}
              teams={snapshot.event.teams}
              judges={snapshot.event.judges}
              judgeTeamTotals={snapshot.judgeTotals}
              showSumRow
              highlight
            />

            {roundsDescending.map((round) => (
              <ScoreTableCard
                key={round.id}
                title={`Round ${round.number}`}
                subtitle={round.status}
                teams={snapshot.event.teams}
                judges={snapshot.event.judges}
                judgeTeamTotals={snapshot.roundJudgeTotals[round.id] ?? {}}
              />
            ))}
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

function ScoreTableCard({
  title,
  subtitle,
  teams,
  judges,
  judgeTeamTotals,
  showSumRow = false,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  teams: EventSnapshot["event"]["teams"];
  judges: EventSnapshot["event"]["judges"];
  judgeTeamTotals: Record<string, Record<string, number>>;
  showSumRow?: boolean;
  highlight?: boolean;
}) {
  const judgeSums = judges.map((judge) =>
    teams.reduce((sum, team) => sum + (judgeTeamTotals[judge.id]?.[team.id] ?? 0), 0),
  );

  return (
    <article
      className={`rounded-2xl border p-4 sm:p-5 ${
        highlight ? "border-cyan-400/20 bg-cyan-500/10" : "border-white/10 bg-slate-950/35"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-base font-semibold text-white">{title}</div>
        <div className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-400">{subtitle}</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="w-[32%] px-3 py-3 text-left font-medium sm:w-[28%] sm:px-4">Team</th>
              {judges.map((judge) => (
                <th key={judge.id} className="px-2 py-3 text-center font-medium sm:px-3">
                  <span className="block whitespace-normal break-words">{judge.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-t border-white/10">
                <td className="px-3 py-3 text-left font-medium text-slate-100 sm:px-4">{team.name}</td>
                {judges.map((judge) => (
                  <td key={judge.id} className="px-2 py-3 text-center text-slate-200 sm:px-3">
                    {judgeTeamTotals[judge.id]?.[team.id] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
            {showSumRow ? (
              <tr className="border-t border-white/10 bg-white/5">
                <td className="px-3 py-3 text-left font-semibold text-white sm:px-4">Sum</td>
                {judgeSums.map((sum, index) => (
                  <td key={judges[index]?.id ?? index} className="px-2 py-3 text-center font-semibold text-white sm:px-3">
                    {sum}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
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
