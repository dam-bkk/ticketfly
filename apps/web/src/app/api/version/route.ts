import { NextResponse } from "next/server";
import { APP_ENV, APP_VERSION } from "@/lib/auth";

export function GET() {
  return NextResponse.json({ name: "ticketfly", version: APP_VERSION, environment: APP_ENV, commit: process.env.GIT_SHA ?? "local", builtAt: process.env.BUILD_TIME ?? null });
}
