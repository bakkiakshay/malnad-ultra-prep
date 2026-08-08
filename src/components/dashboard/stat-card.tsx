"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  highlight?: boolean;
  hint?: string;
}

export function StatCard({ label, value, unit, sub, highlight, hint }: StatCardProps) {
  const [showHint, setShowHint] = useState(false);

  return (
    <Card
      className={`relative transition-colors ${highlight ? "border-[var(--gold)]/30" : ""} ${hint ? "cursor-help" : ""}`}
      onMouseEnter={() => hint && setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-heading">
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
        {showHint && hint && (
          <div
            className="absolute left-0 right-0 bottom-full mb-2 z-10 rounded-md px-3 py-2 text-xs leading-relaxed shadow-lg"
            style={{ background: "#1c1917", border: "1px solid #fbbf24", color: "#e7e5e4" }}
          >
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
