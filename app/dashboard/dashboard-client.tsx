"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import SiteHeader from "@/components/SiteHeader";
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
      <SiteHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pb-20">
        <div className="flex items-center justify-between mt-6 mb-6 gap-4">
        <h1 className="text-2xl font-bold">
          {profile.full_name
            ? `Welcome back, ${profile.full_name.split(" ")[0]}`
            : "Your dashboard"}
        </h1>
        <span className="hidden sm:inline text-sm text-ink/40">{email}</span>
        </div>

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
