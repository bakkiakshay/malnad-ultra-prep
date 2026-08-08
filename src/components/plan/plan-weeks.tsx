"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TRAINING_PHASES } from "@/lib/config";
import { cn } from "@/lib/utils";

interface WeekRun {
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
            className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wider font-heading"
            style={{ color: "#fbbf24" }}
          >
            {phase.name}{" "}
            <span className="font-normal text-muted-foreground">
              (W{phase.weeks[0]}–{phase.weeks[1]}) &middot; {phase.focus}
            </span>
          </h2>
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
                      {data.runs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">
                          {isPast
                            ? "No runs logged this week"
                            : "Runs will appear here as you log them"}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {data.runs.map((run, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs"
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
                            </div>
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
