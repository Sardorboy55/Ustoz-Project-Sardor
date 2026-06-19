"use client";

// Заявки преподавателей: очередь на проверку (pending_review).
// Админ видит анкету, документы, предварительную оценку ИИ, слушает запись
// и решает — Одобрить (создаёт преподавателя) или Отклонить (можно повторить).

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  ClipboardCheck,
  FileText,
  Sparkles,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";

type Application = {
  id: string;
  user_id: string;
  subject_id: string | null;
  status: string;
  full_name: string;
  headline: string;
  bio: string;
  experience_years: number;
  document_urls: string[];
  conversation_id: string | null;
  ai_passed: boolean | null;
  ai_score: number | null;
  ai_summary: string | null;
  recording_url: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  // обогащение
  subjectName: string;
};

const FIELDS =
  "id, user_id, subject_id, status, full_name, headline, bio, experience_years, document_urls, conversation_id, ai_passed, ai_score, ai_summary, recording_url, review_note, reviewed_at, created_at";

async function enrich(rows: Application[]): Promise<Application[]> {
  const supabase = createClient();
  const subjectIds = Array.from(
    new Set(rows.map((r) => r.subject_id).filter(Boolean) as string[]),
  );
  const names = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data } = await supabase
      .from("subjects")
      .select("id, name_ru, name_uz")
      .in("id", subjectIds);
    for (const s of data ?? []) names.set(s.id, s.name_ru || s.name_uz || "");
  }
  return rows.map((r) => ({
    ...r,
    subjectName: r.subject_id ? names.get(r.subject_id) || "—" : "—",
  }));
}

async function fetchByStatus(status: string): Promise<Application[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teacher_applications")
    .select(FIELDS)
    .eq("status", status)
    .order(status === "pending_review" ? "created_at" : "reviewed_at", {
      ascending: status === "pending_review",
    })
    .limit(100);
  if (error) throw error;
  return enrich((data ?? []) as Application[]);
}

// Открыть документ кандидата по подписанной ссылке (бакет приватный).
async function openDoc(path: string, toast: (m: string, t?: "error") => void) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("teacher-docs")
    .createSignedUrl(path, 600);
  if (error || !data?.signedUrl) {
    toast("Не удалось открыть документ.", "error");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener");
}

function scoreTone(n: number): "emerald" | "amber" | "red" {
  if (n >= 70) return "emerald";
  if (n >= 50) return "amber";
  return "red";
}
function scoreLabel(n: number): string {
  if (n >= 85) return "Отлично";
  if (n >= 70) return "Хорошо";
  if (n >= 50) return "Нормально";
  return "Слабо";
}

