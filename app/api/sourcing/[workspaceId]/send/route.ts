import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function POST(): NextResponse {
  return NextResponse.json(
    {
      error: "Direct sending is not available. Review each introduction, then contact the manufacturer through a visible human-controlled channel.",
    },
    { status: 410 },
  );
}
