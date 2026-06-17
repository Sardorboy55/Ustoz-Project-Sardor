"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Image as ImageIcon, Plus, Search, Trash2, Video, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCabinet } from "@/components/cabinet/cabinet-shell";
import { TeacherFaqEditor } from "@/components/cabinet/teacher-faq-editor";

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

type AnketaForm = {
  headline_uz: string;
  headline_ru: string;
  bio_uz: string;
  bio_ru: string;
  experience_years: number;
  teaching_langs: string[];
  intro_video_url: string | null;
  intro_video_poster_url: string | null;
};

export function TeacherAnketa() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const { userId } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [form, setForm] = useState<AnketaForm | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const videoRef = useRef<HTMLInputElement>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  const coverRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [deletingCover, setDeletingCover] = useState(false);

  const [langOpen, setLangOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("teacher_profiles")
      .select(
        "headline_uz, headline_ru, bio_uz, bio_ru, experience_years, teaching_langs, intro_video_url, intro_video_poster_url",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) {
      setPhase("error");
      return;
    }
    setForm(data as AnketaForm);
    setPhase("ready");
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const patch = (p: Partial<AnketaForm>) => {
    setForm((prev) => (prev ? { ...prev, ...p } : prev));
    setSaveState("idle");
  };

  const toggleLang = (code: string) => {
    if (!form) return;
    const has = form.teaching_langs.includes(code);
    const next = has
      ? form.teaching_langs.filter((c) => c !== code)
      : [...form.teaching_langs, code];
    if (next.length === 0) return; // at least one teaching language
    patch({ teaching_langs: next });
  };

  const uploadVideo = async (file: File) => {
    setUploadingVideo(true);
    setUploadFailed(false);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `${userId}/intro.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("intro-videos")
        .upload(path, file, { contentType: file.type || "video/mp4", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("intro-videos").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ intro_video_url: url })
        .eq("user_id", userId);
      if (error) throw error;
      patch({ intro_video_url: url });
    } catch {
      setUploadFailed(true);
    } finally {
      setUploadingVideo(false);
      if (videoRef.current) videoRef.current.value = "";
    }
  };

  const deleteVideo = async () => {
    if (!form?.intro_video_url) return;
    setDeletingVideo(true);
    setUploadFailed(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("teacher_profiles")
      .update({ intro_video_url: null })
      .eq("user_id", userId);
    setDeletingVideo(false);
    if (error) {
      setUploadFailed(true);
      return;
    }
    patch({ intro_video_url: null });
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    setUploadFailed(false);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/cover.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("intro-videos")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("intro-videos").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase
        .from("teacher_profiles")
        .update({ intro_video_poster_url: url })
        .eq("user_id", userId);
      if (error) throw error;
      patch({ intro_video_poster_url: url });
    } catch {
      setUploadFailed(true);
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  const deleteCover = async () => {
    if (!form?.intro_video_poster_url) return;
    setDeletingCover(true);
    setUploadFailed(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("teacher_profiles")
      .update({ intro_video_poster_url: null })
      .eq("user_id", userId);
    setDeletingCover(false);
    if (error) {
      setUploadFailed(true);
      return;
    }
    patch({ intro_video_poster_url: null });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setSaveState("idle");
    const supabase = createClient();
    const { error } = await supabase
      .from("teacher_profiles")
      .update({
        headline_uz: form.headline_uz.trim(),
        headline_ru: form.headline_ru.trim(),
        bio_uz: form.bio_uz.trim(),
        bio_ru: form.bio_ru.trim(),
        experience_years: form.experience_years,
        teaching_langs: form.teaching_langs,
      })
      .eq("user_id", userId);
    setSaving(false);
    setSaveState(error ? "error" : "saved");
  };

  if (phase === "loading") {
    return (
      <div aria-busy="true" className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (phase === "error" || !form) {
    return <ErrorState description={tCommon("loadError")} onRetry={() => void load()} />;
  }

  const filteredLangs = LANGS.filter((l) =>
    l.label.toLowerCase().includes(langQuery.trim().toLowerCase()),
  );

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">{t("anketaTitle")}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{t("anketaSubtitle")}</p>
      </div>

      {/* Video presentation — upload box, replace and delete */}
      <Card className="p-5">
        <p className="text-sm font-medium text-zinc-700">{t("video")}</p>
        <p className="text-xs text-zinc-400">{t("videoNote")}</p>
        <p className="mt-1 text-xs text-zinc-400">
          📐 Горизонтально, 16:9 (например 1280×720 или 1920×1080) — так видео и
          обложка ровно показываются и на телефоне, и на компьютере, без обрезки.
        </p>

        {form.intro_video_url ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <video
              src={form.intro_video_url}
              controls
              preload="metadata"
              className="h-28 w-48 rounded-xl bg-zinc-900 object-cover"
            />
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={uploadingVideo || deletingVideo}
                loading={uploadingVideo}
                onClick={() => videoRef.current?.click()}
              >
                {!uploadingVideo && <Video size={15} aria-hidden="true" />}
                {t("videoUpload")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                loading={deletingVideo}
                disabled={uploadingVideo}
                onClick={deleteVideo}
                className="text-red-600 hover:bg-red-50 active:bg-red-100"
              >
                {!deletingVideo && <Trash2 size={15} aria-hidden="true" />}
                Удалить видео
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoRef.current?.click()}
            disabled={uploadingVideo}
            className="mt-3 flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <Video size={24} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-zinc-800">
              {uploadingVideo ? "Загрузка…" : "Загрузить видео-презентацию"}
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
          aria-label={t("videoUpload")}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadVideo(f);
          }}
        />

        {/* Cover image (poster) for the video */}
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <p className="text-sm font-medium text-zinc-700">Обложка видео</p>
          <p className="text-xs text-zinc-400">
            Картинка-превью до запуска видео. Если не загрузить — покажем ваше
            фото профиля.
          </p>
          {form.intro_video_poster_url ? (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.intro_video_poster_url}
                alt=""
                className="h-28 w-48 rounded-xl object-cover ring-1 ring-zinc-200"
              />
              <div className="flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploadingCover}
                  disabled={deletingCover}
                  onClick={() => coverRef.current?.click()}
                >
                  {!uploadingCover && <ImageIcon size={15} aria-hidden="true" />}
                  Заменить обложку
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={deletingCover}
                  disabled={uploadingCover}
                  onClick={deleteCover}
                  className="text-red-600 hover:bg-red-50 active:bg-red-100"
                >
                  {!deletingCover && <Trash2 size={15} aria-hidden="true" />}
                  Удалить
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploadingCover}
              className="mt-3 flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <ImageIcon size={24} aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-zinc-800">
                {uploadingCover ? "Загрузка…" : "Загрузить обложку"}
              </span>
              <span className="text-xs text-zinc-400">
                JPG или PNG, 16:9 (например 1280×720).
              </span>
            </button>
          )}
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Обложка видео"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadCover(f);
            }}
          />
        </div>

        {uploadFailed && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t("uploadError")}
          </p>
        )}
      </Card>

      {/* Texts */}
      <Card className="space-y-4 p-5">
        <Input
          label="Заголовок профиля"
          helper="Крупная строка на карточке. Напр.: «IELTS 8.5 · Английский, 7 лет опыта»"
          value={form.headline_ru}
          maxLength={120}
          onChange={(e) =>
            patch({ headline_ru: e.target.value, headline_uz: e.target.value })
          }
        />
        <Textarea
          label="О себе"
          helper="Опыт и подход — это читают на вашей странице."
          rows={4}
          maxLength={2000}
          value={form.bio_ru}
          onChange={(e) =>
            patch({ bio_ru: e.target.value, bio_uz: e.target.value })
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("experience")}
            type="number"
            min={0}
            max={80}
            inputMode="numeric"
            value={String(form.experience_years)}
            onChange={(e) =>
              patch({
                experience_years: Math.max(
                  0,
                  Math.min(80, Number(e.target.value.replace(/\D/g, "")) || 0),
                ),
              })
            }
          />
          <div>
            <p className="mb-1.5 block text-sm font-medium text-zinc-700">
              {t("langs")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {form.teaching_langs.map((code) => {
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
                {form.teaching_langs.length ? "Добавить язык" : "Выбрать языки"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button loading={saving} onClick={save}>
            {t("save")}
          </Button>
          {saveState === "saved" && (
            <span className="text-sm font-medium text-brand-700">{t("saved")}</span>
          )}
          {saveState === "error" && (
            <span role="alert" className="text-sm text-red-600">
              {t("saveError")}
            </span>
          )}
        </div>
      </Card>

      <TeacherFaqEditor />

      {/* Language picker — dimmed backdrop, search, flags */}
      <Modal
        open={langOpen}
        onClose={() => setLangOpen(false)}
        title={t("langs")}
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
          {filteredLangs.map((l) => {
            const active = form.teaching_langs.includes(l.code);
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
                    <Check size={17} className="text-brand-600" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
          {filteredLangs.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-zinc-400">
              Ничего не найдено
            </li>
          )}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setLangOpen(false)}>Готово</Button>
        </div>
      </Modal>
    </div>
  );
}
