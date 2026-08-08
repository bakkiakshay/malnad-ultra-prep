export const RACE = {
  name: "Malnad Ultra 100K",
  date: "2026-11-28",
  distance_km: 100,
  elevation_m: 3410,
  terrain: "Western Ghats trail",
} as const;

export const PLAN_START = "2026-08-03";
export const PLAN_WEEKS = 17;

export const LTHR = 165;
export const HR_ZONES = [134, 147, 155, 165, 170, 175, 192] as const;
export const Z2_RANGE = { low: 135, high: 147 } as const;

export const TRAINING_PHASES: {
  weeks: [number, number];
  name: string;
  focus: string;
}[] = [
  { weeks: [1, 4], name: "Aerobic Rebuild", focus: "Easy volume, Z2 base" },
  { weeks: [5, 8], name: "Base Building", focus: "Longer runs, tempo work" },
  { weeks: [9, 12], name: "Race-Specific", focus: "Hills, back-to-back longs" },
  { weeks: [13, 14], name: "Peak", focus: "Highest volume weeks" },
  { weeks: [15, 16], name: "Taper", focus: "Volume reduction, sharpening" },
  { weeks: [17, 17], name: "Race Week", focus: "Rest + race day" },
];

export function getCurrentWeek(): number {
  const start = new Date(PLAN_START);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(Math.ceil((diffDays + 1) / 7), 1), PLAN_WEEKS);
}

export function getCurrentPhase(): (typeof TRAINING_PHASES)[number] | undefined {
  const week = getCurrentWeek();
  return TRAINING_PHASES.find(
    (p) => week >= p.weeks[0] && week <= p.weeks[1]
  );
}

export function getDaysToRace(): number {
  const race = new Date(RACE.date);
  const now = new Date();
  return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export const WEEKLY_TARGETS_KM: number[] = [
  25, 30, 35, 25,
  40, 45, 50, 35,
  55, 60, 65, 45,
  70, 75,
  50, 35,
  15,
];
