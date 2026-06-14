import { NextResponse } from "next/server";
import { isDemoVideoModeEnabled } from "@/lib/demo/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    demoVideoMode: isDemoVideoModeEnabled(),
  });
}