export default function ApplicationsPage() {
  const toast = useToast();
  const [pending, setPending] = useState<Application[] | null>(null);
  const [resolved, setResolved] = useState<Application[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);

  const [confirm, setConfirm] = useState<{ app: Application; approve: boolean } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const retry = useCallback(() => {
    setError(false);
    setPending(null);
    setResolved(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchByStatus("pending_review"), fetchResolved()])
      .then(([p, r]) => {
        if (cancelled) return;
        setPending(p);
        setResolved(r);
        setError(false);
      })
      .catch((e) => {
        console.error("applications load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const closeConfirm = () => {
    setConfirm(null);
    setNote("");
  };

  const decide = async () => {
    if (!confirm) return;
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.rpc("admin_review_teacher_application", {
      p_application_id: confirm.app.id,
      p_approve: confirm.approve,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (e) {
      console.error("review failed:", e);
      toast("Не удалось сохранить решение. Попробуйте ещё раз.", "error");
      return;
    }
    toast(confirm.approve ? "Заявка одобрена — преподаватель создан" : "Заявка отклонена");
    closeConfirm();
    retry();
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить заявки"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="На проверке">
        {pending === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Заявок на проверке нет"
            text="Новые заявки преподавателей появятся здесь после собеседования."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((app) => (
              <article
                key={app.id}
                className="rounded-2xl border border-zinc-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-900">
                        {app.full_name || "Без имени"}
                      </h3>
                      <Badge tone="sky">{app.subjectName}</Badge>
                      {app.document_urls.length > 0 && (
                        <Badge tone="teal">Профессиональный</Badge>
                      )}
                    </div>
                    {app.headline && (
                      <p className="mt-0.5 text-sm text-zinc-600">{app.headline}</p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs text-zinc-500">
                    {formatDateTime(app.created_at)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-zinc-500">Опыт</dt>
                    <dd className="font-medium text-zinc-900">
                      {app.experience_years} лет
                    </dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-zinc-500">Оценка ИИ</dt>
                    <dd className="font-medium text-zinc-900">
                      {app.ai_score != null ? (
                        <Badge tone={scoreTone(app.ai_score)}>
                          {app.ai_score}/100 · {scoreLabel(app.ai_score)}
                        </Badge>
                      ) : (
                        <span className="text-zinc-400">ещё не оценено</span>
                      )}
                    </dd>
                  </div>
                </dl>

                {app.bio && (
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
                    {app.bio}
                  </p>
                )}

                {app.ai_summary && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-brand-tint/40 p-3 text-sm text-zinc-700">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" aria-hidden />
                    <span>{app.ai_summary}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {app.document_urls.length === 0 ? (
                    <span className="text-sm text-zinc-400">Документы не приложены</span>
                  ) : (
                    app.document_urls.map((path, i) => (
                      <Button
                        key={path}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm"
                        onClick={() => openDoc(path, toast)}
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        Документ {i + 1}
                      </Button>
                    ))
                  )}
                  {app.conversation_id && (
                    <RecordingPlayer conversationId={app.conversation_id} />
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-4">
                  <Button onClick={() => setConfirm({ app, approve: true })}>
                    <Check className="h-4 w-4" aria-hidden />
                    Одобрить
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setConfirm({ app, approve: false })}
                  >
                    <X className="h-4 w-4" aria-hidden />
                    Отклонить
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title="Обработанные">
        {resolved === null ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : resolved.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="Истории пока нет"
            text="Одобренные и отклонённые заявки появятся здесь."
          />
        ) : (
          <div className="space-y-2">
            {resolved.map((app) => (
              <div
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-zinc-900">
                    {app.full_name || "Без имени"}
                  </span>
                  <span className="text-zinc-500">· {app.subjectName}</span>
                </div>
                <div className="flex items-center gap-3">
                  {app.review_note && (
                    <span className="max-w-xs truncate text-zinc-500" title={app.review_note}>
                      {app.review_note}
                    </span>
                  )}
                  <Badge tone={app.status === "approved" ? "emerald" : "red"}>
                    {app.status === "approved" ? "Одобрено" : "Отклонено"}
                  </Badge>
                  <span className="whitespace-nowrap text-zinc-400">
                    {formatDateTime(app.reviewed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirm?.approve ? "Одобрить заявку?" : "Отклонить заявку?"}
        footer={
          <>
            <Button variant="ghost" onClick={closeConfirm}>
              Отмена
            </Button>
            <Button
              variant={confirm?.approve ? "primary" : "danger"}
              loading={busy}
              onClick={decide}
            >
              {confirm?.approve ? "Одобрить" : "Отклонить"}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-3 text-sm">
              <div className="font-medium text-zinc-900">{confirm.app.full_name}</div>
              <p className="text-zinc-600">{confirm.app.subjectName}</p>
            </div>
            {confirm.approve ? (
              <p className="text-sm text-zinc-500">
                Будет создан профиль преподавателя, анкета перенесётся в профиль.
                {confirm.app.document_urls.length > 0
                  ? " Кандидат получит значок «Профессиональный» (документы приложены)."
                  : ""}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">
                Кандидат сможет подготовиться и подать заявку снова. Комментарий
                увидит кандидат.
              </p>
            )}
            <Textarea
              label={confirm.approve ? "Комментарий (необязательно)" : "Причина отказа"}
              placeholder={
                confirm.approve
                  ? "Например: отличные ответы по предмету"
                  : "Например: подтяните темы X и Y, попробуйте снова"
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

// Кнопка «Слушать собеседование» → тянет аудио из Edge Function interview-audio
// (она берёт запись из ElevenLabs по conversation_id с серверным ключом).
function RecordingPlayer({ conversationId }: { conversationId: string }) {
  const toast = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("interview-audio", {
      body: { conversation_id: conversationId },
    });
    setLoading(false);
    if (error || !data) {
      toast("Не удалось загрузить запись (возможно, ещё обрабатывается).", "error");
      return;
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: "audio/mpeg" });
    setUrl(URL.createObjectURL(blob));
  };

  if (url) {
    return <audio controls autoPlay src={url} className="mt-2 w-full max-w-md" />;
  }
  return (
    <Button
      variant="secondary"
      className="px-3 py-1.5 text-sm"
      loading={loading}
      onClick={load}
    >
      🎧 Слушать собеседование
    </Button>
  );
}

async function fetchResolved(): Promise<Application[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teacher_applications")
    .select(FIELDS)
    .in("status", ["approved", "rejected"])
    .order("reviewed_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return enrich((data ?? []) as Application[]);
}

