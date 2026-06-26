"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import type { EventSnapshot } from "@/lib/types";

type Props = {
  slug: string;
};

export function JudgeBoard({ slug }: Props) {
  const searchParams = useSearchParams();
  const token = searchParams.get("j") ?? "";
  const [snapshot, setSnapshot] = useState<EventSnapshot | null>(null);
  const [judgeName, setJudgeName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTeamId, setBusyTeamId] = useState<string | null>(null);
  const [clickLocked, setClickLocked] = useState(false);
  const [activeTapTeamId, setActiveTapTeamId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const tapLockRef = useRef(false);
  const tapLockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      if (!token) {
        return;
      }
      const response = await fetch(`/api/events/${slug}?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | {
            snapshot?: EventSnapshot;
            judge?: { name: string };
            error?: string;
          }
        | null;

      if (!alive || !data) return;

      if (!response.ok) {
        setError(data.error ?? "Unable to load judge link");
        return;
      }

      if (data.snapshot) setSnapshot(data.snapshot);
      if (data.judge) setJudgeName(data.judge.name);
      setError(null);
    }

    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [slug, token]);

  useEffect(() => {
    return () => {
      if (tapLockTimerRef.current !== null) {
        window.clearTimeout(tapLockTimerRef.current);
      }
    };
  }, []);

  const currentRoundLabel = useMemo(() => {
    if (!snapshot?.currentRound) return "No open round";
    return `Round ${snapshot.currentRound.number}`;
  }, [snapshot?.currentRound]);

  async function tap(teamId: string) {
    if (!token || tapLockRef.current || busyTeamId !== null) return;

    const teamName = snapshot?.event.teams.find((team) => team.id === teamId)?.name ?? "team";

    tapLockRef.current = true;
    setClickLocked(true);
    setActiveTapTeamId(teamId);
    if (tapLockTimerRef.current !== null) {
      window.clearTimeout(tapLockTimerRef.current);
    }
    tapLockTimerRef.current = window.setTimeout(() => {
      tapLockRef.current = false;
      tapLockTimerRef.current = null;
      setClickLocked(false);
      setActiveTapTeamId(null);
    }, 300);

    setBusyTeamId(teamId);
    setLastAction(null);

    try {
      const response = await fetch(`/api/events/${slug}/tap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, teamId }),
      });

      const data = (await response.json().catch(() => null)) as { error?: string; snapshot?: EventSnapshot } | null;
      if (!response.ok) {
        setError(data?.error ?? "Score update failed");
        return;
      }

      if (data?.snapshot) setSnapshot(data.snapshot);
      setLastAction(`+1 for ${teamName}`);
      setError(null);
    } catch {
      setError("Score update failed");
    } finally {
      setBusyTeamId(null);
    }
  }

  async function undo() {
    if (!token) return;
    const response = await fetch(`/api/events/${slug}/undo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string; snapshot?: EventSnapshot } | null;
    if (!response.ok) {
      setError(data?.error ?? "Undo failed");
      return;
    }

    if (data?.snapshot) setSnapshot(data.snapshot);
    setError(null);
    setLastAction("Last tap undone");
  }

  if (!token) {
    return (
      <div className="mx-auto grid min-h-screen max-w-5xl place-items-center px-4 py-10">
        <div className="max-w-lg rounded-[24px] border border-white/10 bg-white/6 p-8 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">Judge link needed</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Open your private scoring link</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            This page is ready, but it needs the unique judge token from the host before scoring can begin.
          </p>
        </div>
      </div>
    );
  }

  const scoringDisabled = !snapshot?.currentRound || snapshot.event.status === "closed";
  const tapDisabled = scoringDisabled || busyTeamId !== null;

  return (
    <div className="min-h-screen p-12 sm:p-12 lg:p-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col gap-8">
        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <main className="grid flex-1 gap-4 lg:grid-cols-2">
          {snapshot?.event.teams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => tap(team.id)}
              disabled={tapDisabled}
              aria-disabled={tapDisabled || clickLocked}
              className={`judge-score-button relative flex min-h-[230px] flex-col overflow-hidden rounded-[28px] border border-white/10 text-left shadow-2xl shadow-black/20 transition duration-150 hover:-translate-y-0.5 active:scale-[0.985] disabled:cursor-not-allowed ${
                activeTapTeamId === team.id ? "judge-tap-button" : ""
              } ${
                scoringDisabled ? "opacity-60" : ""
              } ${
                clickLocked ? "pointer-events-none" : ""
              }`}
              style={{ background: team.color }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(0,0,0,0.12))]" />
              <div
                className={`pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35 ${
                  activeTapTeamId === team.id ? "judge-tap-ripple" : "opacity-0"
                }`}
              />
              <div className="relative flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
                <div
                  className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-black/20 text-6xl shadow-lg ${
                    activeTapTeamId === team.id ? "judge-tap-icon" : ""
                  }`}
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
                <div>
                  <div className="text-3xl font-semibold leading-none">{team.name}</div>
                </div>
              </div>
            </button>
          ))}
        </main>

        {/* <div className="flex justify-end">
          <button
            type="button"
            onClick={undo}
            disabled={!snapshot?.currentRound || snapshot?.event.status === "closed"}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Undo last tap
          </button>
        </div> */}
      </div>
    </div>
  );
}
