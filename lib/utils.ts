export function nowIso() {
  return new Date().toISOString();
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function clampTeamCount(value: number) {
  if (!Number.isFinite(value)) return 2;
  return Math.max(2, Math.min(6, Math.trunc(value)));
}

export function sanitizeColor(value: string, fallback: string) {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  if (/^rgb\(/i.test(trimmed) || /^hsl\(/i.test(trimmed)) return trimmed;
  return fallback;
}

export function fallbackTeamColor(index: number) {
  const palette = ["#165dff", "#d9480f", "#0f766e", "#7c3aed", "#b91c1c", "#047857"];
  return palette[index % palette.length] ?? "#165dff";
}

export function fallbackTeamEmoji(index: number) {
  const emojis = ["🔥", "⚡", "🎯", "🚀", "🟢", "🟠"];
  return emojis[index % emojis.length] ?? "🎯";
}
