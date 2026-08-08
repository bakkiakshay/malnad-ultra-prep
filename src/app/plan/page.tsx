import { fetchActivities } from "@/lib/intervals";
import {
  PLAN_START,
  PLAN_WEEKS,
  TRAINING_PHASES,
  getCurrentWeek,
  RACE,
} from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const revalidate = 3600;

function getWeekDates(weekNum: number): { start: string; end: string } {
  const planStart = new Date(PLAN_START);
  const weekStart = new Date(planStart);
  weekStart.setDate(planStart.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10),
  };
}

export default async function PlanPage() {
  const today = new Date().toISOString().slice(0, 10);
  const currentWeek = getCurrentWeek();

  let weeklyData: { week: number; distance: number; runs: number }[] = [];

  try {
    const raw = await fetchActivities(PLAN_START, today);
    const activities = raw.map((a) => ({
      date: a.start_date_local?.slice(0, 10) ?? "",
      distance_km: a.distance ? a.distance / 1000 : 0,
    }));

    for (let w = 1; w <= PLAN_WEEKS; w++) {
      const { start, end } = getWeekDates(w);
      const weekRuns = activities.filter(
        (a) => a.date >= start && a.date <= end
      );
      weeklyData.push({
        week: w,
        distance: +weekRuns
          .reduce((sum, a) => sum + a.distance_km, 0)
          .toFixed(1),
        runs: weekRuns.length,
      });
    }
  } catch {
    for (let w = 1; w <= PLAN_WEEKS; w++) {
      weeklyData.push({ week: w, distance: 0, runs: 0 });
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Training Plan</h1>
        <p className="text-sm text-muted-foreground">
          17 weeks &middot; {PLAN_START} to {RACE.date}
        </p>
      </div>

      <div className="space-y-2">
        {TRAINING_PHASES.map((phase) => (
          <div key={phase.name}>
            <h2 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {phase.name}{" "}
              <span className="font-normal">
                (W{phase.weeks[0]}–{phase.weeks[1]}) &middot; {phase.focus}
              </span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from(
                { length: phase.weeks[1] - phase.weeks[0] + 1 },
                (_, i) => phase.weeks[0] + i
              ).map((w) => {
                const data = weeklyData.find((d) => d.week === w);
                const isCurrent = w === currentWeek;
                const isPast = w < currentWeek;
                const { start, end } = getWeekDates(w);

                return (
                  <Card
                    key={w}
                    className={cn(
                      isCurrent && "ring-2 ring-primary",
                      !isPast && !isCurrent && "opacity-60"
                    )}
                  >
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            Week {w}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(start + "T00:00:00").toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          –{" "}
                          {new Date(end + "T00:00:00").toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums">
                          {data?.distance ?? 0}
                          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                            km
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data?.runs ?? 0} runs
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
