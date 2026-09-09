"use client";

import { useState } from "react";
import type { SafeMsr, MsrSubmission, DiGradeResult } from "@/lib/di";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function Msr({
  data,
  submission,
  onChange,
  feedback,
  disabled,
}: {
  data: SafeMsr;
  submission: MsrSubmission | undefined;
  onChange: (s: MsrSubmission) => void;
  feedback: DiGradeResult | null;
  disabled: boolean;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const sel = submission ?? {};

  function setYesNo(qKey: string, rowIndex: number, value: boolean) {
    if (disabled) return;
    const current = (sel[qKey] as boolean[] | undefined) ?? [];
    const next = [...current];
    next[rowIndex] = value;
    onChange({ ...sel, [qKey]: next });
  }

  function setMcq(qKey: string, letter: string) {
    if (disabled) return;
    onChange({ ...sel, [qKey]: letter });
  }

  const part = (key: string) => feedback?.parts.find((p) => p.key === key);

  return (
    <div>
      <p className="text-sm text-ink/70 mb-3">{data.intro_text}</p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ink/10 mb-3 overflow-x-auto">
        {data.tabs.map((tab, i) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => setActiveTab(i)}
            className={[
              "px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition",
              activeTab === i
                ? "border-brand text-brand"
                : "border-transparent text-ink/50",
            ].join(" ")}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="rounded-xl2 bg-white border border-ink/10 p-4 mb-6 min-h-[100px]">
        {data.tabs.map((tab, i) => {
          if (i !== activeTab) return null;
          if (tab.kind === "text") {
            return (
              <ul key={i} className="text-sm flex flex-col gap-2 list-disc pl-4">
                {tab.content.map((line, j) => (
                  <li key={j}>{line}</li>
                ))}
              </ul>
            );
          }
          return (
            <div key={i} className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {tab.columns.map((c) => (
                      <th key={c} className="text-left font-semibold border-b border-ink/10 py-1.5 pr-3 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tab.rows.map((row, r) => (
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
          );
        })}
      </div>

      <div className="flex flex-col gap-6">
        {data.questions.map(({ key, q }) => {
          const p = part(key);
          return (
            <div key={key}>
              <p className="text-sm font-medium mb-2">{q.stem}</p>
              {q.type === "yesno_grid" ? (
                <div className="flex flex-col gap-2">
                  {q.rows.map((row, i) => {
                    const current = (sel[key] as boolean[] | undefined)?.[i];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-lg border border-ink/10 bg-white px-3 py-2"
                      >
                        <span className="text-sm flex-1">{row.label}</span>
                        <div className="flex gap-2 shrink-0">
                          {[true, false].map((val) => (
                            <button
                              key={String(val)}
                              type="button"
                              disabled={disabled}
                              onClick={() => setYesNo(key, i, val)}
                              className={[
                                "px-3 py-1 rounded-md text-xs font-semibold border transition",
                                current === val
                                  ? "border-brand bg-brand-light text-brand"
                                  : "border-ink/10 text-ink/60",
                              ].join(" ")}
                            >
                              {val ? q.trueLabel : q.falseLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {feedback && (
                    <p className={p?.isCorrect ? "text-success text-xs mt-1" : "text-danger text-xs mt-1"}>
                      Correct answer: {p?.correctAnswer}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, i) => {
                    const letter = LETTERS[i];
                    const isSel = sel[key] === letter;
                    const isCorrectChoice = feedback && p?.correctAnswer.startsWith(letter + ".");
                    const isWrongSel = feedback && isSel && !p?.isCorrect;
                    return (
                      <button
                        key={letter}
                        type="button"
                        disabled={disabled}
                        onClick={() => setMcq(key, letter)}
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
                        <span className="font-semibold mr-2">{letter}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
