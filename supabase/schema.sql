-- Akshay's Malnad Ultra Prep — Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Commentary: user-entered notes per run
create table if not exists commentary (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null,
  feel_rating integer check (feel_rating between 1 and 10),
  shoes text,
  nutrition text,
  notes text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id)
);

-- Enable RLS but allow anon access (personal dashboard)
alter table commentary enable row level security;
create policy "Allow all commentary" on commentary for all using (true) with check (true);

-- Index for lookups
create index if not exists idx_commentary_activity on commentary(activity_id);
