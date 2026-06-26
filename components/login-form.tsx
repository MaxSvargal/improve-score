"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/host/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    setPending(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Login failed");
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-[20px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]"
    >
      <div>
        <h2 className="text-xl font-semibold text-white">Host access</h2>
        <p className="mt-1 text-sm text-slate-300">
          Enter the shared host code to manage events.
        </p>
      </div>
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        Access code
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/70"
          placeholder="dev-host"
          autoComplete="one-time-code"
        />
      </label>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Open host dashboard"}
      </button>
    </form>
  );
}
