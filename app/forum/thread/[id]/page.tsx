import Link from "next/link";
import { notFound } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import type { ForumPost } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReplyForm from "@/components/forum/ReplyForm";

export const dynamic = "force-dynamic";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createBrowserSupabase();

  const { data: thread } = await supabase
    .from("forum_threads")
    .select("id, category_id, author_name, title, body, created_at")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  const { data: category } = await supabase
    .from("forum_categories")
    .select("slug, name")
    .eq("id", thread.category_id)
    .single();

  const { data: posts } = await supabase
    .from("forum_posts")
    .select("id, thread_id, author_name, body, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-14">
        <Link href={`/forum/${category?.slug ?? ""}`} className="text-sm font-semibold text-brand">
          ← {category?.name ?? "Forum"}
        </Link>

        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">
          {thread.title}
        </h1>
        <p className="mt-2 text-xs text-ink/40 font-medium">
          {thread.author_name} ·{" "}
          {new Date(thread.created_at).toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <p className="mt-4 text-ink/80 whitespace-pre-wrap leading-relaxed">{thread.body}</p>

        <div className="mt-10 flex flex-col gap-4">
          {((posts as ForumPost[] | null) ?? []).map((p) => (
            <div key={p.id} className="rounded-xl2 bg-white border border-ink/10 p-4">
              <p className="text-sm text-ink/80 whitespace-pre-wrap">{p.body}</p>
              <p className="mt-2 text-xs text-ink/40 font-medium">
                {p.author_name} ·{" "}
                {new Date(p.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-ink/5">
          <ReplyForm threadId={thread.id} />
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
