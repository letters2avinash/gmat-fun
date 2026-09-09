"use client";

import type { SafeGi, GiSubmission, DiGradeResult } from "@/lib/di";
import Chart from "./Chart";

export default function Gi({
  data,
  submission,
  onChange,
  feedback,
  disabled,
}: {
  data: SafeGi;
  submission: GiSubmission | undefined;
  onChange: (s: GiSubmission) => void;
  feedback: DiGradeResult | null;
  disabled: boolean;
}) {
  const sel = submission ?? {};

  function setChoice(key: string, letter: string) {
    if (disabled) return;
    onChange({ ...sel, [key]: letter });
  }

  const part = (key: string) => feedback?.parts.find((p) => p.key === key);

  return (
    <div>
      <p className="text-sm text-ink/70 mb-3">{data.intro_text}</p>

      <div className="rounded-xl2 bg-white border border-ink/10 p-4 mb-6">
        <Chart data={data.chart} />
      </div>

      <div className="flex flex-col gap-5">
        {data.statements.map((stmt) => {
          const p = part(stmt.key);
          const [before, after] = stmt.sentence.split("___");
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
