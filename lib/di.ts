/**
 * Data Insights content lives in `di_items.raw` exactly as it was authored —
 * a flat record whose fields differ per `di_type`, with several fields
 * holding JSON-encoded strings (arrays/objects) rather than parsed JSON,
 * because that's the shape the source generator produced. This module is
 * the only place that understands that raw shape.
 *
 * Two jobs, kept strictly separate:
 *  - `toSafeDiItem`  strips every correct-answer field out of a raw row so
 *    it's safe to send to the browser before the user has answered.
 *  - `gradeDiItem`   takes the *raw* row (server-side only) plus the user's
 *    submission and returns per-part correctness + the correct answers, so
 *    the client never sees an answer key it hasn't earned yet.
 */

import type { DiType } from "./types";

type RawDi = Record<string, any>;

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ---------------------------------------------------------------------
// Safe (question-only) shapes sent to the client
// ---------------------------------------------------------------------

export interface SafeTpa {
  di_type: "two_part_analysis";
  prompt: string;
  col1_label: string;
  col2_label: string;
  options: string[]; // shared option pool for both columns, letter = index
}

export type SafeMsrSubQuestion =
  | { type: "yesno_grid"; stem: string; rows: { label: string }[] }
  | { type: "mcq"; stem: string; options: string[] };

export interface SafeMsr {
  di_type: "multi_source_reasoning";
  intro_text: string;
  tabs: (
    | { name: string; kind: "text"; content: string[] }
    | { name: string; kind: "table"; columns: string[]; rows: string[][] }
  )[];
  questions: { key: "q1" | "q2" | "q3"; q: SafeMsrSubQuestion }[];
}

export interface SafeTableAnalysis {
  di_type: "table_analysis";
  intro_text: string;
  table_columns: string[];
  table_rows: string[][];
  statements: {
    key: "a" | "b" | "c";
    sentence: string;
    options: { key: string; text: string }[];
  }[];
}

export type ChartData =
  | { kind: "xy"; labels: string[]; values: number[]; value_name: string }
  | {
      kind: "scatter";
      labels: string[];
      x_name: string;
      x: number[];
      y_name: string;
      y: number[];
    }
  | {
      kind: "venn";
      set_a_name: string;
      set_b_name: string;
      only_a: number;
      only_b: number;
      both: number;
      neither: number;
      total: number;
    };

export interface SafeGi {
  di_type: "graphics_interpretation";
  intro_text: string;
  chart_type: "bar" | "line" | "pie" | "scatter" | "venn";
  chart: ChartData;
  statements: {
    key: "a" | "b";
    sentence: string;
    options: { key: string; text: string }[];
  }[];
}

export type SafeDi = SafeTpa | SafeMsr | SafeTableAnalysis | SafeGi;

export interface SafeDiItem {
  id: string;
  di_type: DiType;
  category: string | null;
  difficulty: string | null;
  topic: string | null;
  data: SafeDi;
}

// ---------------------------------------------------------------------
// Submissions (what the client posts back)
// ---------------------------------------------------------------------

export type TpaSubmission = { col1: string; col2: string }; // letters
export type MsrSubmission = Record<
  string,
  boolean[] | string // yesno_grid -> per-row booleans, mcq -> letter
>;
export type TableAnalysisSubmission = Record<string, string>; // a/b/c -> letter
export type GiSubmission = Record<string, string>; // a/b -> letter

export type DiSubmission =
  | { di_type: "two_part_analysis"; answer: TpaSubmission }
  | { di_type: "multi_source_reasoning"; answer: MsrSubmission }
  | { di_type: "table_analysis"; answer: TableAnalysisSubmission }
  | { di_type: "graphics_interpretation"; answer: GiSubmission };

export interface DiGradeResult {
  isCorrect: boolean;
  parts: { key: string; isCorrect: boolean; correctAnswer: string }[];
}

// ---------------------------------------------------------------------
// Parsing raw -> safe
// ---------------------------------------------------------------------

function letterOptions(values: string[]): string[] {
  return values;
}

function toSafeTpa(raw: RawDi): SafeTpa {
  return {
    di_type: "two_part_analysis",
    prompt: raw.prompt,
    col1_label: raw.col1_label,
    col2_label: raw.col2_label,
    options: letterOptions(parseJson<string[]>(raw.options, [])),
  };
}

