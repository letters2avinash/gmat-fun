"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"signup" | "login" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createBrowserSupabase();

    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: `${window.location.origin}/auth/reset-password` }
        );
        if (resetError) throw resetError;

        setInfo("If an account exists for that email, we've sent a password reset link.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Create the profile row via a server route (service role key) —
        // when "Confirm email" is on, signUp doesn't grant a session yet,
        // so the browser client isn't authenticated and a direct insert
        // would be rejected by the "own profile" RLS policy.
        if (data.user) {
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.user.id, fullName }),
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
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        // Safety net: ensures a profile row exists even for accounts
        // created before this fix, or if the signup-time call failed.
        if (data.user) {
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.user.id }),
          });
        }
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  function switchMode(next: "signup" | "login" | "forgot") {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "forgot"
      ? "Reset your password"
      : "Welcome back";

  const subtitle =
    mode === "signup"
      ? "Takes 10 seconds. Free to start."
      : mode === "forgot"
      ? "Enter your email and we'll send you a reset link."
      : "Log in to continue your prep.";

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
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
          {mode !== "forgot" && (
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl2 border border-ink/10 px-4 py-3 outline-none focus:border-brand"
            />
          )}

          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="self-end text-sm text-brand font-semibold"
            >
              Forgot password?
            </button>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-ink/70">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl2 bg-brand text-white font-semibold py-3.5 disabled:opacity-40 active:scale-[0.98] transition"
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
              ? "Create account"
              : mode === "forgot"
              ? "Send reset link"
              : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          {mode === "signup" && (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                className="text-brand font-semibold"
              >
                Log in
              </button>
            </>
          )}
          {mode === "login" && (
            <>
              New here?{" "}
              <button
                onClick={() => switchMode("signup")}
                className="text-brand font-semibold"
              >
                Create an account
              </button>
            </>
          )}
          {mode === "forgot" && (
            <>
              Remembered your password?{" "}
              <button
                onClick={() => switchMode("login")}
                className="text-brand font-semibold"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}
