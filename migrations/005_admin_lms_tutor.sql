-- Admin flag, DB-backed LMS (sections -> topics -> chapters -> resources),
-- and the Avinash AI tutor's persistent chat memory.
-- Additive & idempotent — safe to run against the live database.

-- ---------- Admin ----------
alter table profiles add column if not exists is_admin boolean not null default false;

-- Grant admin to the site owner's account by email (auth.users holds email).
update profiles set is_admin = true
where id = (select id from auth.users where email = 'letters2avinash@gmail.com');

-- ---------- LMS: sections -> topics -> chapters -> resources ----------
create table if not exists lms_sections (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  title text not null,
  description text not null default '',
  practice_href text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lms_topics (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid not null references lms_sections(id) on delete cascade,
  title text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lms_chapters (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references lms_topics(id) on delete cascade,
  title text not null,
  summary text not null default '',
  content text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lms_resources (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references lms_chapters(id) on delete cascade,
  kind text not null check (kind in ('recording', 'presentation', 'worksheet', 'link')),
  title text not null,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table lms_sections enable row level security;
alter table lms_topics enable row level security;
alter table lms_chapters enable row level security;
alter table lms_resources enable row level security;

drop policy if exists "public can read sections" on lms_sections;
create policy "public can read sections" on lms_sections for select using (true);
drop policy if exists "admin can write sections" on lms_sections;
create policy "admin can write sections" on lms_sections for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "public can read topics" on lms_topics;
create policy "public can read topics" on lms_topics for select using (true);
drop policy if exists "admin can write topics" on lms_topics;
create policy "admin can write topics" on lms_topics for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "public can read chapters" on lms_chapters;
create policy "public can read chapters" on lms_chapters for select using (true);
drop policy if exists "admin can write chapters" on lms_chapters;
create policy "admin can write chapters" on lms_chapters for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "public can read resources" on lms_resources;
create policy "public can read resources" on lms_resources for select using (true);
drop policy if exists "admin can write resources" on lms_resources;
create policy "admin can write resources" on lms_resources for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Admin also needs to manage blog + forum content (create/edit/delete posts,
-- moderate threads/posts) beyond what the original public-read-only /
-- own-content policies allow.
drop policy if exists "admin can write posts" on blog_posts;
create policy "admin can write posts" on blog_posts for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "admin can moderate threads" on forum_threads;
create policy "admin can moderate threads" on forum_threads for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "admin can moderate posts" on forum_posts;
create policy "admin can moderate posts" on forum_posts for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "admin can read all profiles" on profiles;
create policy "admin can read all profiles" on profiles for select
  using (id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- ---------- Avinash AI tutor: persistent per-user chat memory ----------
create table if not exists tutor_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  question_context jsonb,
  created_at timestamptz not null default now()
);

alter table tutor_messages enable row level security;

drop policy if exists "own tutor messages" on tutor_messages;
create policy "own tutor messages" on tutor_messages for select
  using (auth.uid() = user_id);

drop policy if exists "insert own tutor messages" on tutor_messages;
create policy "insert own tutor messages" on tutor_messages for insert
  with check (auth.uid() = user_id);

create index if not exists tutor_messages_user_created_idx
  on tutor_messages (user_id, created_at);

-- ---------- Seed LMS content from the existing static curriculum ----------
insert into lms_sections (key, title, description, practice_href, sort_order) values
  ('quant', 'Quant', 'Problem Solving and Data Sufficiency — arithmetic, algebra, and word-problem reasoning.', '/practice/quant', 1),
  ('verbal', 'Verbal', 'Critical Reasoning and Reading Comprehension — argument structure and evidence-based reading.', '/practice/verbal', 2),
  ('data_insights', 'Data Insights', 'Multi-Source Reasoning, Table Analysis, Two-Part Analysis, and Graphics Interpretation.', '/practice/data-insights', 3)
on conflict (key) do nothing;

-- One topic per section for now (from the original static curriculum),
-- each holding the chapters that used to live in lib/curriculum.ts.
insert into lms_topics (section_id, title, description, sort_order)
select id, 'Core Skills', 'Foundational lessons for this section.', 1 from lms_sections where key = 'quant'
union all
select id, 'Core Skills', 'Foundational lessons for this section.', 1 from lms_sections where key = 'verbal'
union all
select id, 'Core Skills', 'Foundational lessons for this section.', 1 from lms_sections where key = 'data_insights'
on conflict do nothing;

insert into lms_chapters (topic_id, title, summary, content, sort_order)
select t.id, v.title, v.summary, v.content, v.sort_order
from lms_topics t
join lms_sections s on s.id = t.section_id and t.title = 'Core Skills'
join (values
  ('quant', 'Data Sufficiency: the four-step approach', 'Why DS is a logic test wearing a math costume, and how to attack it consistently.',
    E'Data Sufficiency questions don''t ask you to solve — they ask whether you could solve, given each statement. That distinction is the entire game: test-takers who instinctively start calculating usually do unnecessary work and run out of time.\n\nA reliable four-step approach: (1) simplify the question stem into its simplest logical form before looking at the statements, (2) evaluate Statement (1) alone, (3) evaluate Statement (2) alone — forgetting everything you learned from Statement (1), and (4) only if needed, combine them.\n\nThe most common error is ''statement carryover'' — letting information from Statement (1) leak into your evaluation of Statement (2). Cover Statement (1) with your hand (physically, if it helps) while judging Statement (2) in isolation.\n\nPractice recognizing sufficiency without fully solving: if a statement pins a variable to exactly one value (even if you don''t compute it), that''s sufficient. You rarely need the actual number — you need to know a unique answer exists.', 1),
  ('quant', 'Translating word problems into algebra', 'A repeatable process for turning dense word problems into equations you can actually solve.',
    E'Most Quant word problems are not hard once translated correctly — they''re hard because the translation step is rushed. Read the entire problem once before writing anything, identifying what is being asked before you define variables.\n\nAssign variables to the actual unknowns the question asks about, not to intermediate quantities mentioned in the setup. This keeps your final equation directly answerable instead of requiring an extra conversion step at the end.\n\nWatch for ''of'' (multiplication), ''is''/''was'' (equals), and ratio language (''for every,'' ''per'') — these are the highest-value words to translate literally and immediately, since misreading them is the single most common source of algebra errors on this test.\n\nWhen a problem feels unsolvable algebraically under time pressure, backsolving from the answer choices is a legitimate, fast strategy — start from the middle answer choice and adjust up or down based on whether it''s too large or too small.', 2),
  ('quant', 'Number properties: the shortcuts worth memorizing', 'Even/odd, divisibility, and remainders — the recurring building blocks of quant questions.',
    E'A large share of quant questions test number properties indirectly, inside a word problem or DS statement. Knowing a handful of rules cold — even times even = even, odd times odd = odd, the sum of two odds is even, and so on — turns a multi-step algebra problem into a 10-second logic check.\n\nDivisibility and remainders show up constantly in ''what is the smallest/largest value of...'' questions. If a number is divisible by both 4 and 6, it must be divisible by their least common multiple (12) — not merely their product (24).\n\nPrime factorization is the single highest-leverage tool for LCM/GCD, divisor-counting, and ''is this a perfect square'' questions. Practice breaking numbers into primes quickly rather than relying on trial and error.', 3),
  ('verbal', 'Breaking down a Critical Reasoning argument', 'Separate premise, assumption, and conclusion before you ever look at the answer choices.',
    E'Every Critical Reasoning argument has a conclusion (the author''s claim), premises (the stated evidence), and — critically — an unstated assumption bridging the two. Most wrong answers are wrong because they attack the premises, which the question never asked you to do.\n\nBefore reading the answer choices, state the assumption in your own words. If asked to weaken the argument, the correct answer will attack that specific assumption — not just introduce vaguely related negative information.\n\nFor Strengthen and Weaken questions, correct answers usually address the gap between premise and conclusion, not the premise or conclusion individually. If an answer choice would matter even in a world where the assumption were true, it''s very likely a trap.\n\nAssumption questions have a useful reverse-check: negate the answer choice you think is correct. If the negation destroys the argument, you''ve found the assumption; if the argument still stands, that answer was not actually necessary.', 1),
  ('verbal', 'Reading Comprehension without re-reading everything', 'How to read a dense passage once, efficiently, and still answer detail questions accurately.',
    E'The instinct to re-read the entire passage for every question is what kills RC pacing. Instead, read actively the first time: track the author''s main point, the structure (does paragraph 2 support or complicate paragraph 1?), and any obvious shifts in tone or argument.\n\nDetail questions are open-book — you''re allowed, and expected, to go back and verify the exact wording rather than trusting memory. The failure mode isn''t forgetting details; it''s not noticing when an answer choice subtly overstates or narrows what the passage actually said.\n\nInference questions require the least new information and the most caution: correct answers are almost always a modest, defensible restatement of something implied by the text — not a bold new claim, however ''reasonable'' it sounds.', 2),
  ('data_insights', 'Multi-Source Reasoning: reading across tabs', 'The skill this question type actually tests is synthesis, not speed-reading.',
    E'Multi-Source Reasoning presents information split across two or three tabs (often an email, a table, and a memo). The test is deliberately checking whether you can hold information from one tab in mind while reading another — don''t try to memorize everything up front.\n\nRead each tab once for its role (what kind of information does this tab contain?) before diving into any single question. Then, for each question, identify which tab(s) it actually requires — many wrong answers are correct-sounding statements that rely on a tab the question doesn''t reference.\n\nMSR frequently includes multiple true/false sub-questions per prompt, each independently scored. Treat each one as its own Data Sufficiency-style check rather than assuming a pattern across them.', 1),
  ('data_insights', 'Table Analysis: sort before you scan', 'Using the built-in sort function to avoid manual scanning under time pressure.',
    E'Table Analysis questions include a sortable table — use it. If a question asks about the highest, lowest, or Nth-ranked value in a column, sort by that column immediately rather than scanning visually, which is slower and more error-prone.\n\nWatch for questions that require a computed value not directly in the table (a difference, a ratio, a percentage change) — these often require sorting by one column, computing manually for a subset of rows, and are a common source of careless arithmetic errors under time pressure.', 2),
  ('data_insights', 'Graphics Interpretation: reading the axes first', 'The fastest way to avoid the #1 error type in this question format.',
    E'Before answering, identify exactly what each axis represents and its units — a large share of errors come from misreading a percentage axis as an absolute-count axis, or vice versa.\n\nGraphics Interpretation answers are filled in via dropdown, which means the answer set is fixed and often includes ''trap'' values corresponding to a common misread (e.g., reading the wrong series in a multi-line chart). Double-check which series or category a value belongs to before selecting.', 3)
) as v(section_key, title, summary, content, sort_order) on v.section_key = s.key
on conflict do nothing;

-- ---------- Admin: full data access across all users' attempts ----------
drop policy if exists "admin can read all test attempts" on test_attempts;
create policy "admin can read all test attempts" on test_attempts for select
  using (user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "admin can read all attempt responses" on attempt_responses;
create policy "admin can read all attempt responses" on attempt_responses for select
  using (
    exists (select 1 from test_attempts a where a.id = attempt_responses.attempt_id and a.user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "admin can read all di attempts" on di_attempts;
create policy "admin can read all di attempts" on di_attempts for select
  using (user_id = auth.uid() or exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "admin can read all di attempt responses" on di_attempt_responses;
create policy "admin can read all di attempt responses" on di_attempt_responses for select
  using (
    exists (select 1 from di_attempts a where a.id = di_attempt_responses.attempt_id and a.user_id = auth.uid())
    or exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
