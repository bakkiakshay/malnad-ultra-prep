import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ZONE_CONFIG = [
  { label: "Z1", color: "#3b82f6" },
  { label: "Z2", color: "#22c55e" },
  { label: "Z3", color: "#eab308" },
  { label: "Z4", color: "#f97316" },
  { label: "Z5a", color: "#ef4444" },
  { label: "Z5b", color: "#dc2626" },
  { label: "Z5c", color: "#b91c1c" },
];

function formatZoneTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface HrZoneChartProps {
  zoneTimes: number[];
}

export function HrZoneChart({ zoneTimes }: HrZoneChartProps) {
  const maxTime = Math.max(...zoneTimes, 1);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium font-heading text-[#fbbf24]">
          HR Zone Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {zoneTimes.map((time, i) => {
            const zone = ZONE_CONFIG[i] ?? {
              label: `Z${i + 1}`,
              color: "#a8a29e",
            };
            const pct = maxTime > 0 ? (time / maxTime) * 100 : 0;

            return (
              <div key={zone.label} className="flex items-center gap-3">
                <span
                  className="w-8 text-xs font-medium tabular-nums"
                  style={{ color: zone.color }}
                >
                  {zone.label}
                </span>
                <div className="flex-1 h-5 rounded bg-[#1c1917] overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${Math.max(pct, time > 0 ? 2 : 0)}%`,
                      backgroundColor: zone.color,
                    }}
                  />
                </div>
                <span className="w-16 text-right text-xs tabular-nums text-[#a8a29e]">
                  {time > 0 ? formatZoneTime(time) : "--"}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
