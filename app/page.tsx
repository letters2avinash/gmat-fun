import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const MODES = [
  {
    key: "topic",
    title: "Topic-wise",
    href: "/test/topic",
    blurb: "Drill one topic at a time — Quant, Verbal (Critical Reasoning), or Data Insights.",
  },
  {
    key: "sectional",
    title: "Sectional",
    href: "/test/sectional",
    blurb: "One full timed, adaptive section — Quant, Verbal, or Data Insights.",
  },
  {
    key: "full-length",
    title: "Full-length",
    href: "/test/full-length",
    blurb: "The real GMAT Focus simulation — Quant, Verbal, and Data Insights, scored 205–805.",
  },
  {
    key: "data-insights",
    title: "Data Insights",
    href: "/practice/data-insights",
    blurb: "Two-Part Analysis, Multi-Source Reasoning, Table Analysis, Graphics Interpretation.",
  },
];

const HUB_LINKS = [
  {
    key: "learn",
    title: "Learn",
    href: "/learn",
    blurb: "A structured lesson path for Quant, Verbal, and Data Insights — tracked against your real attempts.",
  },
  {
    key: "blog",
    title: "Blog",
    href: "/blog",
    blurb: "Strategy, score-improvement stories, and admissions insight from our team and guest writers.",
  },
  {
    key: "forum",
    title: "Forum",
    href: "/forum",
    blurb: "Ask questions, compare timelines, and swap strategy with other test-takers.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          GMAT prep that adapts to <span className="text-brand">you</span>.
        </h1>
        <p className="mt-5 text-lg text-ink/70 max-w-xl">
          Adaptive tests, an AI tutor for every question, and support for the
          entire admissions journey — from SOPs to score reports. Built to
          feel effortless on your phone.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/test/full-length"
            className="rounded-xl2 bg-brand text-white px-7 py-3.5 font-semibold shadow-lg shadow-brand/20 active:scale-[0.98] transition"
          >
            Start a free test
          </Link>
          <a
            href="#tests"
            className="rounded-xl2 bg-white border border-ink/10 px-7 py-3.5 font-semibold text-ink active:scale-[0.98] transition"
          >
            See test modes
          </a>
        </div>
      </section>

      <section id="tests" className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-4">
          Practice &amp; tests
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => (
            <Link
              key={m.key}
              href={m.href}
              className="rounded-xl2 bg-white border border-ink/10 p-6 hover:border-brand/40 hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg">{m.title}</h3>
              <p className="mt-2 text-sm text-ink/60">{m.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink/40 mb-4">
          Beyond the test
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {HUB_LINKS.map((h) => (
            <Link
              key={h.key}
              href={h.href}
              className="rounded-xl2 bg-brand-light/60 border border-brand/10 p-6 hover:border-brand/40 hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg text-brand-dark">{h.title}</h3>
              <p className="mt-2 text-sm text-ink/60">{h.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
