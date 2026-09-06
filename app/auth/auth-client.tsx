"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createBrowserSupabase();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Supabase Auth may require email confirmation before a session
        // exists — only create the profile row once we actually have a user.
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName || null,
          });
        }

        if (!data.session) {
          setError(
            "Check your email to confirm your account, then log in."
          );
          setMode("login");
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword(
          { email, password }
        );
        if (signInError) throw signInError;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-tight">
            gmat<span className="text-brand">.fun</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {mode === "signup"
              ? "Takes 10 seconds. Free to start."
              : "Log in to continue your prep."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl2 border border-ink/10 px-4 py-3 outline-none focus:border-brand"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl2 border border-ink/10 px-4 py-3 outline-none focus:border-brand"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl2 border border-ink/10 px-4 py-3 outline-none focus:border-brand"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-brand font-semibold"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-brand font-semibold"
              >
                Create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
