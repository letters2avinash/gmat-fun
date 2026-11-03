"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { seriesFetch } from "@/lib/series/client";
import type { Tip } from "@/lib/series/profile";

type TipsResponse = { name: string; tips: Tip[]; submittedTests: number };

// Avinash's performance tips on the series home page. Each tip has Yes / No:
// Yes opens a next step, No hides the tip for this visit.
export default function SeriesTips() {
  const [data, setData] = useState<TipsResponse | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [chosen, setChosen] = useState<Record<string, "yes" | "no">>({});

  useEffect(() => {
    seriesFetch<TipsResponse>("/api/series/tips")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const visible = (data?.tips ?? []).filter((t) => !hidden[t.key]);
  if (!data || data.submittedTests === 0 || visible.length === 0) return null;

  function answer(key: string, value: "yes" | "no") {
    setChosen((c) => ({ ...c, [key]: value }));
    if (value === "no") setHidden((h) => ({ ...h, [key]: true }));
  }

  return (
    <section className="rounded-xl2 border border-brand/20 bg-white p-5">
      <p className="text-sm font-medium text-brand">Avinash’s tips 💡</p>
      <ul className="mt-3 space-y-4 text-[15px] leading-relaxed">
        {visible.map((t) => {
          const pick = chosen[t.key];
          return (
            <li key={t.key}>
              <p>→ {t.text}</p>
              {!pick && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => answer(t.key, "yes")}
                    className="rounded-full bg-brand px-4 py-1.5 text-sm text-white hover:opacity-90"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => answer(t.key, "no")}
                    className="rounded-full border border-ink/15 px-4 py-1.5 text-sm hover:bg-ink/5"
                  >
                    No
                  </button>
                </div>
              )}
              {pick === "yes" && (
                <p className="mt-2 text-sm text-ink/70">
                  {t.kind === "weak" ? (
                    <>
                      Good. Open{" "}
                      <Link href="/series/analytics" className="font-medium text-brand underline">
                        your analytics
                      </Link>{" "}
                      and check each missed {t.type} question, then ask me about any you are unsure of.
                    </>
                  ) : (
                    <>
                      Keep it up. Watch for {t.type} questions in your next test and say what you notice.
                    </>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
