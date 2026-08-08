import { fetchWellness } from "@/lib/intervals";
import { PLAN_START } from "@/lib/config";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oldest = searchParams.get("oldest") ?? PLAN_START;
  const newest =
    searchParams.get("newest") ?? new Date().toISOString().slice(0, 10);

  try {
    const wellness = await fetchWellness(oldest, newest);

    const mapped = wellness.map((w) => ({
      date: w.id,
      resting_hr: w.restingHR ?? null,
      sleep_sec: w.sleepSecs ?? null,
      ctl: w.ctl ?? null,
      atl: w.atl ?? null,
      ramp_rate: w.rampRate ?? null,
    }));

    return Response.json(mapped);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
