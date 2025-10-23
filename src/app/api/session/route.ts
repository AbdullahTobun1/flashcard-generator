// src/app/api/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get("unlocked")?.value === "true";
  return NextResponse.json({ unlocked });
}