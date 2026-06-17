"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarClock,
  Check,
  ChevronLeft,
  GraduationCap,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { formatUzs, type Locale } from "@ustoz/shared";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { localizeContent } from "@/lib/content-i18n";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

/**
 * Guided one-page teacher setup (Russian-only for now): profile → lesson → schedule.
 * Each step explains where the value shows up for students, with a live preview
 * of the lesson card. On finish, writes teacher_profiles + teacher_subjects +
 * availability_rules and sends the teacher to their cabinet.
 */

const TOTAL = 3;

const LANGS: { code: string; label: string; flag: string }[] = [
  { code: "uz", label: "Узбекский", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "Английский", flag: "🇬🇧" },
  { code: "kaa", label: "Каракалпакский", flag: "🇺🇿" },
  { code: "tr", label: "Турецкий", flag: "🇹🇷" },
  { code: "ar", label: "Арабский", flag: "🇸🇦" },
  { code: "kk", label: "Казахский", flag: "🇰🇿" },
  { code: "tg", label: "Таджикский", flag: "🇹🇯" },
  { code: "ky", label: "Киргизский", flag: "🇰🇬" },
  { code: "tk", label: "Туркменский", flag: "🇹🇲" },
  { code: "ko", label: "Корейский", flag: "🇰🇷" },
  { code: "zh", label: "Китайский", flag: "🇨🇳" },
  { code: "ja", label: "Японский", flag: "🇯🇵" },
  { code: "de", label: "Немецкий", flag: "🇩🇪" },
  { code: "fr", label: "Французский", flag: "🇫🇷" },
  { code: "es", label: "Испанский", flag: "🇪🇸" },
  { code: "it", label: "Итальянский", flag: "🇮🇹" },
  { code: "fa", label: "Персидский", flag: "🇮🇷" },
  { code: "hi", label: "Хинди", flag: "🇮🇳" },
  { code: "ur", label: "Урду", flag: "🇵🇰" },
];

const WEEKDAYS = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 0, label: "Воскресенье" },
];
const STEPS = Array.from({ length: 49 }, (_, i) => i * 30); // 00:00..24:00, 30-min
const minToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const toTiyin = (s: string): number | null => {
  const n = Number(s.replace(/\D/g, ""));
  return n > 0 ? n * 100 : null;
};
// DB caps discounts at 90% (check constraint), so clamp here too.
const pctInt = (s: string) => Math.min(90, Number(s.replace(/\D/g, "")) || 0);

type Slot = { weekday: number; start_min: number; end_min: number };

type WizardForm = {
  headline: string;
  bio: string;
  experience_years: string;
  teaching_langs: string[];
  subject_id: string;
  price_30: string;
  price_60: string;
  price_90: string;
  pkg5: string;
  pkg10: string;
  pkg20: string;
  trial: boolean;
  trial_discount: string;
  schedule: Slot[];
};

type WizardDraft = {
  f?: Partial<WizardForm>;
  step?: number;
  videoUrl?: string;
};

/** Read a persisted wizard draft from localStorage (null if absent/corrupt). */
function readDraft(key: string): WizardDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as WizardDraft) : null;
  } catch {
    return null;
  }
}

