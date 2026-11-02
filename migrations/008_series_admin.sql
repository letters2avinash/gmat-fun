-- sazzag.gmat.fun — admin view and saved doubts chat
--
-- Run once in the Supabase SQL editor. Additive and idempotent.

-- Admins can see every student's attempts, analytics and chat history.
alter table series_access add column if not exists is_admin boolean not null default false;

-- Every doubts-chat message, saved so a teacher can review it later.
create table if not exists series_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references series_attempts(id) on delete cascade,
  email       text not null,              -- lower-case login email of the student
  n           int  not null,              -- question number within the test
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists series_chat_attempt_idx
  on series_chat_messages (attempt_id, created_at);

alter table series_chat_messages enable row level security;

-- Grant admin access to the teacher account (safe to re-run).
insert into series_access (email, series, is_admin)
values ('letters2avinash@gmail.com', 'sazzag', true)
on conflict (email) do update set is_admin = true;
