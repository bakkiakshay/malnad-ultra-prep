import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  highlight?: boolean;
}

export function StatCard({ label, value, unit, sub, highlight }: StatCardProps) {
  return (
    <Card className={highlight ? "border-[var(--gold)]/30" : ""}>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums" style={highlight ? { color: "#fbbf24" } : undefined}>
          {value}
          {unit && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
