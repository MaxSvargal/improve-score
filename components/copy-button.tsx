"use client";

import { useState } from "react";

type Props = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = value.startsWith("http") ? value : `${window.location.origin}${value}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/10"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
