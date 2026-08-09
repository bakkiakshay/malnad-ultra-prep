"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TRAINING_PHASES } from "@/lib/config";
import { cn } from "@/lib/utils";

interface WeekRun {
  id: string;
  date: string;
  name: string;
  distance_km: number;
  duration_sec: number;
  avg_pace: number | null;
  avg_hr: number | null;
}

interface WeekData {
  week: number;
  distance: number;
  runs: WeekRun[];
  start: string;
  end: string;
  target: number;
}

interface PlanWeeksProps {
  weeklyData: WeekData[];
  currentWeek: number;
}

function formatPace(pace: number | null): string {
  if (pace == null) return "—";
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/** Get the day of week index (0=Mon, 6=Sun) from a date string */
function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  // JS getDay: 0=Sun, 1=Mon, ... 6=Sat -> convert to 0=Mon, 6=Sun
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Day-by-day grid showing run distribution */
function DayGrid({ runs }: { runs: WeekRun[] }) {
  // Build a map of day index -> total distance
  const dayDistances = new Map<number, number>();
  for (const run of runs) {
    const day = getDayOfWeek(run.date);
    dayDistances.set(day, (dayDistances.get(day) ?? 0) + run.distance_km);
  }

  return (
    <div className="flex items-center gap-1.5 mb-2">
      {DAY_LABELS.map((label, i) => {
        const dist = dayDistances.get(i) ?? 0;
        const hasRun = dist > 0;
        // Size: small <5km, medium 5-15km, large 15km+
        let size = 14;
        if (hasRun) {
          if (dist >= 15) size = 22;
          else if (dist >= 5) size = 18;
          else size = 14;
        }
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[8px] text-muted-foreground leading-none">
              {label}
            </span>
            <div
              className="rounded-sm flex-shrink-0 transition-all"
              style={{
                width: size,
                height: size,
                background: hasRun ? "#fbbf24" : "transparent",
                border: hasRun ? "none" : "1px solid #44403c",
                opacity: hasRun ? (dist >= 15 ? 1 : dist >= 5 ? 0.8 : 0.5) : 0.3,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Phase summary showing actual vs planned km */
function PhaseSummary({
  phase,
  weeklyData,
  currentWeek,
}: {
  phase: { weeks: [number, number]; name: string };
  weeklyData: WeekData[];
  currentWeek: number;
}) {
  // Only show for phases that have started
  if (currentWeek < phase.weeks[0]) return null;

  const phaseWeeks = weeklyData.filter(
    (w) => w.week >= phase.weeks[0] && w.week <= phase.weeks[1]
  );
  const totalTarget = phaseWeeks.reduce((s, w) => s + w.target, 0);
  const totalActual = phaseWeeks.reduce((s, w) => s + w.distance, 0);
  const pct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  let color = "#ef4444"; // red
  if (pct >= 90) color = "#22c55e"; // green
  else if (pct >= 70) color = "#fbbf24"; // gold

  return (
    <p className="mb-2 text-xs tabular-nums" style={{ color: "#a8a29e" }}>
      {totalActual.toFixed(0)} / {totalTarget} km{" "}
      <span style={{ color, fontWeight: 600 }}>({Math.round(pct)}%)</span>
    </p>
  );
}

export function PlanWeeks({ weeklyData, currentWeek }: PlanWeeksProps) {
  const [expanded, setExpanded] = useState<number | null>(currentWeek);

  function toggle(week: number) {
    setExpanded((prev) => (prev === week ? null : week));
  }

  return (
    <div className="space-y-2">
      {TRAINING_PHASES.map((phase) => (
        <div key={phase.name}>
          <h2
            className="mb-1 mt-4 text-sm font-semibold uppercase tracking-wider font-heading"
            style={{ color: "#fbbf24" }}
          >
            {phase.name}{" "}
            <span className="font-normal text-muted-foreground">
              (W{phase.weeks[0]}–{phase.weeks[1]}) &middot; {phase.focus}
            </span>
          </h2>
          <PhaseSummary
            phase={phase}
            weeklyData={weeklyData}
            currentWeek={currentWeek}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from(
              { length: phase.weeks[1] - phase.weeks[0] + 1 },
              (_, i) => phase.weeks[0] + i
            ).map((w) => {
              const data = weeklyData.find((d) => d.week === w);
              if (!data) return null;
              const isCurrent = w === currentWeek;
              const isPast = w < currentWeek;
              const isExpanded = expanded === w;
              const pct = data.target > 0 ? Math.min((data.distance / data.target) * 100, 100) : 0;

              return (
                <div
                  key={w}
                  className={cn(
                    "rounded-lg transition-all cursor-pointer",
                    !isPast && !isCurrent && "opacity-50",
                  )}
                  style={{
                    background: "#292524",
                    border: isCurrent
                      ? "2px solid #fbbf24"
                      : "1px solid #44403c",
                    boxShadow: isCurrent ? "0 0 0 2px rgba(251,191,36,0.2)" : undefined,
                  }}
                  onClick={() => toggle(w)}
                >
                  {/* Week header */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">Week {w}</span>
                          {isCurrent && (
                            <Badge
                              variant="default"
                              className="text-[10px] px-1.5 py-0"
                              style={{ background: "#fbbf24", color: "#1c1917" }}
                            >
                              Current
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {data.runs.length > 0 ? `${data.runs.length} runs` : ""}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(data.start)} – {formatDateShort(data.end)}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-lg font-bold tabular-nums">
                            {data.distance}
                            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                              / {data.target} km
                            </span>
                          </p>
                        </div>
                        <svg
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full" style={{ background: "#44403c" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct >= 90
                              ? "#22c55e"
                              : pct >= 50
                              ? "#fbbf24"
                              : isPast
                              ? "#ef4444"
                              : "#78716c",
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded runs */}
                  {isExpanded && (
                    <div
                      className="border-t px-3 pb-3 pt-2"
                      style={{ borderColor: "#44403c" }}
                    >
                      {/* Day-by-day grid */}
                      {data.runs.length > 0 && <DayGrid runs={data.runs} />}

                      {data.runs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">
                          {isPast
                            ? "No runs logged this week"
                            : "Runs will appear here as you log them"}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {data.runs.map((run) => (
                            <Link
                              key={run.id}
                              href={`/log/${run.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors hover:ring-1 hover:ring-[#fbbf24]/40"
                              style={{ background: "#1c1917" }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {formatDate(run.date)}
                                </span>
                                <span className="font-medium truncate">
                                  {run.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-muted-foreground whitespace-nowrap ml-2">
                                <span className="font-medium" style={{ color: "#fbbf24" }}>
                                  {run.distance_km.toFixed(1)} km
                                </span>
                                <span>{formatPace(run.avg_pace)} /km</span>
                                {run.avg_hr && <span>{run.avg_hr} bpm</span>}
                                <span>{formatDuration(run.duration_sec)}</span>
                              </div>
                            </Link>
                          ))}
                          {/* Week summary */}
                          <div className="flex justify-between pt-1 text-[10px] text-muted-foreground">
                            <span>
                              {pct >= 100
                                ? "Target hit!"
                                : pct >= 90
                                ? "Almost there"
                                : `${(data.target - data.distance).toFixed(1)} km remaining`}
                            </span>
                            <span className="tabular-nums">
                              {Math.round(pct)}% of target
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
