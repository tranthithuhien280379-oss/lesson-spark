-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Stores each signed-in user's game state (xp, level, streak, badges, daily
-- goal/progress) as a JSON blob, keyed by their auth user id. Kept as JSONB
-- (rather than one column per field) so it stays in sync with the shape of
-- `GameState` in src/lib/gamification.ts without needing a migration every
-- time that shape changes.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Users can view their own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.progress for update
  using (auth.uid() = user_id);
