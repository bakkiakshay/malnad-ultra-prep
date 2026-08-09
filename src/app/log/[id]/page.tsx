import { fetchActivity } from "@/lib/intervals";
import { formatPace, formatDuration, formatDistance, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommentaryForm } from "./commentary-form";
import { HrZoneChart } from "./hr-zone-chart";

export default async function RunDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let activity;
  let error: string | null = null;

  try {
    const raw = await fetchActivity(id);
    activity = {
      id: String(raw.id),
      name: raw.name ?? "",
      activity_date: raw.start_date_local?.slice(0, 10) ?? "",
      distance_km: raw.distance ? +(raw.distance / 1000).toFixed(2) : 0,
      duration_sec: raw.moving_time ?? raw.elapsed_time ?? 0,
      avg_pace_min_km:
        raw.average_speed && raw.average_speed > 0
          ? +(1000 / raw.average_speed / 60).toFixed(2)
          : null,
      avg_hr: raw.average_heartrate ?? null,
      max_hr: raw.max_heartrate ?? null,
      avg_cadence: raw.average_cadence ?? null,
      avg_stride_m: raw.average_stride ?? null,
      avg_gct_ms: raw.average_stance_time ?? null,
      avg_vert_osc_cm: raw.average_vertical_oscillation ?? null,
      elevation_gain_m: raw.total_elevation_gain ?? null,
      avg_temp_c: raw.average_temp ?? null,
      gap_min_km:
        raw.gap && raw.gap > 0 ? +(1000 / raw.gap / 60).toFixed(2) : null,
      polarization: raw.polarization_index ?? null,
      hrr:
        raw.icu_hrr != null
          ? typeof raw.icu_hrr === "object"
            ? (raw.icu_hrr as { hrr?: number }).hrr ?? null
            : raw.icu_hrr
          : null,
      calories: raw.calories ?? null,
      training_load: raw.icu_training_load ?? null,
      hr_zone_times: (raw.icu_hr_zone_times as number[] | null) ?? null,
    };
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch activity";
  }

  if (error || !activity) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error ?? "Activity not found"}
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Distance", value: `${formatDistance(activity.distance_km)} km` },
    { label: "Duration", value: formatDuration(activity.duration_sec) },
    { label: "Pace", value: `${formatPace(activity.avg_pace_min_km)} /km` },
    { label: "GAP", value: activity.gap_min_km ? `${formatPace(activity.gap_min_km)} /km` : "--" },
    { label: "Avg HR", value: activity.avg_hr ? `${activity.avg_hr} bpm` : "--" },
    { label: "Max HR", value: activity.max_hr ? `${activity.max_hr} bpm` : "--" },
    { label: "Cadence", value: activity.avg_cadence ? `${Math.round(activity.avg_cadence * 2)} spm` : "--" },
    { label: "Stride", value: activity.avg_stride_m ? `${(activity.avg_stride_m * 100).toFixed(0)} cm` : "--" },
    { label: "GCT", value: activity.avg_gct_ms ? `${Math.round(activity.avg_gct_ms)} ms` : "--" },
    { label: "Vert Osc", value: activity.avg_vert_osc_cm ? `${activity.avg_vert_osc_cm.toFixed(1)} cm` : "--" },
    { label: "Elevation", value: activity.elevation_gain_m != null ? `${Math.round(activity.elevation_gain_m)} m` : "--" },
    { label: "Temperature", value: activity.avg_temp_c != null ? `${Math.round(activity.avg_temp_c)}C` : "--" },
    { label: "HR Recovery", value: activity.hrr != null ? `${activity.hrr.toFixed(0)} bpm` : "--" },
    { label: "Calories", value: activity.calories != null ? `${activity.calories} kcal` : "--" },
    { label: "Training Load", value: activity.training_load != null ? activity.training_load.toFixed(0) : "--" },
    { label: "Polarization", value: activity.polarization != null ? activity.polarization.toFixed(2) : "--" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {formatDate(activity.activity_date)}
        </p>
        <h1 className="text-xl font-bold tracking-tight text-[#fbbf24] font-heading">
          {activity.name}
        </h1>
        <div className="mt-2 flex gap-2">
          <Badge variant="secondary">
            {formatDistance(activity.distance_km)} km
          </Badge>
          <Badge variant="secondary">
            {formatPace(activity.avg_pace_min_km)} /km
          </Badge>
          {activity.avg_hr && (
            <Badge variant="secondary">{activity.avg_hr} bpm</Badge>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium font-heading text-[#fbbf24]">
            Run Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
                <p className="text-sm font-medium tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* HR Zone Time chart */}
      {activity.hr_zone_times && activity.hr_zone_times.length > 0 && (
        <HrZoneChart zoneTimes={activity.hr_zone_times} />
      )}

      {/* Commentary form */}
      <CommentaryForm activityId={activity.id} />
    </div>
  );
}
