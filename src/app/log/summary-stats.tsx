import type { Activity } from "@/lib/database.types";
import { formatPace } from "@/lib/format";

interface SummaryStatsProps {
  activities: Activity[];
}

export function SummaryStats({ activities }: SummaryStatsProps) {
  const totalRuns = activities.length;
  const totalDistance = activities.reduce((sum, a) => sum + a.distance_km, 0);
  const totalElevation = activities.reduce(
    (sum, a) => sum + (a.elevation_gain_m ?? 0),
    0
  );

  const paceValues = activities
    .map((a) => a.avg_pace_min_km)
    .filter((p): p is number => p != null && p > 0);
  const avgPace =
    paceValues.length > 0
      ? paceValues.reduce((sum, p) => sum + p, 0) / paceValues.length
      : null;

  const hrValues = activities
    .map((a) => a.avg_hr)
    .filter((hr): hr is number => hr != null);
  const avgHr =
    hrValues.length > 0
      ? Math.round(hrValues.reduce((sum, hr) => sum + hr, 0) / hrValues.length)
      : null;

  const stats = [
    { label: "Total Runs", value: String(totalRuns) },
    { label: "Total Distance", value: `${totalDistance.toFixed(1)} km` },
    { label: "Avg Pace", value: avgPace ? `${formatPace(avgPace)} /km` : "--" },
    { label: "Avg HR", value: avgHr ? `${avgHr} bpm` : "--" },
    { label: "Total Elevation", value: `${Math.round(totalElevation)} m` },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-[#44403c] bg-[#292524] px-3 py-2"
        >
          <p className="text-xs uppercase tracking-wider text-[#a8a29e]">
            {s.label}
          </p>
          <p className="text-sm font-semibold tabular-nums text-[#e7e5e4]">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
