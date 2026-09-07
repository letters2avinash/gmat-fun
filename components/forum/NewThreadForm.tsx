"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

export default function NewThreadForm({
  categoryId,
  categorySlug,
}: {
  categoryId: string;
  categorySlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createBrowserSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(`/forum/${categorySlug}`)}`);
      return;
    }

    const authorName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Member";

    const { data, error: insertError } = await supabase
      .from("forum_threads")
      .insert({
        category_id: categoryId,
        author_id: user.id,
        author_name: authorName,
        title,
        body,
      })
      .select("id")
      .single();

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push(`/forum/thread/${data.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl2 bg-brand text-white px-4 py-2.5 text-sm font-semibold shadow-sm active:scale-[0.98] transition"
      >
        Start a thread
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl2 bg-white border border-ink/10 p-5 flex flex-col gap-3"
    >
      <input
        required
        placeholder="Thread title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-xl2 border border-ink/10 px-4 py-2.5 outline-none focus:border-brand text-sm"
      />
      <textarea
        required
        placeholder="What's on your mind?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        className="rounded-xl2 border border-ink/10 px-4 py-2.5 outline-none focus:border-brand text-sm resize-none"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl2 bg-brand text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition"
        >
          {loading ? "Posting…" : "Post thread"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl2 border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
