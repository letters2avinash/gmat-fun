-- Fix: the admin RLS policies added in 005 checked admin status with
-- "exists (select 1 from profiles where id = auth.uid() and is_admin = true)"
-- directly inside a policy ON the profiles table itself. Postgres detects
-- that as infinite recursion (ERROR 42P17) and refuses ANY select against
-- profiles for authenticated users — which silently broke the dashboard
-- profile fetch (and, via the same pattern on test_attempts/di_attempts/etc,
-- broke reading a user's own attempt history too). No data was lost; the
-- reads were just failing.
--
-- Fix: move the admin check into a SECURITY DEFINER function. Such a
-- function runs with the privileges of its owner (bypassing RLS on the
-- inner lookup), so it can safely check is_admin without re-triggering
-- the calling table's own row security.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- Replace every policy that used the recursive exists(...) pattern with
-- one that calls is_admin() instead. Same access semantics, no recursion.

drop policy if exists "admin can write sections" on lms_sections;
create policy "admin can write sections" on lms_sections for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can write topics" on lms_topics;
create policy "admin can write topics" on lms_topics for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can write chapters" on lms_chapters;
create policy "admin can write chapters" on lms_chapters for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can write resources" on lms_resources;
create policy "admin can write resources" on lms_resources for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can write posts" on blog_posts;
create policy "admin can write posts" on blog_posts for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can moderate threads" on forum_threads;
create policy "admin can moderate threads" on forum_threads for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can moderate posts" on forum_posts;
create policy "admin can moderate posts" on forum_posts for all
  using (is_admin()) with check (is_admin());

drop policy if exists "admin can read all profiles" on profiles;
create policy "admin can read all profiles" on profiles for select
  using (id = auth.uid() or is_admin());

drop policy if exists "admin can read all test attempts" on test_attempts;
create policy "admin can read all test attempts" on test_attempts for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists "admin can read all attempt responses" on attempt_responses;
create policy "admin can read all attempt responses" on attempt_responses for select
  using (
    exists (select 1 from test_attempts a where a.id = attempt_responses.attempt_id and a.user_id = auth.uid())
    or is_admin()
  );

drop policy if exists "admin can read all di attempts" on di_attempts;
create policy "admin can read all di attempts" on di_attempts for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists "admin can read all di attempt responses" on di_attempt_responses;
create policy "admin can read all di attempt responses" on di_attempt_responses for select
  using (
    exists (select 1 from di_attempts a where a.id = di_attempt_responses.attempt_id and a.user_id = auth.uid())
    or is_admin()
  );
