-- Akshay's Malnad Ultra Prep — Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Activities: cached from Intervals.icu
create table if not exists activities (
  id text primary key,
  activity_date date not null,
  name text not null default '',
  distance_km numeric not null default 0,
  duration_sec integer not null default 0,
  avg_pace_min_km numeric,
  avg_hr integer,
  max_hr integer,
  avg_cadence numeric,
  avg_stride_m numeric,
  avg_gct_ms numeric,
  avg_vert_osc_cm numeric,
  elevation_gain_m numeric,
  avg_temp_c numeric,
  gap_min_km numeric,
  polarization numeric,
  hrr numeric,
  calories integer,
  training_load numeric,
  hr_zone_times jsonb,
  compliance numeric,
  synced_at timestamptz not null default now(),
  raw_json jsonb
);

-- Commentary: user-entered per run
create table if not exists commentary (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references activities(id) on delete cascade,
  feel_rating integer check (feel_rating between 1 and 10),
  shoes text,
  nutrition text,
  notes text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id)
);

-- Wellness: merged daily data from Intervals.icu + COROS MCP
create table if not exists wellness (
  date date primary key,
  resting_hr integer,
  sleep_sec integer,
  ctl numeric,
  atl numeric,
  ramp_rate numeric,
  hrv_rmssd numeric,
  hrv_baseline numeric,
  sleep_score integer,
  sleep_deep_pct numeric,
  sleep_light_pct numeric,
  sleep_rem_pct numeric,
  steps integer,
  stress_avg integer,
  recovery_pct integer,
  synced_at timestamptz not null default now()
);

-- Shoes: inventory for dropdown + mileage tracking
create table if not exists shoes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  max_km integer default 800,
  created_at timestamptz not null default now()
);

-- Row Level Security: public read, authenticated write
alter table activities enable row level security;
alter table commentary enable row level security;
alter table wellness enable row level security;
alter table shoes enable row level security;

-- Read policies (anyone can view)
create policy "Public read activities" on activities for select using (true);
create policy "Public read commentary" on commentary for select using (true);
create policy "Public read wellness" on wellness for select using (true);
create policy "Public read shoes" on shoes for select using (true);

-- Write policies (only authenticated user can modify)
create policy "Auth insert activities" on activities for insert with check (auth.role() = 'authenticated');
create policy "Auth update activities" on activities for update using (auth.role() = 'authenticated');
create policy "Auth insert commentary" on commentary for insert with check (auth.role() = 'authenticated');
create policy "Auth update commentary" on commentary for update using (auth.role() = 'authenticated');
create policy "Auth delete commentary" on commentary for delete using (auth.role() = 'authenticated');
create policy "Auth insert wellness" on wellness for insert with check (auth.role() = 'authenticated');
create policy "Auth update wellness" on wellness for update using (auth.role() = 'authenticated');
create policy "Auth insert shoes" on shoes for insert with check (auth.role() = 'authenticated');
create policy "Auth update shoes" on shoes for update using (auth.role() = 'authenticated');
create policy "Auth delete shoes" on shoes for delete using (auth.role() = 'authenticated');

-- Indexes for common queries
create index if not exists idx_activities_date on activities(activity_date);
create index if not exists idx_commentary_activity on commentary(activity_id);
create index if not exists idx_wellness_date on wellness(date);
