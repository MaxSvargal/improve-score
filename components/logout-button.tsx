"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/host/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
