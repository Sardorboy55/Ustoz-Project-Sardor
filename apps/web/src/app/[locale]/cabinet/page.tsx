"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  phone: string;
  full_name: string;
  is_teacher: boolean;
};

type Subject = { id: string; name_uz: string; name_ru: string };

type TeacherSubject = {
  id: string;
  price_60: number;
  trial_free_enabled: boolean;
  subjects: { name_uz: string; name_ru: string } | null;
};

export default function CabinetPage() {
  const t = useTranslations("Cabinet");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [mine, setMine] = useState<TeacherSubject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [price, setPrice] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p as Profile);
    setName((p as Profile | null)?.full_name ?? "");
    if ((p as Profile | null)?.is_teacher) {
      const { data: ts } = await supabase
        .from("teacher_subjects")
        .select("id, price_60, trial_free_enabled, subjects(name_uz, name_ru)")
        .eq("teacher_id", user.id);
      setMine((ts ?? []) as unknown as TeacherSubject[]);
    }
    const { data: subj } = await supabase
      .from("subjects")
      .select("id, name_uz, name_ru")
      .eq("is_active", true)
      .order("name_uz", { ascending: true });
    setSubjects((subj ?? []) as Subject[]);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    queueMicrotask(() => void load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveName = async () => {
    if (!profile || name.trim().length < 2) return;
    await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
    setMsg(t("saved"));
  };

  const becomeTeacher = async () => {
    const { error } = await supabase.rpc("become_teacher");
    if (!error) await load();
  };

  const addSubject = async () => {
    if (!profile || !subjectId || !price) return;
    setMsg(null);
    const { error } = await supabase.from("teacher_subjects").insert({
      teacher_id: profile.id,
      subject_id: subjectId,
      price_60: Number(price) * 100, // UZS → tiyin
    });
    if (error) {
      setMsg(error.message.includes("SUBJECT_LIMIT") ? t("subjectLimit") : t("error"));
      return;
    }
    setSubjectId("");
    setPrice("");
    await load();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return <main className="p-10 text-zinc-500">{t("loading")}</main>;
  }
  if (!profile) return null;

  const subjectName = (s: { name_uz: string; name_ru: string } | null) =>
    s ? (locale === "ru" ? s.name_ru : s.name_uz) : "";

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <button onClick={signOut} className="text-sm text-zinc-500 hover:text-zinc-800">
          {t("signOut")}
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-500">+{profile.phone}</p>

      {/* name */}
      <section className="mt-8 rounded-2xl border border-zinc-200 p-5">
        <h2 className="font-semibold">{t("nameTitle")}</h2>
        <div className="mt-3 flex gap-2">
          <input
            data-testid="name-input"
            className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 outline-none focus:border-teal-600"
            value={name}
            placeholder={t("namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            data-testid="save-name"
            onClick={saveName}
            className="rounded-xl bg-teal-700 px-5 font-medium text-white disabled:opacity-40"
            disabled={name.trim().length < 2}
          >
            {t("save")}
          </button>
        </div>
      </section>

      {/* teacher */}
      <section className="mt-6 rounded-2xl border border-zinc-200 p-5">
        {!profile.is_teacher ? (
          <>
            <h2 className="font-semibold">{t("becomeTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-600">{t("becomeBody")}</p>
            <button
              data-testid="become-teacher"
              onClick={becomeTeacher}
              className="mt-4 rounded-xl bg-teal-700 px-5 py-2.5 font-medium text-white"
            >
              {t("becomeCta")}
            </button>
          </>
        ) : (
          <>
            <h2 className="font-semibold">{t("subjectsTitle")}</h2>
            <ul className="mt-3 space-y-2">
              {mine.map((tsRow) => (
                <li
                  key={tsRow.id}
                  data-testid="my-subject"
                  className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2.5 text-sm"
                >
                  <span>{subjectName(tsRow.subjects)}</span>
                  <span className="font-medium">
                    {Math.round(tsRow.price_60 / 100).toLocaleString()} UZS / 60{" "}
                    {t("min")}
                  </span>
                </li>
              ))}
              {mine.length === 0 && (
                <li className="text-sm text-zinc-500">{t("noSubjects")}</li>
              )}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                data-testid="subject-select"
                className="min-w-44 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">{t("pickSubject")}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {subjectName(s)}
                  </option>
                ))}
              </select>
              <input
                data-testid="price-input"
                className="w-40 rounded-xl border border-zinc-300 px-3 py-2.5"
                placeholder={t("pricePlaceholder")}
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              />
              <button
                data-testid="add-subject"
                onClick={addSubject}
                disabled={!subjectId || !price}
                className="rounded-xl bg-teal-700 px-5 py-2.5 font-medium text-white disabled:opacity-40"
              >
                {t("add")}
              </button>
            </div>
          </>
        )}
      </section>

      {msg && (
        <p data-testid="cabinet-msg" className="mt-4 text-sm text-teal-700">
          {msg}
        </p>
      )}
    </main>
  );
}
