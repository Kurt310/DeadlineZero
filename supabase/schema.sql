-- DeadlineZero schema — run once in the Supabase SQL Editor.
-- Mirrors the Task model used by frontend/ (Flutter) and hackathon-mobile/ (Expo).

create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  subject text not null default 'General',
  description text,
  due_at timestamptz not null,
  estimated_minutes integer not null default 60,
  importance integer not null default 3 check (importance between 1 and 5),
  difficulty integer not null default 3 check (difficulty between 1 and 5),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx
  on public.tasks (user_id, due_at);

alter table public.tasks enable row level security;

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks" on public.tasks
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
