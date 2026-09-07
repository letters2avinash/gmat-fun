"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    // Supabase's client picks up the recovery tokens from the URL hash
    // on load and fires PASSWORD_RECOVERY once that session is set.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">
            gmat<span className="text-brand">.fun</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-ink/60">
            {done
              ? "Password updated. Redirecting…"
              : "Choose a new password for your account."}
          </p>
        </div>

        {!ready && !done && (
          <p className="text-sm text-ink/60 text-center">
            Verifying your reset link…
          </p>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl2 border border-ink/10 px-4 py-3 outline-none focus:border-brand"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-xl2 border border-ink/10 px-4 py-3 outline-none focus:border-brand"
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
            >
              {loading ? "Please wait…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
