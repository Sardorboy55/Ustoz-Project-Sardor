"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

/**
 * "Создать профиль" CTA on the become-teacher landing. Guests go to /auth;
 * a logged-in non-teacher goes to the teacher cabinet to set up; a teacher who
 * already has a profile is told so (instead of silently re-entering the flow).
 */
export function BecomeTeacherCta({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [already, setAlready] = useState(false);
  const [failed, setFailed] = useState(false);

  const go = async () => {
    setBusy(true);
    setAlready(false);
    setFailed(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth?next=/cabinet/teacher");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("is_teacher")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.is_teacher) {
      setAlready(true);
      setBusy(false);
      return;
    }
    // Actually create the teacher profile (idempotent: become_teacher inserts
    // teacher_profiles + wallet and flips is_teacher), then drop the user
    // straight into the setup wizard — no second "become a teacher" button.
    const { error } = await supabase.rpc("become_teacher");
    if (error) {
      setBusy(false);
      setFailed(true);
      return;
    }
    router.push("/cabinet/teacher");
  };

  return (
    <div>
      <Button size="lg" loading={busy} onClick={go} className={className}>
        {label}
      </Button>

      {failed && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-200">
          Не удалось создать профиль. Попробуйте ещё раз.
        </p>
      )}

      <Toast open={already} onClose={() => setAlready(false)}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <GraduationCap size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900">Вы уже преподаватель</p>
            <Link
              href="/cabinet/teacher"
              onClick={() => setAlready(false)}
              className="mt-0.5 inline-block font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Открыть кабинет преподавателя
            </Link>
          </div>
        </div>
      </Toast>
    </div>
  );
}
