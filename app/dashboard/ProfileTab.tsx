"use client";

import { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Profile, AcademicEntry, WorkEntry } from "@/lib/types";

function emptyAcademic(): AcademicEntry {
  return { degree: "", field: "", institution: "", start_year: "", end_year: "" };
}
function emptyWork(): WorkEntry {
  return {
    title: "",
    company: "",
    industry: "",
    start_year: "",
    end_year: "",
    is_current: false,
  };
}

export default function ProfileTab({
  userId,
  email,
  emailVerified,
  profile,
  onSaved,
}: {
  userId: string;
  email: string;
  emailVerified: boolean;
  profile: Profile;
  onSaved: (p: Profile) => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [targetScore, setTargetScore] = useState(
    profile.target_score?.toString() ?? ""
  );
  const [targetDate, setTargetDate] = useState(profile.target_test_date ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [academic, setAcademic] = useState<AcademicEntry[]>(
    profile.academic_history
  );
  const [work, setWork] = useState<WorkEntry[]>(profile.work_experience);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateAcademic(i: number, patch: Partial<AcademicEntry>) {
    setAcademic((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function updateWork(i: number, patch: Partial<WorkEntry>) {
    setWork((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const supabase = createBrowserSupabase();

    const cleanAcademic = academic.filter((a) => a.degree || a.institution);
    const cleanWork = work.filter((w) => w.title || w.company);

    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName || null,
        target_score: targetScore ? Number(targetScore) : null,
        target_test_date: targetDate || null,
        phone: phone || null,
        academic_history: cleanAcademic,
        work_experience: cleanWork,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setSaved(true);
    onSaved({
      ...profile,
      full_name: fullName || null,
      target_score: targetScore ? Number(targetScore) : null,
      target_test_date: targetDate || null,
      phone: phone || null,
      academic_history: cleanAcademic,
      work_experience: cleanWork,
    });
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      <section>
        <h2 className="font-bold text-lg mb-1">Contact</h2>
        <p className="text-sm text-ink/60 mb-4">
          Kept verified so we can reach you about your prep and results.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink/50">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl2 border border-ink/10 px-3.5 py-2.5 outline-none focus:border-brand"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink/50">Email</label>
            <div className="mt-1 flex items-center gap-2 rounded-xl2 border border-ink/10 px-3.5 py-2.5 bg-ink/[0.03]">
              <span className="text-sm truncate">{email}</span>
              {emailVerified ? (
                <span className="ml-auto text-xs font-semibold text-emerald-600 shrink-0">
                  Verified
                </span>
              ) : (
                <span className="ml-auto text-xs font-semibold text-amber-600 shrink-0">
                  Unverified
                </span>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-ink/50">Phone number</label>
            <div className="mt-1 flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 rounded-xl2 border border-ink/10 px-3.5 py-2.5 outline-none focus:border-brand"
                placeholder="+91 98765 43210"
              />
              <button
                type="button"
                disabled
                title="Phone verification is coming soon"
                className="rounded-xl2 border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/40 cursor-not-allowed shrink-0"
              >
                Verify
              </button>
            </div>
            <p className="mt-1 text-xs text-ink/40">
              {profile.phone_verified
                ? "Verified."
                : "Verification coming soon — saved for now."}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-1">Target</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-ink/50">Target score</label>
            <input
              type="number"
              min={205}
              max={805}
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="mt-1 w-full rounded-xl2 border border-ink/10 px-3.5 py-2.5 outline-none focus:border-brand"
              placeholder="705"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink/50">
              Target test date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 w-full rounded-xl2 border border-ink/10 px-3.5 py-2.5 outline-none focus:border-brand"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg">Academic background</h2>
          <button
            type="button"
            onClick={() => setAcademic((prev) => [...prev, emptyAcademic()])}
            className="text-sm font-semibold text-brand"
          >
            + Add
          </button>
        </div>
        {academic.length === 0 && (
          <p className="text-sm text-ink/50">No entries yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {academic.map((a, i) => (
            <div
              key={i}
              className="rounded-xl2 border border-ink/10 p-4 grid sm:grid-cols-2 gap-3 relative"
            >
              <input
                value={a.degree}
                onChange={(e) => updateAcademic(i, { degree: e.target.value })}
                placeholder="Degree (e.g. B.Tech)"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={a.field}
                onChange={(e) => updateAcademic(i, { field: e.target.value })}
                placeholder="Field of study"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={a.institution}
                onChange={(e) => updateAcademic(i, { institution: e.target.value })}
                placeholder="Institution"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand sm:col-span-2"
              />
              <input
                value={a.start_year}
                onChange={(e) => updateAcademic(i, { start_year: e.target.value })}
                placeholder="Start year"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={a.end_year}
                onChange={(e) => updateAcademic(i, { end_year: e.target.value })}
                placeholder="End year (or Present)"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() =>
                  setAcademic((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute top-3 right-3 text-xs font-semibold text-danger"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg">Work experience</h2>
          <button
            type="button"
            onClick={() => setWork((prev) => [...prev, emptyWork()])}
            className="text-sm font-semibold text-brand"
          >
            + Add
          </button>
        </div>
        {work.length === 0 && <p className="text-sm text-ink/50">No entries yet.</p>}
        <div className="flex flex-col gap-3">
          {work.map((w, i) => (
            <div
              key={i}
              className="rounded-xl2 border border-ink/10 p-4 grid sm:grid-cols-2 gap-3 relative"
            >
              <input
                value={w.title}
                onChange={(e) => updateWork(i, { title: e.target.value })}
                placeholder="Job title"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={w.company}
                onChange={(e) => updateWork(i, { company: e.target.value })}
                placeholder="Company"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={w.industry}
                onChange={(e) => updateWork(i, { industry: e.target.value })}
                placeholder="Industry"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand sm:col-span-2"
              />
              <input
                value={w.start_year}
                onChange={(e) => updateWork(i, { start_year: e.target.value })}
                placeholder="Start year"
                className="rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <div className="flex items-center gap-2">
                <input
                  value={w.end_year}
                  disabled={w.is_current}
                  onChange={(e) => updateWork(i, { end_year: e.target.value })}
                  placeholder="End year"
                  className="flex-1 rounded-lg border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-40"
                />
                <label className="flex items-center gap-1.5 text-xs text-ink/60 shrink-0">
                  <input
                    type="checkbox"
                    checked={w.is_current}
                    onChange={(e) =>
                      updateWork(i, {
                        is_current: e.target.checked,
                        end_year: e.target.checked ? "" : w.end_year,
                      })
                    }
                  />
                  Current
                </label>
              </div>
              <button
                type="button"
                onClick={() => setWork((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-3 right-3 text-xs font-semibold text-danger"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl2 bg-brand text-white font-semibold px-6 py-3 disabled:opacity-40 active:scale-[0.98] transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved.</span>}
      </div>
    </div>
  );
}
