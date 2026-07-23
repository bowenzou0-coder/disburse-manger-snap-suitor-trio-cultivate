-- Keystone sync v2 — run this once in your Supabase project's SQL Editor
-- Creates the user_slices table needed for per-slice sync (Anki-style
-- conflict resolution). Safe to run multiple times.

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
