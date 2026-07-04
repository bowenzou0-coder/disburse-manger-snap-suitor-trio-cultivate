-- Keystone sync v2 — run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run)
--
-- This replaces the old single-blob "user_state" table with one row per
-- (user, slice) — subjects/timetable/tasks/marks/sessions/notes/goals/
-- benchmarks/settings each sync independently, so an edit in one part of the
-- app can never silently overwrite an unrelated edit made elsewhere. Your
-- existing data in "user_state" is migrated in automatically below and is
-- NOT deleted — it's left in place as a backup.

create table public.user_slices (
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

create policy "Users can view own slices"
  on public.user_slices for select
  using (auth.uid() = user_id);

create policy "Users can insert own slices"
  on public.user_slices for insert
  with check (auth.uid() = user_id);

create policy "Users can update own slices"
  on public.user_slices for update
  using (auth.uid() = user_id);

-- One-time migration of any existing data from the old "user_state" table.
-- Safe to run even if user_state is empty or doesn't have a row for everyone.
insert into public.user_slices (user_id, slice, data, updated_at)
select us.user_id, k.slice,
  case
    when k.slice in ('subjects','timetable','tasks','marks','sessions') then
      jsonb_build_object('items', coalesce(us.data->k.slice, '[]'::jsonb), 'graves', '[]'::jsonb)
    else
      jsonb_build_object('value', coalesce(us.data->k.slice, case when k.slice='notes' then '""'::jsonb else '{}'::jsonb end))
  end,
  us.updated_at
from public.user_state us
cross join (values ('subjects'),('timetable'),('tasks'),('marks'),('sessions'),
                   ('notes'),('goals'),('benchmarks'),('settings')) as k(slice)
on conflict (user_id, slice) do nothing;
