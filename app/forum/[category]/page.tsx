import Link from "next/link";
import { notFound } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import type { ForumCategory, ForumThread } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NewThreadForm from "@/components/forum/NewThreadForm";

export const dynamic = "force-dynamic";

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const supabase = createBrowserSupabase();

  const { data: category } = await supabase
    .from("forum_categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .single();

  if (!category) notFound();

  const { data: threads } = await supabase
    .from("forum_threads")
    .select("id, category_id, author_name, title, body, created_at")
    .eq("category_id", category.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-14">
        <Link href="/forum" className="text-sm font-semibold text-brand">
          ← All categories
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">
          {category.name}
        </h1>
        <p className="mt-2 text-ink/60">{category.description}</p>

        <div className="mt-6">
          <NewThreadForm categoryId={category.id} categorySlug={category.slug} />
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {(!threads || threads.length === 0) && (
            <p className="text-ink/50">No threads yet — be the first to post.</p>
          )}
          {(threads as ForumThread[] | null)?.map((t) => (
            <Link
              key={t.id}
              href={`/forum/thread/${t.id}`}
              className="rounded-xl2 bg-white border border-ink/10 p-5 hover:border-brand/40 hover:shadow-md transition"
            >
              <h2 className="font-bold">{t.title}</h2>
              <p className="mt-1.5 text-sm text-ink/60 line-clamp-2">{t.body}</p>
              <p className="mt-3 text-xs text-ink/40 font-medium">
                {t.author_name} ·{" "}
                {new Date(t.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
