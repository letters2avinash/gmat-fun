"use client";

import type { SafeTpa, TpaSubmission, DiGradeResult } from "@/lib/di";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function Tpa({
  data,
  submission,
  onChange,
  feedback,
  disabled,
}: {
  data: SafeTpa;
  submission: TpaSubmission | undefined;
  onChange: (s: TpaSubmission) => void;
  feedback: DiGradeResult | null;
  disabled: boolean;
}) {
  const sel = submission ?? { col1: "", col2: "" };

  function setCol(col: "col1" | "col2", letter: string) {
    if (disabled) return;
    onChange({ ...sel, [col]: letter });
  }

  const part = (key: string) => feedback?.parts.find((p) => p.key === key);

  return (
    <div>
      <p className="text-lg leading-relaxed whitespace-pre-wrap">{data.prompt}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left font-semibold text-brand border-b border-ink/10 pb-2 pr-4 w-10">
                &nbsp;
              </th>
              <th className="text-left font-semibold text-brand border-b border-ink/10 pb-2 pr-4">
                {data.col1_label}
              </th>
              <th className="text-left font-semibold text-brand border-b border-ink/10 pb-2">
                {data.col2_label}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.options.map((opt, i) => {
              const letter = LETTERS[i];
              return (
                <tr key={letter} className="border-b border-ink/5">
                  <td className="py-2 pr-4 font-semibold text-ink/50">{letter}</td>
                  {(["col1", "col2"] as const).map((col) => {
                    const isSel = sel[col] === letter;
                    const p = part(col);
                    const isCorrectCell = feedback && p?.correctAnswer.startsWith(letter + ".");
                    const isWrongSel = feedback && isSel && !p?.isCorrect;
                    return (
                      <td key={col} className="py-1.5 pr-4">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setCol(col, letter)}
                          className={[
                            "w-full text-left rounded-lg border px-3 py-2 transition",
                            isCorrectCell
                              ? "border-success bg-success/10"
                              : isWrongSel
                              ? "border-danger bg-danger/10"
                              : isSel
                              ? "border-brand bg-brand-light"
                              : "border-ink/10 bg-white",
                          ].join(" ")}
                        >
                          {opt}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
