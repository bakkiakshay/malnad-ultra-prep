import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}

export function StatCard({ label, value, unit, sub }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
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
