"use client";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  Clock,
  FileText,
  GraduationCap,
  Mic,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useLocale } from "next-intl";
import { type Locale } from "@ustoz/shared";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { localizeContent } from "@/lib/content-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Subject = { id: string; name_uz: string; name_ru: string };
type AppStatus = "interviewing" | "pending_review" | "approved" | "rejected";
type DocFile = { path: string; name: string };
type Application = {
  id: string;
  status: AppStatus;
  subject_id: string | null;
  full_name: string | null;
  headline: string | null;
  bio: string | null;
  experience_years: number | null;
  document_urls: string[] | null;
  review_note: string | null;
};

// The agent id is PUBLIC and safe to ship to the browser. The ElevenLabs API
// KEY must NEVER appear here — it stays server-side (Edge Function secret).
const AGENT_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ??
  "agent_7401kvd53vehfx4vz17gmaac7aw5";
const WIDGET_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed";
const DOCS_BUCKET = "teacher-docs";

type Stage =
  | "loading"
  | "guest"
  | "already_teacher"
  | "anketa"
  | "documents"
  | "interview"
  | "submitted"
  | "approved"
  | "rejected";

const basename = (p: string) => p.split("/").pop() ?? p;

/**
 * AI HR voice-interview gate — единый флоу заявки. Шаги: анкета → документы →
 * собеседование → «Заявка отправлена» (pending_review). Профиль преподавателя
 * создаётся только после одобрения админом. Документы дают бейдж «Профессиональный».
 */
