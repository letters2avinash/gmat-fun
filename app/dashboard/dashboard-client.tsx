"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import SiteFooter from "@/components/SiteFooter";
import ProfileTab from "./ProfileTab";
import AttemptsTab from "./AttemptsTab";
import AnalyticsTab from "./AnalyticsTab";
import SupportTab from "./SupportTab";

type Tab = "profile" | "attempts" | "analytics" | "support";

export default function DashboardClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    const supabase = createBrowserSupabase();

    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        router.push("/auth?next=/dashboard");
        return;
      }

      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      setEmailVerified(!!data.user.email_confirmed_at);

      const { data: row } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      setProfile({
        id: data.user.id,
        full_name: row?.full_name ?? null,
        target_score: row?.target_score ?? null,
        target_test_date: row?.target_test_date ?? null,
        phone: row?.phone ?? null,
        phone_verified: row?.phone_verified ?? false,
        academic_history: row?.academic_history ?? [],
        work_experience: row?.work_experience ?? [],
      });
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading || !userId || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink/60 text-sm">
        Loading your dashboard…
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "attempts", label: "Attempts" },
    { key: "analytics", label: "Analytics" },
    { key: "support", label: "Support" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur border-b border-ink/5 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-xl font-extrabold tracking-tight">
          GMAT <span className="text-brand">PREP</span>
        </span>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:inline text-ink/60">{email}</span>
          <button
            onClick={handleLogout}
            className="rounded-xl2 border border-ink/10 px-4 py-2 text-ink font-medium hover:bg-ink/5 transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pb-20">
        <h1 className="text-2xl font-bold mt-6 mb-6">
          {profile.full_name
            ? `Welcome back, ${profile.full_name.split(" ")[0]}`
            : "Your dashboard"}
        </h1>

        <div className="flex gap-2 mb-8 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "rounded-xl2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition " +
                (tab === t.key
                  ? "bg-brand text-white shadow-sm"
                  : "bg-white border border-ink/10 text-ink/60 hover:text-ink hover:border-ink/20")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <ProfileTab
            userId={userId}
            email={email}
            emailVerified={emailVerified}
            profile={profile}
            onSaved={setProfile}
          />
        )}
        {tab === "attempts" && <AttemptsTab userId={userId} />}
        {tab === "analytics" && <AnalyticsTab userId={userId} />}
        {tab === "support" && <SupportTab />}
      </main>

      <SiteFooter />
    </div>
  );
}
