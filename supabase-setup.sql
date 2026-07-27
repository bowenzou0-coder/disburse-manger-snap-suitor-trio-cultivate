-- Keystone sync v3 — run this once in your Supabase project's SQL Editor
-- Creates the user_slices table and an atomic job queue for background sync.
-- Safe to run multiple times.

-- 1. Atomic Job Queue for background sync (prevents deadlocks, supports concurrent workers)
create table if not exists public.sync_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  job_type    text not null check (job_type in ('todoist_push', 'todoist_pull', 'full_sync')),
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_sync_jobs_user_status on public.sync_jobs(user_id, status);
create index if not exists idx_sync_jobs_created on public.sync_jobs(created_at) where status = 'pending';

alter table public.sync_jobs enable row level security;

do $$ begin
  create policy "Users can view own sync jobs" on public.sync_jobs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own sync jobs" on public.sync_jobs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 2. User Slices Table (Anki-style conflict resolution)
create table if not exists public.user_slices (
  user_id    uuid not null references auth.users(id) on delete cascade,
  slice      text not null check (slice in
    ('subjects','timetable','tasks','marks','sessions',
     'notes','goals','benchmarks','settings')),
  data       jsonb not null,
  rev        bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, slice)
);

alter table public.user_slices enable row level security;

do $$ begin
  create policy "Users can view own slices"
    on public.user_slices for select
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own slices"
    on public.user_slices for insert
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can update own slices"
    on public.user_slices for update
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
