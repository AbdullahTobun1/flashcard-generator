// src/app/api/unlock/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("t");

    if (!token) {
      return NextResponse.redirect(new URL("/?error=missing_token", req.url));
    }

    const filePath = path.join(process.cwd(), "tokens.json");

    if (!fs.existsSync(filePath)) {
      return NextResponse.redirect(new URL("/?error=system_error", req.url));
    }

    const tokens = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const tokenObj = tokens.find((t: any) => t.token === token && !t.used);

    if (!tokenObj) {
      return NextResponse.redirect(new URL("/?error=invalid_or_used", req.url));
    }

    // Mark as used
    tokenObj.used = true;
    tokenObj.usedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2));

    // Grant permanent access (1 year cookie)
    const response = NextResponse.redirect(new URL("/", req.url));
    response.headers.set(
      "Set-Cookie",
      "unlocked=true; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly; Secure"
    );

    return response;
  } catch (err) {
    console.error("Unlock error:", err);
    return NextResponse.redirect(new URL("/?error=server", req.url));
  }
}