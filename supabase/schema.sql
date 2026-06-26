-- ───────────────────────────────────────────────────────────────────────────
--  Soundscape — Pomodoro history schema
--  Run this in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--  Safe to re-run: it uses IF NOT EXISTS and drops/recreates the policies.
-- ───────────────────────────────────────────────────────────────────────────

-- Per-user focus/break session history.
create table if not exists public.pomodoro_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  started_at       timestamptz,
  ended_at         timestamptz,
  duration_minutes int,
  session_type     text,             -- 'focus' | 'break'
  soundscape       text,             -- what was playing (optional)
  created_at       timestamptz not null default now()
);

-- Fast lookups of a user's history, newest first.
create index if not exists pomodoro_sessions_user_started_idx
  on public.pomodoro_sessions (user_id, started_at desc);

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- This is what makes the public anon key safe: every row is locked to its
-- owner. Without RLS enabled, the anon key could read everyone's data.
alter table public.pomodoro_sessions enable row level security;

-- Each policy restricts the action to rows where user_id = auth.uid(),
-- i.e. the currently signed-in user can only touch their OWN rows.
drop policy if exists "Users can read their own sessions"   on public.pomodoro_sessions;
drop policy if exists "Users can insert their own sessions" on public.pomodoro_sessions;
drop policy if exists "Users can update their own sessions" on public.pomodoro_sessions;
drop policy if exists "Users can delete their own sessions" on public.pomodoro_sessions;

create policy "Users can read their own sessions"
  on public.pomodoro_sessions
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.pomodoro_sessions
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.pomodoro_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.pomodoro_sessions
  for delete
  using (auth.uid() = user_id);