export function TeacherCreateWizard({
  onComplete,
}: {
  onComplete?: () => void;
} = {}) {
  const { userId } = useCabinet();
  const locale = useLocale() as Locale;
  const router = useRouter();

  const DRAFT_KEY = `ustoz:teacher-wizard:${userId}`;
  const draft = useMemo(() => readDraft(DRAFT_KEY), [DRAFT_KEY]);

  const [step, setStep] = useState(() => draft?.step ?? 0);
  const [subjects, setSubjects] = useState<
    { id: string; name_uz: string; name_ru: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState(() => draft?.videoUrl ?? "");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState<WizardForm>(() => ({
    headline: "",
    bio: "",
    experience_years: "",
    teaching_langs: [],
    subject_id: "",
    price_30: "",
    price_60: "",
    price_90: "",
    pkg5: "",
    pkg10: "",
    pkg20: "",
    trial: false,
    trial_discount: "",
    schedule: [],
    ...draft?.f,
  }));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const [langOpen, setLangOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");

  // Save the draft on every change so a refresh or navigating away does not wipe
  // it; it is restored through the lazy useState initializers above. Fixes the
  // "everything resets, have to fill the form again" problem.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ f, step, videoUrl }));
    } catch {
      /* private mode / quota — ignore */
    }
  }, [f, step, videoUrl, DRAFT_KEY]);

  // add-slot form
  const [sWeekday, setSWeekday] = useState(1);
  const [sStart, setSStart] = useState(9 * 60);
  const [sEnd, setSEnd] = useState(18 * 60);

  useEffect(() => {
    const supabase = createClient();
    queueMicrotask(async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, name_uz, name_ru")
        .eq("is_active", true)
        .order(locale === "ru" ? "name_ru" : "name_uz", { ascending: true });
      setSubjects((data ?? []) as typeof subjects);
    });
  }, [locale]);

  const subjectName = (s: { name_uz: string; name_ru: string }) =>
    localizeContent(locale, s.name_uz, s.name_ru);
  const chosenSubject = subjects.find((s) => s.id === f.subject_id);

  const toggleLang = (code: string) =>
    set(
      "teaching_langs",
      f.teaching_langs.includes(code)
        ? f.teaching_langs.filter((c) => c !== code)
        : [...f.teaching_langs, code],
    );

  const step0ok = Boolean(f.headline.trim()) && f.teaching_langs.length > 0;
  const step1ok = Boolean(f.subject_id) && Boolean(toTiyin(f.price_60));

  const next = () => setStep((s) => Math.min(TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const addSlot = () => {
    if (sStart >= sEnd) return;
    set("schedule", [
      ...f.schedule,
      { weekday: sWeekday, start_min: sStart, end_min: sEnd },
    ]);
  };

  const uploadVideo = async (file: File) => {
    setUploadingVideo(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${userId}/intro.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("intro-videos")
        .upload(path, file, {
          contentType: file.type || "video/mp4",
          upsert: true,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("intro-videos").getPublicUrl(path);
      setVideoUrl(`${data.publicUrl}?v=${Date.now()}`);
    } catch {
      setError("Не удалось загрузить видео. Попробуйте другой файл.");
    } finally {
      setUploadingVideo(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    // Make sure the teacher_profiles row exists (idempotent) — otherwise the
    // update below silently matches 0 rows and the profile data is lost.
    const { error: btErr } = await supabase.rpc("become_teacher");
    if (btErr) {
      setSaving(false);
      setError(`Не удалось создать профиль: ${btErr.message}`);
      return;
    }

    const headline = f.headline.trim();
    const bio = f.bio.trim();
    const { error: pErr } = await supabase
      .from("teacher_profiles")
      .update({
        headline_ru: headline,
        headline_uz: headline,
        bio_ru: bio,
        bio_uz: bio,
        experience_years: Math.min(
          80,
          Number(f.experience_years.replace(/\D/g, "")) || 0,
        ),
        teaching_langs: f.teaching_langs,
        ...(videoUrl ? { intro_video_url: videoUrl } : {}),
      })
      .eq("user_id", userId);
    if (pErr) {
      setSaving(false);
      setError(`Не удалось сохранить профиль: ${pErr.message}`);
      return;
    }

    const { error: sErr } = await supabase.from("teacher_subjects").insert({
      teacher_id: userId,
      subject_id: f.subject_id,
      price_30: toTiyin(f.price_30),
      price_60: toTiyin(f.price_60),
      price_90: toTiyin(f.price_90),
      pkg5_discount_pct: pctInt(f.pkg5),
      pkg10_discount_pct: pctInt(f.pkg10),
      pkg20_discount_pct: pctInt(f.pkg20),
      trial_free_enabled: f.trial,
      trial_discount_pct: pctInt(f.trial_discount),
    });
    if (sErr) {
      setSaving(false);
      setError("Не удалось сохранить урок. Возможно, такой предмет уже добавлен.");
      return;
    }

    if (f.schedule.length > 0) {
      const { error: aErr } = await supabase.from("availability_rules").insert(
        f.schedule.map((w) => ({
          teacher_id: userId,
          weekday: w.weekday,
          start_min: w.start_min,
          end_min: w.end_min,
        })),
      );
      if (aErr) {
        setSaving(false);
        setError("Не удалось сохранить расписание. Попробуйте ещё раз.");
        return;
      }
    }

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }

    if (onComplete) {
      onComplete();
      return;
    }
    router.push("/cabinet/teacher");
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          aria-label="Назад"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600 disabled:invisible"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium text-zinc-400">
          {step + 1}/{TOTAL}
        </span>
      </div>

      <div className="mt-6">
        {/* Step 1 — profile */}
        {step === 0 && (
          <section>
            <StepHead
              icon={GraduationCap}
              title="Расскажите о себе"
              body="Это видят ученики на вашей карточке и странице."
            />
            <div className="mt-5 space-y-4">
              {/* Видео-презентация — в самом верху */}
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  Видео-презентация
                </p>
                <p className="text-xs text-zinc-400">
                  Короткое видео о себе повышает доверие. Необязательно.
                </p>
                {videoUrl ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <video
                      src={videoUrl}
                      controls
                      preload="metadata"
                      className="h-28 w-48 rounded-xl bg-zinc-900 object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={uploadingVideo}
                      onClick={() => videoRef.current?.click()}
                    >
                      {!uploadingVideo && <Video size={15} aria-hidden="true" />}
                      Заменить видео
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoRef.current?.click()}
                    disabled={uploadingVideo}
                    className="mt-2 flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                      <Video size={24} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-zinc-800">
                      {uploadingVideo
                        ? "Загрузка…"
                        : "Загрузить видео-презентацию"}
                    </span>
                    <span className="text-xs text-zinc-400">
                      MP4, до 1–2 минут. Нажмите, чтобы выбрать файл.
                    </span>
                  </button>
                )}
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadVideo(file);
                  }}
                />
              </div>
              <Input
                label="Заголовок профиля"
                helper="Крупная строка на карточке. Напр.: «IELTS 8.5 · Английский, 7 лет опыта»"
                value={f.headline}
                maxLength={120}
                onChange={(e) => set("headline", e.target.value)}
              />
              <Textarea
                label="О себе"
                helper="Опыт и подход — это читают на вашей странице."
                rows={4}
                maxLength={1000}
                value={f.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
              <Input
                label="Опыт (лет)"
                helper="Полных лет преподавания, до 80."
                inputMode="numeric"
                value={f.experience_years}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, "");
                  set(
                    "experience_years",
                    n === "" ? "" : String(Math.min(80, Number(n))),
                  );
                }}
                wrapperClassName="sm:max-w-40"
              />
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  Языки преподавания
                </p>
                <p className="text-xs text-zinc-400">
                  На каких языках вы ведёте уроки. Показываются тегами на карточке.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {f.teaching_langs.map((code) => {
                    const l = LANGS.find((x) => x.code === code);
                    if (!l) return null;
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-600 bg-brand-50 py-1.5 pl-3 pr-1.5 text-sm font-medium text-brand-700"
                      >
                        <span aria-hidden="true">{l.flag}</span>
                        {l.label}
                        <button
                          type="button"
                          aria-label={`Убрать ${l.label}`}
                          onClick={() => toggleLang(code)}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-brand-500 transition hover:bg-brand-100 hover:text-brand-700"
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setLangOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3.5 py-1.5 text-sm font-medium text-zinc-600 outline-none transition hover:border-brand-400 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600"
                  >
                    <Plus size={15} aria-hidden="true" />
                    {f.teaching_langs.length ? "Добавить язык" : "Выбрать языки"}
                  </button>
                </div>
              </div>
            </div>
            <Footer>
              <Button size="lg" disabled={!step0ok} onClick={next}>
                Далее
              </Button>
            </Footer>
          </section>
        )}

        {/* Step 2 — lesson */}
        {step === 1 && (
          <section>
            <StepHead
              icon={BookOpen}
              title="Создайте урок"
              body="Предмет, цены и условия. Справа — как урок увидят ученики."
            />
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Select
                  label="Предмет"
                  value={f.subject_id}
                  onChange={(e) => set("subject_id", e.target.value)}
                >
                  <option value="">— выберите предмет —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {subjectName(s)}
                    </option>
                  ))}
                </Select>

                <div>
                  <p className="text-sm font-medium text-zinc-700">
                    Цены по длительности
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <Input
                      label="30 мин"
                      helper="необяз."
                      inputMode="numeric"
                      value={f.price_30}
                      onChange={(e) => set("price_30", e.target.value.replace(/\D/g, ""))}
                    />
                    <Input
                      label="60 мин"
                      inputMode="numeric"
                      value={f.price_60}
                      onChange={(e) => set("price_60", e.target.value.replace(/\D/g, ""))}
                    />
                    <Input
                      label="90 мин"
                      helper="необяз."
                      inputMode="numeric"
                      value={f.price_90}
                      onChange={(e) => set("price_90", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-700">
                    Скидки на пакеты{" "}
                    <span className="font-normal text-zinc-400">(%, необяз.)</span>
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <Input label="5 уроков" helper="%" inputMode="numeric" value={f.pkg5} onChange={(e) => set("pkg5", e.target.value.replace(/\D/g, ""))} />
                    <Input label="10 уроков" helper="%" inputMode="numeric" value={f.pkg10} onChange={(e) => set("pkg10", e.target.value.replace(/\D/g, ""))} />
                    <Input label="20 уроков" helper="%" inputMode="numeric" value={f.pkg20} onChange={(e) => set("pkg20", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-700">Пробный урок</p>
                  <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={f.trial}
                      onChange={(e) => set("trial", e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 accent-brand-600"
                    />
                    Предлагать бесплатный пробный урок
                  </label>
                  <div className="mt-2 max-w-44">
                    <Input
                      label="Скидка на первый урок"
                      helper="% (если без бесплатного)"
                      inputMode="numeric"
                      value={f.trial_discount}
                      onChange={(e) => set("trial_discount", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Так увидят ученики
                </p>
                <div className="mt-2">
                  <PreviewCard
                    subjectName={chosenSubject ? subjectName(chosenSubject) : ""}
                    p30={toTiyin(f.price_30)}
                    p60={toTiyin(f.price_60)}
                    p90={toTiyin(f.price_90)}
                    trial={f.trial}
                    trialDiscount={pctInt(f.trial_discount)}
                    pkg5={pctInt(f.pkg5)}
                    pkg10={pctInt(f.pkg10)}
                    pkg20={pctInt(f.pkg20)}
                    locale={locale}
                  />
                </div>
              </div>
            </div>
            <Footer>
              <Button size="lg" disabled={!step1ok} onClick={next}>
                Далее
              </Button>
            </Footer>
          </section>
        )}

        {/* Step 3 — schedule */}
        {step === 2 && (
          <section>
            <StepHead
              icon={CalendarClock}
              title="Когда вы доступны"
              body="В эти окна ученики смогут бронировать уроки. Можно изменить позже."
            />
            <Card className="mt-5 p-5">
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label="День"
                  value={String(sWeekday)}
                  onChange={(e) => setSWeekday(Number(e.target.value))}
                  wrapperClassName="min-w-40"
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="С"
                  value={String(sStart)}
                  onChange={(e) => setSStart(Number(e.target.value))}
                  wrapperClassName="w-28"
                >
                  {STEPS.map((m) => (
                    <option key={m} value={m}>
                      {minToTime(m)}
                    </option>
                  ))}
                </Select>
                <Select
                  label="До"
                  value={String(sEnd)}
                  onChange={(e) => setSEnd(Number(e.target.value))}
                  wrapperClassName="w-28"
                >
                  {STEPS.map((m) => (
                    <option key={m} value={m}>
                      {minToTime(m)}
                    </option>
                  ))}
                </Select>
                <Button onClick={addSlot} disabled={sStart >= sEnd}>
                  <Plus size={16} aria-hidden="true" />
                  Добавить
                </Button>
              </div>
            </Card>

            {f.schedule.length > 0 && (
              <ul className="mt-3 space-y-2">
                {f.schedule.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-zinc-800">
                      {WEEKDAYS.find((d) => d.value === w.weekday)?.label} ·{" "}
                      {minToTime(w.start_min)}–{minToTime(w.end_min)}
                    </span>
                    <button
                      type="button"
                      aria-label="Удалить"
                      onClick={() =>
                        set(
                          "schedule",
                          f.schedule.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-zinc-400 transition hover:text-red-500"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-zinc-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Проверьте перед публикацией
              </p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <PreviewCard
                  subjectName={chosenSubject ? subjectName(chosenSubject) : ""}
                  p30={toTiyin(f.price_30)}
                  p60={toTiyin(f.price_60)}
                  p90={toTiyin(f.price_90)}
                  trial={f.trial}
                  trialDiscount={pctInt(f.trial_discount)}
                  pkg5={pctInt(f.pkg5)}
                  pkg10={pctInt(f.pkg10)}
                  pkg20={pctInt(f.pkg20)}
                  locale={locale}
                />
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm">
                  <p className="font-bold text-zinc-900">
                    {f.headline || "Заголовок не указан"}
                  </p>
                  <div className="mt-2 space-y-1 text-zinc-500">
                    <p>Опыт: {Number(f.experience_years) || 0} лет</p>
                    <p>
                      Языки:{" "}
                      {f.teaching_langs
                        .map((c) => LANGS.find((l) => l.code === c)?.label)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                    <p>Окон расписания: {f.schedule.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error}
              </p>
            )}

            <Footer>
              <Button size="lg" loading={saving} onClick={finish}>
                <Check size={18} aria-hidden="true" />
                Опубликовать профиль
              </Button>
            </Footer>
          </section>
        )}
      </div>

      {/* Language picker — dimmed backdrop, search, flags (Modal handles the overlay) */}
      <Modal
        open={langOpen}
        onClose={() => setLangOpen(false)}
        title="Языки преподавания"
        size="lg"
      >
        <div className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={langQuery}
            onChange={(e) => setLangQuery(e.target.value)}
            placeholder="Поиск языка…"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <ul className="mt-3 max-h-[50dvh] space-y-1 overflow-y-auto">
          {LANGS.filter((l) =>
            l.label.toLowerCase().includes(langQuery.trim().toLowerCase()),
          ).map((l) => {
            const active = f.teaching_langs.includes(l.code);
            return (
              <li key={l.code}>
                <button
                  type="button"
                  onClick={() => toggleLang(l.code)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                    active
                      ? "border-brand-600 bg-brand-50"
                      : "border-transparent hover:bg-zinc-50",
                  )}
                >
                  <span className="text-lg" aria-hidden="true">
                    {l.flag}
                  </span>
                  <span className="flex-1 font-medium text-zinc-800">
                    {l.label}
                  </span>
                  {active && (
                    <Check
                      size={17}
                      className="text-brand-600"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
          {LANGS.filter((l) =>
            l.label.toLowerCase().includes(langQuery.trim().toLowerCase()),
          ).length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-zinc-400">
              Ничего не найдено
            </li>
          )}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setLangOpen(false)}>Готово</Button>
        </div>
      </Modal>
    </main>
  );
}

function StepHead({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof GraduationCap;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={22} aria-hidden="true" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{body}</p>
      </div>
    </div>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-8 flex justify-end">{children}</div>;
}

function PreviewCard({
  subjectName,
  p30,
  p60,
  p90,
  trial,
  trialDiscount,
  pkg5,
  pkg10,
  pkg20,
  locale,
}: {
  subjectName: string;
  p30: number | null;
  p60: number | null;
  p90: number | null;
  trial: boolean;
  trialDiscount: number;
  pkg5: number;
  pkg10: number;
  pkg20: number;
  locale: Locale;
}) {
  const durations = [
    { min: 30, tiyin: p30 },
    { min: 60, tiyin: p60 },
    { min: 90, tiyin: p90 },
  ].filter((d): d is { min: number; tiyin: number } => (d.tiyin ?? 0) > 0);
  const pkgs = [
    { n: 5, pct: pkg5 },
    { n: 10, pct: pkg10 },
    { n: 20, pct: pkg20 },
  ].filter((p) => p.pct > 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-base font-bold text-zinc-900">
        {subjectName || "Предмет"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {durations.length === 0 ? (
          <span className="text-sm text-zinc-400">Укажите цену за 60 мин</span>
        ) : (
          durations.map((d) => (
            <span
              key={d.min}
              className="rounded-lg bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500"
            >
              {d.min} мин{" "}
              <span className="font-bold text-zinc-900">
                {formatUzs(d.tiyin, locale)} сум
              </span>
            </span>
          ))
        )}
      </div>
      {(trial || trialDiscount > 0 || pkgs.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {trial ? (
            <span className="font-medium text-brand-700">
              Бесплатный пробный урок
            </span>
          ) : (
            trialDiscount > 0 && (
              <span className="font-medium text-brand-700">
                −{trialDiscount}% на первый урок
              </span>
            )
          )}
          {pkgs.length > 0 && <span className="text-zinc-400">Пакеты:</span>}
          {pkgs.map((p) => (
            <span
              key={p.n}
              className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700"
            >
              {p.n} уроков −{p.pct}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
