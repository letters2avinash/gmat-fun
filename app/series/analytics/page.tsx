"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AnalyticsView from "@/components/series/AnalyticsView";
import { seriesFetch } from "@/lib/series/client";
import type { AnalyticsData } from "@/lib/series/analytics-types";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seriesFetch<AnalyticsData>("/api/series/analytics")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return <div className="rounded-xl2 border border-danger/30 bg-danger/5 p-5 text-sm text-danger">{error}</div>;
  }
  if (!data) return <p className="text-sm text-ink/60">Loading analytics…</p>;

  if (data.summary.attempts === 0) {
    return (
      <div className="rounded-xl2 border border-ink/10 bg-white p-6">
        <p>No submitted tests yet. Analytics appear after your first submitted test.</p>
        <Link href="/" className="mt-3 inline-block text-brand hover:underline">Go to tests</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Your analytics</h1>
        <p className="text-sm text-ink/60">Across {data.summary.attempts} submitted test{data.summary.attempts === 1 ? "" : "s"}.</p>
      </div>
      <AnalyticsView data={data} />
    </div>
  );
}
