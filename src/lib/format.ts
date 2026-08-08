export function formatPace(minPerKm: number | null): string {
  if (minPerKm == null || minPerKm <= 0) return "—";
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDistance(km: number): string {
  if (km >= 10) return km.toFixed(1);
  return km.toFixed(2);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}
