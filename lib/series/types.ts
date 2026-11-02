// Shared between server and client. Contains NO answer keys.

export type Option = { key: string; text: string };

export type PublicQuestion = {
  n: number;                 // 1..23 within the test
  section: "CR" | "RC";      // Critical Reasoning or Reading Comprehension
  type: string;              // e.g. "Weaken", "Inference"
  stimulus: string | null;   // CR argument text
  passageId: string | null;  // RC passage key into `passages`
  stem: string;
  options: Option[];
};

export type Passage = { source: string | null; wordCount: number | null; text: string };

export type PublicTest = {
  id: number;
  name: string;
  durationMinutes: number;
  questions: PublicQuestion[];
  passages: Record<string, Passage>;
};

export type AttemptStatus = "in_progress" | "submitted";

export type Attempt = {
  id: string;
  test_id: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  answers: Record<string, string | null>;
  times_ms: Record<string, number>;
  flagged: number[];
  correct: number | null;
  total: number;
  time_used_sec: number | null;
  auto_submitted: boolean;
};

export type ReviewItem = {
  n: number;
  type: string;
  section: "CR" | "RC";
  picked: string | null;
  correct: string;
  ok: boolean;
  timeMs: number;
};

export type TestListItem = {
  id: number;
  name: string;
  durationMinutes: number;
  questionCount: number;
  attempts: number;
  bestScore: number | null;
  lastStatus: AttemptStatus | null;
};
