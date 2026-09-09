/**
 * Data Insights content lives in `di_items.raw` exactly as it was authored
 * by the 2026-09 content batch — a nested JSON record whose shape differs
 * per `di_type`. This module is the only place that understands that raw
 * shape.
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

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// ---------------------------------------------------------------------
// Chart data (Graphics Interpretation) — passed straight through from
// `raw.chart`, unchanged. None of these fields carry an answer, so no
// stripping is needed; only typed here for the renderer's benefit.
// ---------------------------------------------------------------------

export interface AxisSpec {
  label: string;
  min: number;
  max: number;
  major: number;
  minor?: number;
  tolerance?: number;
}

export interface BarChart {
  type: "bar";
  categories: string[];
  values: number[];
  axes: { y: AxisSpec };
  value_labels?: boolean;
}
export interface LineChart {
  type: "line";
  x: string[];
  series: { name: string; values: number[] }[];
  axes: { y: AxisSpec };
  value_labels?: boolean;
}
export interface MultiLineChart {
  type: "multi_line";
  x: string[];
  x_label?: string;
  series: { name: string; values: number[] }[];
  axes: { y: AxisSpec };
  value_labels?: boolean;
}
export interface ScatterChart {
  type: "scatter";
  points: { label: string; x: number; y: number; group?: string }[];
  axes: { x: AxisSpec; y: AxisSpec };
}
export interface Venn2Chart {
  type: "venn2";
  total: number;
  regions: { only_a: number; only_b: number; both: number; neither: number };
  labels: [string, string];
  exact?: boolean;
}
export interface Venn3Chart {
  type: "venn3";
  labels: [string, string, string];
  regions: { a: number; b: number; c: number; ab: number; ac: number; bc: number; abc: number };
  exact?: boolean;
}
export interface RangeBandChart {
  type: "range_band";
  bands: { label: string; low: number; high: number }[];
  axes: { y: AxisSpec };
}
export interface StackedBarChart {
  type: "stacked_bar";
  categories: string[];
  bands: string[];
  values: { label: string; parts: number[] }[];
  axes: { y: AxisSpec };
  value_labels?: boolean;
}
export interface GroupedBarChart {
  type: "grouped_bar";
  categories: string[];
  series: { name: string; values: number[] }[];
  axes: { y: AxisSpec };
  value_labels?: boolean;
}
export interface DualAxisChart {
  type: "dual_axis";
  x: string[];
  series: { name: string; values: number[]; axis: "left" | "right"; unit?: string }[];
  axes: { y_left: AxisSpec; y_right: AxisSpec };
  unit_mismatch?: boolean;
}
export interface PictographChart {
  type: "pictograph";
  unit_value: number;
  unit_label: string;
  rows: { label: string; symbols: number; value: number }[];
}
export interface FlowchartChart {
  type: "flowchart";
  start: Record<string, number>;
  variable: string;
  add_if_odd: number;
  add_if_even: number;
  threshold: number;
  branching: boolean;
  trace: { pass_no: number; n: number; value: number }[];
}
export interface ConflictGraphChart {
  type: "conflict_graph";
  directed: false;
  nodes: { name: string; x: number; y: number }[];
  edges: { a: string; b: string }[];
  chromatic_number?: number;
}
export interface DirectedNetworkChart {
  type: "directed_network";
  directed: true;
  nodes: { name: string; x: number; y: number }[];
  edges: { from: string; to: string }[];
  source?: string;
}

export type ChartData =
  | BarChart
  | LineChart
  | MultiLineChart
  | ScatterChart
  | Venn2Chart
  | Venn3Chart
  | RangeBandChart
  | StackedBarChart
  | GroupedBarChart
  | DualAxisChart
  | PictographChart
  | FlowchartChart
  | ConflictGraphChart
  | DirectedNetworkChart;

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
  | { type: "yesno_grid"; stem: string; rows: { label: string }[]; trueLabel: string; falseLabel: string }
  | { type: "mcq"; stem: string; options: string[] };

export interface SafeMsr {
  di_type: "multi_source_reasoning";
  intro_text: string;
  tabs: (
    | { name: string; kind: "text"; content: string[] }
    | { name: string; kind: "table"; columns: string[]; rows: string[][] }
  )[];
  questions: { key: string; q: SafeMsrSubQuestion }[];
}

export interface SafeTableAnalysis {
  di_type: "table_analysis";
  intro_text: string;
  table_columns: string[];
  table_rows: string[][];
  statements: {
    key: string;
    sentence: string;
    options: { key: string; text: string }[];
  }[];
}

export interface SafeGi {
  di_type: "graphics_interpretation";
  intro_text: string;
  chart: ChartData;
  statements: {
    key: string;
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
export type TableAnalysisSubmission = Record<string, string>; // stmt key -> option key
export type GiSubmission = Record<string, string>; // stmt key -> letter

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

function toSafeTpa(raw: RawDi): SafeTpa {
  return {
    di_type: "two_part_analysis",
    prompt: raw.prompt,
    col1_label: raw.col1_header,
    col2_label: raw.col2_header,
    options: raw.options ?? [],
  };
}

function toSafeMsrTabs(raw: RawDi): SafeMsr["tabs"] {
  return (raw.tabs ?? []).map((t: any) => {
    if (t.kind === "table") {
      const content = t.content ?? {};
      return {
        name: t.name,
        kind: "table" as const,
        columns: (content.columns ?? []).map((c: any) => c.name),
        rows: (content.rows ?? []).map((r: any[]) => r.map((cell) => String(cell))),
      };
    }
    return { name: t.name, kind: "text" as const, content: t.content ?? [] };
  });
}

function toSafeMsr(raw: RawDi): SafeMsr {
  const questions: SafeMsr["questions"] = (raw.questions ?? []).map((q: any, i: number) => {
    const key = `q${i + 1}`;
    if (q.format === "grid") {
      const labels = q.labels ?? ["Yes", "No"];
      return {
        key,
        q: {
          type: "yesno_grid" as const,
          stem: q.prompt,
          rows: (q.rows ?? []).map((r: any) => ({ label: r.text })),
          trueLabel: labels[0],
          falseLabel: labels[1],
        },
      };
    }
    return {
      key,
      q: { type: "mcq" as const, stem: q.prompt, options: q.options ?? [] },
    };
  });

  return {
    di_type: "multi_source_reasoning",
    intro_text: raw.intro,
    tabs: toSafeMsrTabs(raw),
    questions,
  };
}

function toSafeTableAnalysis(raw: RawDi): SafeTableAnalysis {
  const table = raw.table ?? {};
  const gridLabels: [string, string] = raw.grid_labels ?? ["True", "False"];
  const options = [
    { key: "0", text: gridLabels[0] },
    { key: "1", text: gridLabels[1] },
  ];
  const statements = (raw.statements ?? []).map((s: any, i: number) => ({
    key: String.fromCharCode(97 + i), // a, b, c, ...
    sentence: s.text,
    options,
  }));

  return {
    di_type: "table_analysis",
    intro_text: raw.intro,
    table_columns: (table.columns ?? []).map((c: any) => c.name),
    table_rows: (table.rows ?? []).map((r: any[]) => r.map((cell) => String(cell))),
    statements,
  };
}

function toSafeGi(raw: RawDi): SafeGi {
  const statements = (raw.statements ?? []).map((s: any, i: number) => ({
    key: String.fromCharCode(97 + i), // a, b
    sentence: s.text,
    options: (s.options ?? []).map((text: string, j: number) => ({ key: LETTERS[j], text })),
  }));

  return {
    di_type: "graphics_interpretation",
    intro_text: raw.intro,
    chart: raw.chart as ChartData,
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
  const options: string[] = raw.options ?? [];
  const col1Idx = raw.col1_answer_index;
  const col2Idx = raw.col2_answer_index;
  const col1Correct = LETTERS[col1Idx];
  const col2Correct = LETTERS[col2Idx];
  const parts = [
    {
      key: "col1",
      isCorrect: answer.col1 === col1Correct,
      correctAnswer: `${col1Correct}. ${options[col1Idx]}`,
    },
    {
      key: "col2",
      isCorrect: answer.col2 === col2Correct,
      correctAnswer: `${col2Correct}. ${options[col2Idx]}`,
    },
  ];
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

function gradeMsr(raw: RawDi, answer: MsrSubmission): DiGradeResult {
  const parts: DiGradeResult["parts"] = [];
  (raw.questions ?? []).forEach((q: any, i: number) => {
    const key = `q${i + 1}`;
    if (q.format === "grid") {
      const labels = q.labels ?? ["Yes", "No"];
      const rows = q.rows ?? [];
      const submitted = (answer[key] as boolean[]) ?? [];
      const isCorrect = rows.every((r: any, idx: number) => submitted[idx] === r.answer);
      parts.push({
        key,
        isCorrect,
        correctAnswer: rows.map((r: any) => (r.answer ? labels[0] : labels[1])).join(" / "),
      });
    } else {
      const options: string[] = q.options ?? [];
      const correctLetter = LETTERS[q.correct_index];
      parts.push({
        key,
        isCorrect: answer[key] === correctLetter,
        correctAnswer: `${correctLetter}. ${options[q.correct_index]}`,
      });
    }
  });
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

function gradeTableAnalysis(raw: RawDi, answer: TableAnalysisSubmission): DiGradeResult {
  const gridLabels: [string, string] = raw.grid_labels ?? ["True", "False"];
  const parts: DiGradeResult["parts"] = [];
  (raw.statements ?? []).forEach((s: any, i: number) => {
    const key = String.fromCharCode(97 + i);
    const correctKey = s.answer ? "0" : "1";
    parts.push({
      key,
      isCorrect: answer[key] === correctKey,
      correctAnswer: `${correctKey}. ${s.answer ? gridLabels[0] : gridLabels[1]}`,
    });
  });
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

function gradeGi(raw: RawDi, answer: GiSubmission): DiGradeResult {
  const parts: DiGradeResult["parts"] = [];
  (raw.statements ?? []).forEach((s: any, i: number) => {
    const key = String.fromCharCode(97 + i);
    const correctLetter = s.correct_letter;
    parts.push({
      key,
      isCorrect: answer[key] === correctLetter,
      correctAnswer: `${correctLetter}. ${s.correct_text ?? ""}`,
    });
  });
  return { isCorrect: parts.every((p) => p.isCorrect), parts };
}

export function gradeDiItem(diType: DiType, raw: RawDi, submission: DiSubmission): DiGradeResult {
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
