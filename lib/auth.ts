import { cookies } from "next/headers";

const COOKIE_NAME = "improve_score_host";

export function getHostAccessCode() {
  return process.env.HOST_ACCESS_CODE?.trim() || "dev-host";
}

export async function isHostAuthed() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value === getHostAccessCode();
}

export async function requireHostAuth() {
  if (!(await isHostAuthed())) {
    throw new Error("Unauthorized host access");
  }
}

export function hostCookieName() {
  return COOKIE_NAME;
}
