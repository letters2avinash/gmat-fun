"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

export default function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
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
      router.push(`/auth?next=${encodeURIComponent(`/forum/thread/${threadId}`)}`);
      return;
    }

    const authorName =
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Member";

    const { error: insertError } = await supabase.from("forum_posts").insert({
      thread_id: threadId,
      author_id: user.id,
      author_name: authorName,
      body,
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        required
        placeholder="Write a reply…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="rounded-xl2 border border-ink/10 px-4 py-2.5 outline-none focus:border-brand text-sm resize-none"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-xl2 bg-brand text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition"
      >
        {loading ? "Posting…" : "Reply"}
      </button>
    </form>
  );
}
