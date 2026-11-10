// Shared between server and client. Contains NO answer keys.

export type Option = { key: string; text: string };

export type PublicQuestion = {
  n: number;                 // 1..23 within the test
  section: "CR" | "RC" | "QA" | "DI"; // Critical Reasoning, Reading Comprehension, Quantitative Aptitude, or Data Insights
  type: string;              // e.g. "Weaken", "Inference"
  stimulus: string | null;   // CR argument text
  passageId: string | null;  // RC passage key into `passages`
  stem: string;
  options: Option[];
  image?: string | null;     // figure for quantitative questions (served from /public/series/qa)
  images?: string[];        // Data Insights figures (served from /public/series/di/images)
  statements?: Record<string, string>; // Data Insights: numbered statements (1), (2)
  spec?: DiSpec;             // Data Insights: how the player should draw multi-part answers
};

// Display-only description of a Data Insights question. Contains no answers.
export type DiSpec =
  | { kind: "ds" }
  | { kind: "mcq" }
  | { kind: "tpa"; rows: string[] }
  | { kind: "yesno"; rows: string[]; choices: string[] }
  | { kind: "rows"; rows: string[]; choices: string[] }
  | { kind: "dropdown"; groups: string[][] };

export function sectionLabel(s: "CR" | "RC" | "QA" | "DI"): string {
  if (s === "DI") return "Data Insights";
  return s === "CR" ? "Critical Reasoning" : s === "QA" ? "Quantitative Aptitude" : "Reading Comprehension";
}

export type SourceContent =
  | { type: "text"; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "image"; file?: string | null; available?: boolean };

export type SourceTab = { tab: number; label: string; content: SourceContent[] };

// `text` is used by reading passages. Multi-Source sets use `title` and `tabs`.
export type Passage = {
  source: string | null;
  wordCount: number | null;
  text: string;
  title?: string;
  tabs?: SourceTab[];
};

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
  section: "CR" | "RC" | "QA" | "DI";
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
