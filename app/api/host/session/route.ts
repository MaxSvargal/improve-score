import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getHostAccessCode, hostCookieName } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({
    authenticated: cookieStore.get(hostCookieName())?.value === getHostAccessCode(),
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let code = "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    code = typeof body?.code === "string" ? body.code.trim() : "";
  } else {
    const form = await request.formData().catch(() => null);
    const raw = form?.get("code");
    code = typeof raw === "string" ? raw.trim() : "";
  }

  if (code !== getHostAccessCode()) {
    return NextResponse.json({ error: "Invalid host access code" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(hostCookieName(), getHostAccessCode(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(hostCookieName());
  return NextResponse.json({ ok: true });
}
