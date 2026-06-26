import Link from "next/link";

import { CreateEventForm } from "@/components/create-event-form";
import { LoginForm } from "@/components/login-form";
import { LogoutButton } from "@/components/logout-button";
import { isHostAuthed } from "@/lib/auth";
import { listEvents } from "@/lib/store";

export default async function HostPage() {
  const authed = await isHostAuthed();

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10">
        <LoginForm />
      </div>
    );
  }

  const events = await listEvents();

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/6 px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">Host dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Manage events</h1>
          </div>
          <LogoutButton />
        </header>

        <section className="grid gap-4 rounded-[20px] border border-white/10 bg-white/6 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Create event</h2>
            <p className="mt-1 text-sm text-slate-300">
              Start with a title, slug, and team count. Team styling can be refined on the event page.
            </p>
          </div>
          <CreateEventForm />
        </section>

        <section className="grid gap-4 rounded-[20px] border border-white/10 bg-white/6 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Your events</h2>
              <p className="mt-1 text-sm text-slate-300">Open one to edit teams, judges, and round controls.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
              {events.length} total
            </span>
          </div>

          <div className="grid gap-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 md:grid-cols-[1.6fr_auto]"
              >
                <div>
                  <div className="text-base font-semibold text-white">{event.title}</div>
                  <div className="mt-1 text-sm text-slate-400">/tournament/{event.slug}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {event.teams.length} teams · {event.judges.length} judges · {event.rounds.length} rounds
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm font-semibold text-cyan-200">
                    {event.status}
                  </span>
                  <Link
                    href={`/host/${event.slug}`}
                    className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Monitor
                  </Link>
                  <Link
                    href={`/host/${event.slug}/settings`}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Configure
                  </Link>
                </div>
              </article>
            ))}
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-300">
                No events yet. Create the first one above.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
