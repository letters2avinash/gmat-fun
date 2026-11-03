"use client";

import { useEffect, useState } from "react";
import { seriesFetch } from "@/lib/series/client";

type Tips = { name: string; tips: string[]; submittedTests: number };

// Avinash's performance tips on the series home page.
export default function SeriesTips() {
  const [data, setData] = useState<Tips | null>(null);

  useEffect(() => {
    seriesFetch<Tips>("/api/series/tips")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.submittedTests === 0 || data.tips.length === 0) return null;

  return (
    <section className="rounded-xl2 border border-brand/20 bg-white p-5">
      <p className="text-sm font-medium text-brand">Avinash’s tips 💡</p>
      <ul className="mt-2 space-y-2 text-[15px] leading-relaxed">
        {data.tips.map((t) => (
          <li key={t}>→ {t}</li>
        ))}
      </ul>
    </section>
  );
}