function toSafeMsr(raw: RawDi): SafeMsr {
  const tabs = parseJson<any[]>(raw.tabs, []).map((t) =>
    t.kind === "table"
      ? { name: t.name, kind: "table" as const, columns: t.columns, rows: t.rows }
      : { name: t.name, kind: "text" as const, content: t.content }
  );

  const questions: SafeMsr["questions"] = [];
  for (const n of [1, 2, 3] as const) {
    const type = raw[`q${n}_type`];
    if (!type) continue;
    const key = `q${n}` as const;
    if (type === "yesno_grid") {
      const rows = parseJson<{ label: string; answer: boolean }[]>(
        raw[`q${n}_rows`],
        []
      );
      questions.push({
        key,
        q: {
          type: "yesno_grid",
          stem: raw[`q${n}_stem`],
          rows: rows.map((r) => ({ label: r.label })),
        },
      });
    } else if (type === "mcq") {
      questions.push({
        key,
        q: {
          type: "mcq",
          stem: raw[`q${n}_stem`],
          options: parseJson<string[]>(raw[`q${n}_options`], []),
        },
      });
    }
  }

  return {
    di_type: "multi_source_reasoning",
    intro_text: raw.intro_text,
    tabs,
    questions,
  };
}

function toSafeTableAnalysis(raw: RawDi): SafeTableAnalysis {
  const statements: SafeTableAnalysis["statements"] = [];
  for (const letter of ["a", "b", "c"] as const) {
    const sentence = raw[`prompt_${letter}_sentence`];
    if (!sentence) continue;
    const options = parseJson<[string, string][]>(
      raw[`prompt_${letter}_options`],
      []
    );
    statements.push({
      key: letter,
      sentence,
      options: options.map(([key, text]) => ({ key, text })),
    });
  }

  return {
    di_type: "table_analysis",
    intro_text: raw.intro_text,
    table_columns: parseJson<string[]>(raw.table_columns, []),
    table_rows: parseJson<string[][]>(raw.table_rows, []),
    statements,
  };
}

function toSafeGi(raw: RawDi): SafeGi {
  const rawChart = parseJson<any>(raw.chart_data, {});
  let chart: ChartData;
  if (raw.chart_type === "scatter") {
    chart = {
      kind: "scatter",
      labels: rawChart.labels,
      x_name: rawChart.x_name,
      x: rawChart.x,
      y_name: rawChart.y_name,
      y: rawChart.y,
    };
  } else if (raw.chart_type === "venn") {
    chart = {
      kind: "venn",
      set_a_name: rawChart.set_a_name,
      set_b_name: rawChart.set_b_name,
      only_a: rawChart.only_a,
      only_b: rawChart.only_b,
      both: rawChart.both,
      neither: rawChart.neither,
      total: rawChart.total,
    };
  } else {
    chart = {
      kind: "xy",
      labels: rawChart.labels,
      values: rawChart.values,
      value_name: rawChart.value_name,
    };
  }

  const statements: SafeGi["statements"] = [];
  for (const letter of ["a", "b"] as const) {
    const sentence = raw[`statement_${letter}_sentence`];
    if (!sentence) continue;
    const options = parseJson<string[]>(raw[`statement_${letter}_options`], []);
    statements.push({
      key: letter,
      sentence,
      options: options.map((text, i) => ({ key: LETTERS[i], text })),
    });
  }

  return {
    di_type: "graphics_interpretation",
    intro_text: raw.intro_text,
    chart_type: raw.chart_type,
    chart,
    statements,
  };
}

export function toSafeDiItem(row: {
  id: string;
  di_type: DiType;
  category: string | null;
  difficulty: string | null;
  topic: string | null;
  raw: RawDi;
}): SafeDiItem {
  const { raw } = row;
  let data: SafeDi;
  switch (row.di_type) {
    case "two_part_analysis":
      data = toSafeTpa(raw);
      break;
    case "multi_source_reasoning":
      data = toSafeMsr(raw);
      break;
    case "table_analysis":
      data = toSafeTableAnalysis(raw);
      break;
    case "graphics_interpretation":
      data = toSafeGi(raw);
      break;
  }
  return {
    id: row.id,
    di_type: row.di_type,
    category: row.category,
    difficulty: row.difficulty,
    topic: row.topic,
    data,
  };
}