export default function InterviewPage() {
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("loading");
  const [uid, setUid] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [appId, setAppId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Анкета.
  const [form, setForm] = useState({
    full_name: "",
    subject_id: "",
    headline: "",
    bio: "",
    experience: "",
  });
  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Документы.
  const [docs, setDocs] = useState<DocFile[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const subjectName = (s: Subject) =>
    localizeContent(locale, s.name_uz, s.name_ru);
  const currentSubject = subjects.find((s) => s.id === form.subject_id);

  // Загрузка сессии, существующей заявки и списка предметов.
  useEffect(() => {
    const supabase = createClient();
    queueMicrotask(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStage("guest");
        router.push("/auth?next=/become-teacher/interview");
        return;
      }
      setUid(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_teacher, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.is_teacher) {
        setStage("already_teacher");
        return;
      }

      const [{ data: subs }, { data: apps }] = await Promise.all([
        supabase
          .from("subjects")
          .select("id, name_uz, name_ru")
          .eq("is_active", true)
          .order(locale === "ru" ? "name_ru" : "name_uz", { ascending: true }),
        supabase
          .from("teacher_applications")
          .select(
            "id, status, subject_id, full_name, headline, bio, experience_years, document_urls, review_note",
          )
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setSubjects((subs ?? []) as Subject[]);

      const app = (apps ?? [])[0] as Application | undefined;
      if (app) {
        setAppId(app.id);
        setNote(app.review_note);
        setForm({
          full_name: app.full_name || profile?.full_name || "",
          subject_id: app.subject_id ?? "",
          headline: app.headline || "",
          bio: app.bio || "",
          experience: app.experience_years ? String(app.experience_years) : "",
        });
        setDocs((app.document_urls ?? []).map((p) => ({ path: p, name: basename(p) })));
        if (app.status === "pending_review") return setStage("submitted");
        if (app.status === "approved") return setStage("approved");
        if (app.status === "rejected") return setStage("rejected");
        return setStage("anketa"); // interviewing → resume
      }

      setForm((p) => ({ ...p, full_name: profile?.full_name || "" }));
      setStage("anketa");
    });
  }, [locale, router]);

  // Шаг 1 → 2: сохранить анкету, перейти к документам.
  const saveAnketa = async () => {
    if (!form.full_name.trim() || !form.subject_id) {
      setError("Заполните имя и предмет.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc(
      "upsert_teacher_application",
      {
        p_subject_id: form.subject_id,
        p_full_name: form.full_name.trim(),
        p_headline: form.headline.trim(),
        p_bio: form.bio.trim(),
        p_experience_years: Number(form.experience.replace(/\D/g, "")) || 0,
      },
    );
    setBusy(false);
    if (rpcErr) {
      setError(
        rpcErr.message.includes("ALREADY_TEACHER")
          ? "Вы уже преподаватель."
          : "Не удалось сохранить. Попробуйте ещё раз.",
      );
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as Application | null;
    if (row?.id) setAppId(row.id);
    setStage("documents");
  };

  // Загрузка файла документа в Storage (под {uid}/...).
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !uid) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл больше 10 МБ.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${uid}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(DOCS_BUCKET)
      .upload(path, file, { upsert: false });
    setBusy(false);
    if (upErr) {
      setError("Не удалось загрузить файл.");
      return;
    }
    setDocs((p) => [...p, { path, name: file.name }]);
  };

  const removeDoc = async (path: string) => {
    setDocs((p) => p.filter((d) => d.path !== path));
    const supabase = createClient();
    await supabase.storage.from(DOCS_BUCKET).remove([path]);
  };

  // Шаг 2 → 3: сохранить список документов, перейти к собеседованию.
  const saveDocs = async () => {
    if (!appId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc(
      "set_teacher_application_documents",
      { p_application_id: appId, p_document_urls: docs.map((d) => d.path) },
    );
    setBusy(false);
    if (rpcErr) {
      setError("Не удалось сохранить документы.");
      return;
    }
    setStage("interview");
  };

  // Шаг 3 → отправка: собеседование завершено → на проверку.
  const finishInterview = async () => {
    if (!appId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("submit_teacher_application", {
      p_application_id: appId,
      p_conversation_id: null,
    });
    setBusy(false);
    if (rpcErr) {
      setError("Не удалось отправить заявку. Попробуйте ещё раз.");
      return;
    }
    setStage("submitted");
  };

  const retry = () => {
    setNote(null);
    setStage("anketa");
  };

  const stepIndex =
    stage === "anketa" ? 0 : stage === "documents" ? 1 : stage === "interview" ? 2 : -1;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/become-teacher"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Стать преподавателем
      </Link>

      {stepIndex >= 0 && <Stepper current={stepIndex} />}

      {stage === "loading" && (
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      )}

      {stage === "already_teacher" && (
        <ResultCard
          tone="brand"
          icon={GraduationCap}
          title="Вы уже преподаватель"
          body="Профиль преподавателя уже создан — заявку подавать не нужно."
          action={<Button onClick={() => router.push("/cabinet/teacher")}>Открыть кабинет</Button>}
        />
      )}

      {stage === "anketa" && (
        <div>
          <Header
            badge="Шаг 1 из 3 · анкета"
            title="Расскажите о себе"
            subtitle="Заполните анкету будущего преподавателя. Эти данные попадут в ваш профиль после одобрения."
          />
          <Card className="mt-6 space-y-4 p-6">
            <Field label="Имя и фамилия">
              <Input
                value={form.full_name}
                onChange={(e) => setF("full_name", e.target.value)}
                placeholder="Напр. Азиз Каримов"
              />
            </Field>
            <Field label="Какой предмет хотите преподавать?">
              <Select
                value={form.subject_id}
                onChange={(e) => setF("subject_id", e.target.value)}
              >
                <option value="">Выберите предмет…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {subjectName(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Краткое описание">
              <Input
                value={form.headline}
                onChange={(e) => setF("headline", e.target.value)}
                placeholder="Напр. Репетитор по математике, 5 лет опыта"
              />
            </Field>
            <Field label="О себе">
              <textarea
                value={form.bio}
                onChange={(e) => setF("bio", e.target.value)}
                rows={4}
                placeholder="Образование, опыт, подход к занятиям…"
                className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </Field>
            <Field label="Опыт преподавания">
              <Input
                value={form.experience}
                onChange={(e) => setF("experience", e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                suffix="лет"
                placeholder="0"
              />
            </Field>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}
            <Button className="w-full" size="lg" loading={busy} onClick={saveAnketa}>
              Далее — документы
            </Button>
          </Card>
        </div>
      )}

      {stage === "documents" && (
        <div>
          <Header
            badge="Шаг 2 из 3 · документы"
            title="Дипломы и сертификаты"
            subtitle="Загрузите документы, подтверждающие квалификацию — диплом, сертификаты. Это необязательно, но даёт значок «Профессиональный» в каталоге."
          />
          <Card className="mt-6 p-6">
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Upload size={22} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm text-zinc-600">
                PDF или фото, до 10 МБ
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={onPickFile}
                className="hidden"
              />
              <Button
                variant="secondary"
                className="mt-3"
                loading={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Paperclip size={16} aria-hidden="true" />
                Выбрать файл
              </Button>
            </div>

            {docs.length > 0 && (
              <ul className="mt-4 space-y-2">
                {docs.map((d) => (
                  <li
                    key={d.path}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5"
                  >
                    <FileText size={18} className="shrink-0 text-brand-600" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                      {d.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDoc(d.path)}
                      aria-label="Удалить"
                      className="shrink-0 text-zinc-400 transition hover:text-red-600"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {docs.length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
                <BadgeCheck size={18} className="shrink-0" aria-hidden="true" />
                <span>С документами вы получите значок «Профессиональный».</span>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStage("anketa")}
              >
                Назад
              </Button>
              <Button className="flex-1" size="lg" loading={busy} onClick={saveDocs}>
                {docs.length ? "Далее — собеседование" : "Пропустить и продолжить"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {stage === "interview" && (
        <div>
          <Header
            badge="Шаг 3 из 3 · собеседование"
            title="Говорите с ИИ‑рекрутёром"
            subtitle="Нажмите кнопку микрофона и ответьте на вопросы вслух. Когда рекрутёр попрощается — завершите собеседование кнопкой внизу."
          />
          <Card className="mt-6 p-6">
            <ul className="mb-5 space-y-3 text-sm text-zinc-600">
              <Bullet icon={Mic}>Нужен микрофон и тихое место.</Bullet>
              <Bullet icon={Clock}>5–10 минут, без подготовки.</Bullet>
              <Bullet icon={Sparkles}>
                Вопросы — глубоко по предмету
                {currentSubject ? ` «${subjectName(currentSubject)}»` : ""}.
              </Bullet>
              <Bullet icon={ShieldCheck}>Запись послушает наш специалист.</Bullet>
            </ul>

            <InterviewWidget subject={currentSubject ? subjectName(currentSubject) : ""} />

            {error && (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <Button
              className="mt-6 w-full"
              size="lg"
              variant="secondary"
              loading={busy}
              onClick={finishInterview}
            >
              Я завершил собеседование
            </Button>
            <p className="mt-2 text-center text-xs text-zinc-400">
              Нажмите только после того, как разговор закончился.
            </p>
          </Card>
        </div>
      )}

      {stage === "submitted" && (
        <ResultCard
          tone="brand"
          icon={BadgeCheck}
          title="Заявка отправлена"
          body="Спасибо! Мы получили вашу анкету и собеседование. ИИ оценивает ответы, наш специалист прослушает запись. Сообщим о решении — обычно в течение 1–2 дней."
          action={<Button onClick={() => router.push("/cabinet")}>В личный кабинет</Button>}
        />
      )}

      {stage === "approved" && (
        <ResultCard
          tone="brand"
          icon={GraduationCap}
          title="Поздравляем — вы прошли!"
          body="Заявка одобрена, профиль преподавателя открыт. Добавьте предметы и расписание — и начинайте принимать учеников."
          action={<Button onClick={() => router.push("/cabinet/teacher")}>Открыть кабинет преподавателя</Button>}
        />
      )}

      {stage === "rejected" && (
        <ResultCard
          tone="warn"
          icon={RotateCcw}
          title="В этот раз не получилось"
          body={
            note?.trim()
              ? note
              : "К сожалению, заявка не одобрена. Подготовьтесь немного и попробуйте ещё раз — у вас всё получится."
          }
          action={
            <Button onClick={retry}>
              <RotateCcw size={16} aria-hidden="true" />
              Попробовать снова
            </Button>
          }
        />
      )}
    </main>
  );
}

function Stepper({ current }: { current: number }) {
  const steps = ["Анкета", "Документы", "Собеседование"];
  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= current
                  ? "bg-brand-600 text-white"
                  : "bg-zinc-100 text-zinc-400"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`hidden text-sm font-semibold sm:inline ${
                i <= current ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span
              className={`h-0.5 flex-1 rounded ${
                i < current ? "bg-brand-600" : "bg-zinc-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function Header({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        <Sparkles size={13} aria-hidden="true" />
        {badge}
      </span>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{subtitle}</p>
    </div>
  );
}

function Bullet({
  icon: Icon,
  children,
}: {
  icon: typeof Mic;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={14} aria-hidden="true" />
      </span>
      <span>{children}</span>
    </li>
  );
}

function ResultCard({
  tone,
  icon: Icon,
  title,
  body,
  action,
}: {
  tone: "brand" | "warn";
  icon: typeof GraduationCap;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  const ring =
    tone === "brand"
      ? "bg-brand-50 text-brand-600"
      : "bg-amber-50 text-amber-600";
  return (
    <Card className="p-8 text-center">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${ring}`}>
        <Icon size={30} aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-zinc-900">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-600">
        {body}
      </p>
      <div className="mt-6 flex justify-center">{action}</div>
    </Card>
  );
}

/**
 * Embeds the ElevenLabs Conversational AI widget. The subject is chosen in the
 * application form, so the bot must NOT ask for it — we pass it as the
 * {{subject}} dynamic variable. When no agent id is configured yet, a clear
 * placeholder keeps the rest of the flow testable.
 */
function InterviewWidget({ subject }: { subject: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!AGENT_ID || !ref.current) return;
    const vars = JSON.stringify({ subject: subject || "выбранный предмет" });
    ref.current.innerHTML = `<elevenlabs-convai agent-id="${AGENT_ID}" dynamic-variables='${vars}'></elevenlabs-convai>`;
    if (!document.querySelector(`script[src="${WIDGET_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = WIDGET_SRC;
      s.async = true;
      s.type = "text/javascript";
      document.body.appendChild(s);
    }
  }, [subject]);

  if (!AGENT_ID) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Mic size={26} aria-hidden="true" />
        </span>
        <p className="mt-4 font-semibold text-zinc-800">ИИ‑рекрутёр почти готов</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Голосовой агент подключается. Как только настройка завершится,
          собеседование запустится прямо здесь.
        </p>
      </div>
    );
  }

  return <div ref={ref} className="flex min-h-[120px] justify-center" />;
}
