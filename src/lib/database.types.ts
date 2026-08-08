export interface Database {
  public: {
    Tables: {
      activities: {
        Row: Activity;
        Insert: Activity;
        Update: Partial<Activity>;
      };
      commentary: {
        Row: Commentary;
        Insert: Omit<Commentary, "id" | "created_at" | "updated_at">;
        Update: Partial<Commentary>;
      };
      wellness: {
        Row: Wellness;
        Insert: Wellness;
        Update: Partial<Wellness>;
      };
      shoes: {
        Row: Shoe;
        Insert: Omit<Shoe, "id" | "created_at">;
        Update: Partial<Shoe>;
      };
    };
  };
}

export interface Activity {
  id: string;
  activity_date: string;
  name: string;
  distance_km: number;
  duration_sec: number;
  avg_pace_min_km: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_cadence: number | null;
  avg_stride_m: number | null;
  avg_gct_ms: number | null;
  avg_vert_osc_cm: number | null;
  elevation_gain_m: number | null;
  avg_temp_c: number | null;
  gap_min_km: number | null;
  polarization: number | null;
  hrr: number | null;
  calories: number | null;
  training_load: number | null;
  hr_zone_times: number[] | null;
  compliance: number | null;
  synced_at: string;
  raw_json: Record<string, unknown> | null;
}

export interface Commentary {
  id: string;
  activity_id: string;
  feel_rating: number | null;
  shoes: string | null;
  nutrition: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Wellness {
  date: string;
  resting_hr: number | null;
  sleep_sec: number | null;
  ctl: number | null;
  atl: number | null;
  ramp_rate: number | null;
  hrv_rmssd: number | null;
  hrv_baseline: number | null;
  sleep_score: number | null;
  sleep_deep_pct: number | null;
  sleep_light_pct: number | null;
  sleep_rem_pct: number | null;
  steps: number | null;
  stress_avg: number | null;
  recovery_pct: number | null;
  synced_at: string;
}

export interface Shoe {
  id: string;
  name: string;
  active: boolean;
  max_km: number | null;
  created_at: string;
}
