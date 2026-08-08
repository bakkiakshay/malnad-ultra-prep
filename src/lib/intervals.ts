const BASE_URL = `https://intervals.icu/api/v1/athlete/${process.env.INTERVALS_ATHLETE_ID}`;

function authHeaders(): HeadersInit {
  const key = process.env.INTERVALS_API_KEY!;
  const encoded = Buffer.from(`API_KEY:${key}`).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    Accept: "application/json",
  };
}

export interface IntervalsActivity {
  id: string;
  start_date_local: string;
  type: string;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  average_heartrate: number;
  max_heartrate: number;
  average_cadence: number | null;
  average_stride: number | null;
  average_stance_time: number | null;
  average_vertical_oscillation: number | null;
  total_elevation_gain: number | null;
  average_temp: number | null;
  gap: number | null;
  polarization_index: number | null;
  icu_hrr: number | null;
  calories: number | null;
  icu_training_load: number | null;
  icu_hr_zone_times: number[] | null;
  compliance: number | null;
  average_speed: number | null;
}

export async function fetchActivities(
  oldest: string,
  newest: string
): Promise<IntervalsActivity[]> {
  const url = `${BASE_URL}/activities?oldest=${oldest}&newest=${newest}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Intervals.icu activities error: ${res.status} ${res.statusText}`);
  }
  const data: IntervalsActivity[] = await res.json();
  return data.filter((a) => a.type === "Run");
}

export async function fetchActivity(id: string): Promise<IntervalsActivity> {
  const url = `${BASE_URL}/activities/${id}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Intervals.icu activity error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // API may return array with single item or a plain object
  return Array.isArray(data) ? data[0] : data;
}

export interface IntervalsWellness {
  id: string;
  ctl: number | null;
  atl: number | null;
  rampRate: number | null;
  restingHR: number | null;
  sleepSecs: number | null;
}

export async function fetchWellness(
  oldest: string,
  newest: string
): Promise<IntervalsWellness[]> {
  const url = `${BASE_URL}/wellness?oldest=${oldest}&newest=${newest}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`Intervals.icu wellness error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
