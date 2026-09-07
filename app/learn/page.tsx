import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { CURRICULUM } from "@/lib/curriculum";
import LearnProgress from "@/components/learn/LearnProgress";

export default function LearnIndexPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Learn</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
          A structured path through every section
        </h1>
        <p className="mt-3 text-ink/60 max-w-xl">
          Short, focused lessons for Quant, Verbal, and Data Insights — each one links
          straight into practice, and your progress bar reflects your real attempt
          history, not just lessons opened.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          {CURRICULUM.map((section) => (
            <div
              key={section.key}
              className="rounded-xl2 bg-white border border-ink/10 p-6 hover:border-brand/40 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link href={`/learn/${section.key}`} className="font-bold text-lg">
                    {section.label}
                  </Link>
                  <p className="mt-1 text-sm text-ink/60">{section.blurb}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-ink/40 rounded-full bg-ink/5 px-3 py-1.5 whitespace-nowrap">
                  {section.lessons.length} lessons
                </span>
              </div>
              <LearnProgress sectionKey={section.key} />
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/learn/${section.key}`}
                  className="rounded-xl2 bg-brand text-white px-4 py-2 text-sm font-semibold active:scale-[0.98] transition"
                >
                  Start learning
                </Link>
                <Link
                  href={section.practiceHref}
                  className="rounded-xl2 border border-ink/10 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 transition"
                >
                  Jump to practice
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