// ---------------------------------------------------------------------
// Grading (raw stays server-side)
// ---------------------------------------------------------------------

function gradeTpa(raw: RawDi, answer: TpaSubmission): DiGradeResult {
  const options = parseJson<string[]>(raw.options, []);
  const col1Correct = raw.col1_correct_letter;
  const col2Correct = raw.col2_correct_letter;
  const parts = [
    {
      key: "col1",
      isCorrect: answer.col1 === col1Correct,
      correctAnswer: `${col1Correct}. ${options[LETTERS.indexOf(col1Correct)] ?? raw.col1_correct_text}`,
    },
    {
      key: "col2",
      isCorrect: answer.col2 === col2Correct,
      correctAnswer: `${col2Correct}. ${options[LETTERS.indexOf(col2Correct)] ?? raw.col2_correct_text}`,
    },
  ];
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

function gradeMsr(raw: RawDi, answer: MsrSubmission): DiGradeResult {
  const parts: DiGradeResult["parts"] = [];
  for (const n of [1, 2, 3] as const) {
    const type = raw[`q${n}_type`];
    if (!type) continue;
    const key = `q${n}`;
    if (type === "yesno_grid") {
      const rows = parseJson<{ label: string; answer: boolean }[]>(
        raw[`q${n}_rows`],
        []
      );
      const submitted = (answer[key] as boolean[]) ?? [];
      const isCorrect = rows.every((r, i) => submitted[i] === r.answer);
      parts.push({
        key,
        isCorrect,
        correctAnswer: rows
          .map((r) => (r.answer ? "Yes" : "No"))
          .join(" / "),
      });
    } else if (type === "mcq") {
      const correctLetter = raw[`q${n}_correct_letter`];
      parts.push({
        key,
        isCorrect: answer[key] === correctLetter,
        correctAnswer: `${correctLetter}. ${raw[`q${n}_correct_text`]}`,
      });
    }
  }
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

function gradeTableAnalysis(
  raw: RawDi,
  answer: TableAnalysisSubmission
): DiGradeResult {
  const parts: DiGradeResult["parts"] = [];
  for (const letter of ["a", "b", "c"] as const) {
    const sentence = raw[`prompt_${letter}_sentence`];
    if (!sentence) continue;
    const correctLetter = raw[`prompt_${letter}_correct_letter`];
    parts.push({
      key: letter,
      isCorrect: answer[letter] === correctLetter,
      correctAnswer: `${correctLetter}. ${raw[`prompt_${letter}_correct_text`]}`,
    });
  }
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

function gradeGi(raw: RawDi, answer: GiSubmission): DiGradeResult {
  const parts: DiGradeResult["parts"] = [];
  for (const letter of ["a", "b"] as const) {
    const sentence = raw[`statement_${letter}_sentence`];
    if (!sentence) continue;
    const options = parseJson<string[]>(raw[`statement_${letter}_options`], []);
    const correctLetter = raw[`statement_${letter}_correct_letter`];
    parts.push({
      key: letter,
      isCorrect: answer[letter] === correctLetter,
      correctAnswer: `${correctLetter}. ${raw[`statement_${letter}_correct_text`] ?? options[LETTERS.indexOf(correctLetter)]}`,
    });
  }
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

export function gradeDiItem(
  diType: DiType,
  raw: RawDi,
  submission: DiSubmission
): DiGradeResult {
  switch (diType) {
    case "two_part_analysis":
      return gradeTpa(raw, submission.answer as TpaSubmission);
    case "multi_source_reasoning":
      return gradeMsr(raw, submission.answer as MsrSubmission);
    case "table_analysis":
      return gradeTableAnalysis(raw, submission.answer as TableAnalysisSubmission);
    case "graphics_interpretation":
      return gradeGi(raw, submission.answer as GiSubmission);
  }
}

export const DI_TYPE_LABELS: Record<DiType, string> = {
  two_part_analysis: "Two-Part Analysis",
  multi_source_reasoning: "Multi-Source Reasoning",
  table_analysis: "Table Analysis",
  graphics_interpretation: "Graphics Interpretation",
};
