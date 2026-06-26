import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-10">
        <section className="grid gap-8 rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div className="grid content-start gap-6">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Score counter</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Host live rounds, give judges one-tap scoring, and keep the board in sync.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300">
              Create events, shape team colors and emojis, share unique judge links, and watch live tables
              update as the round unfolds.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/host"
                className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Open host dashboard
              </Link>
              <Link
                href="/host"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Open live workspace
              </Link>
            </div>
          </div>
          <div className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-300">Round table</span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                realtime
              </span>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl bg-[#165dff] px-4 py-5 text-white">
                <div className="text-sm uppercase tracking-[0.2em]">Team 1</div>
                <div className="mt-6 flex items-end justify-between">
                  <span className="text-5xl">🔥</span>
                  <span className="text-4xl font-semibold">12</span>
                </div>
              </div>
              <div className="rounded-2xl bg-[#d9480f] px-4 py-5 text-white">
                <div className="text-sm uppercase tracking-[0.2em]">Team 2</div>
                <div className="mt-6 flex items-end justify-between">
                  <span className="text-5xl">⚡</span>
                  <span className="text-4xl font-semibold">9</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Hosts", "Create events, manage rounds, and close scores read-only."],
            ["Judges", "Tap a single colored button to add one point."],
            ["Analytics", "See totals by round, judge, and team at a glance."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-[22px] border border-white/10 bg-white/6 p-5">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
