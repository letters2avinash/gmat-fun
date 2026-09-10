"use client";

import { useMemo, useState } from "react";
import type { SafeTableAnalysis, TableAnalysisSubmission, DiGradeResult } from "@/lib/di";

type SortDir = "asc" | "desc";

function parseCell(cell: string): number | string {
  const cleaned = cell.replace(/[,$%]/g, "").trim();
  if (cleaned !== "" && !isNaN(Number(cleaned))) return Number(cleaned);
  return cell.toLowerCase();
}

export default function TableAnalysisQuestion({
  data,
  submission,
  onChange,
  feedback,
  disabled,
}: {
  data: SafeTableAnalysis;
  submission: TableAnalysisSubmission | undefined;
  onChange: (s: TableAnalysisSubmission) => void;
  feedback: DiGradeResult | null;
  disabled: boolean;
}) {
  const sel = submission ?? {};
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function setChoice(key: string, letter: string) {
    if (disabled) return;
    onChange({ ...sel, [key]: letter });
  }

  function toggleSort(colIndex: number) {
    if (sortCol === colIndex) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colIndex);
      setSortDir("asc");
    }
  }

  const sortedRows = useMemo(() => {
    if (sortCol === null) return data.table_rows;
    const withIndex = data.table_rows.map((row, i) => ({ row, i }));
    withIndex.sort((a, b) => {
      const av = parseCell(a.row[sortCol] ?? "");
      const bv = parseCell(b.row[sortCol] ?? "");
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      if (cmp === 0) cmp = a.i - b.i;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withIndex.map((x) => x.row);
  }, [data.table_rows, sortCol, sortDir]);

  const part = (key: string) => feedback?.parts.find((p) => p.key === key);

  return (
    <div>
      <p className="text-sm text-ink/70 mb-3">{data.intro_text}</p>

      <div className="rounded-xl2 bg-white border border-ink/10 p-3 mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {data.table_columns.map((c, colIndex) => {
                const isActive = sortCol === colIndex;
                return (
                  <th
                    key={c}
                    className="text-left font-semibold border-b border-ink/10 py-1.5 pr-3 whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(colIndex)}
                      className={[
                        "inline-flex items-center gap-1 cursor-pointer select-none",
                        isActive ? "text-brand" : "text-ink hover:text-brand/70",
                      ].join(" ")}
                      aria-label={`Sort by ${c}`}
                    >
                      <span>{c}</span>
                      <span className="inline-flex flex-col leading-none text-[8px] -space-y-0.5">
                        <span className={isActive && sortDir === "asc" ? "text-brand" : "text-ink/30"}>
                          &#9650;
                        </span>
                        <span className={isActive && sortDir === "desc" ? "text-brand" : "text-ink/30"}>
                          &#9660;
                        </span>
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, r) => (
              <tr key={r} className="border-b border-ink/5">
                {row.map((cell, c) => (
                  <td key={c} className="py-1.5 pr-3 whitespace-nowrap">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-5">
        {data.statements.map((stmt) => {
          const p = part(stmt.key);
          const [before, after] = stmt.sentence.split("_____");
          return (
            <div key={stmt.key}>
              <p className="text-sm font-medium mb-2">
                {before}
                <span className="inline-block px-2 border-b-2 border-dashed border-brand/50 mx-0.5">
                  {sel[stmt.key]
                    ? stmt.options.find((o) => o.key === sel[stmt.key])?.text
                    : "     "}
                </span>
                {after}
              </p>
              <div className="flex flex-col gap-2">
                {stmt.options.map((opt) => {
                  const isSel = sel[stmt.key] === opt.key;
                  const isCorrectChoice = feedback && p?.correctAnswer.startsWith(opt.key + ".");
                  const isWrongSel = feedback && isSel && !p?.isCorrect;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => setChoice(stmt.key, opt.key)}
                      className={[
                        "text-left rounded-lg border px-3 py-2 text-sm transition",
                        isCorrectChoice
                          ? "border-success bg-success/10"
                          : isWrongSel
                          ? "border-danger bg-danger/10"
                          : isSel
                          ? "border-brand bg-brand-light"
                          : "border-ink/10 bg-white",
                      ].join(" ")}
                    >
                      <span className="font-semibold mr-2">{opt.key}.</span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
