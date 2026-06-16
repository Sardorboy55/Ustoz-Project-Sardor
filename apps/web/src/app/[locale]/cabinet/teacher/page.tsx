"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCabinet } from "@/components/cabinet/cabinet-shell";
import { TeacherCreateWizard } from "@/components/teacher/teacher-create-wizard";
import { TeacherDashboard } from "./teacher-dashboard";
import { TeacherAnketa } from "./teacher-anketa";
import { TeacherSubjects } from "./teacher-subjects";
import { TeacherSchedule } from "./teacher-schedule";
import { TeacherWallet } from "./teacher-wallet";
import { TeacherReviews } from "./teacher-reviews";

const TABS = [
  "dashboard",
  "anketa",
  "subjects",
  "schedule",
  "wallet",
  "reviews",
] as const;
type TabKey = (typeof TABS)[number];

const TAB_LABEL: Record<TabKey, string> = {
  dashboard: "tabDashboard",
  anketa: "tabAnketa",
  subjects: "tabSubjects",
  schedule: "tabSchedule",
  wallet: "tabWallet",
  reviews: "tabReviews",
};

export default function TeacherCabinetPage() {
  const t = useTranslations("Cabinet.teacher");
  const { profile, userId, refreshProfile } = useCabinet();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [hasLessons, setHasLessons] = useState<boolean | null>(null);
  const [slug, setSlug] = useState<string | null>(null);

  const checkSetup = useCallback(async () => {
    const supabase = createClient();
    const [{ count }, { data: prof }] = await Promise.all([
      supabase
        .from("teacher_subjects")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", userId),
      supabase
        .from("teacher_profiles")
        .select("slug")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    setHasLessons((count ?? 0) > 0);
    setSlug((prof?.slug as string | null) ?? null);
  }, [userId]);

  useEffect(() => {
    if (profile.is_teacher) queueMicrotask(() => void checkSetup());
  }, [profile.is_teacher, checkSetup]);

  if (!profile.is_teacher) {
    return <BecomeTeacherCard onDone={refreshProfile} />;
  }

  if (hasLessons === null) {
    return <Skeleton className="h-96 rounded-2xl" />;
  }

  // First-time setup: the guided "Расскажите о себе" wizard opens right away —
  // no duplicate Анкета tab. Once a lesson exists, the management tabs appear.
  if (!hasLessons) {
    return <TeacherCreateWizard onComplete={checkSetup} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {t("title")}
      </h1>

      {slug && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-1.5 font-medium text-emerald-800">
            <CheckCircle2 size={16} aria-hidden="true" />
            {t("liveInCatalog")}
          </span>
          <Link
            href={`/t/${slug}`}
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            {t("viewProfile")}
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>
      )}

      <div
        role="tablist"
        aria-label={t("title")}
        className="mt-4 flex gap-5 overflow-x-auto border-b border-zinc-200 [scrollbar-width:none]"
      >
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
              tab === key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
            )}
          >
            {t(TAB_LABEL[key])}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "dashboard" && <TeacherDashboard />}
        {tab === "anketa" && <TeacherAnketa />}
        {tab === "subjects" && <TeacherSubjects />}
        {tab === "schedule" && <TeacherSchedule />}
        {tab === "wallet" && <TeacherWallet />}
        {tab === "reviews" && <TeacherReviews />}
      </div>
    </div>
  );
}

/** Landing card for students: one click away from a teacher profile. */
function BecomeTeacherCard({ onDone }: { onDone: () => Promise<void> }) {
  const t = useTranslations("Cabinet.teacher");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const become = async () => {
    setBusy(true);
    setFailed(false);
    const supabase = createClient();
    const { error } = await supabase.rpc("become_teacher");
    if (error) {
      setBusy(false);
      setFailed(true);
      return;
    }
    await onDone();
    setBusy(false);
  };

  return (
    <div className="flex flex-col items-start rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 py-10">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <GraduationCap size={30} aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
        {t("becomeTitle")}
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
        {t("becomeBody")}
      </p>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t("becomeError")}
        </p>
      )}
      <Button size="lg" loading={busy} onClick={become} className="mt-6">
        {t("becomeCta")}
      </Button>
    </div>
  );
}
