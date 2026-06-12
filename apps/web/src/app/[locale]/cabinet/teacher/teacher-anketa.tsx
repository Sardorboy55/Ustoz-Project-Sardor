"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

const LANG_CODES = ["uz", "ru", "en", "kaa", "tr", "ar"] as const;

type AnketaForm = {
  headline_uz: string;
  headline_ru: string;
  bio_uz: string;
  bio_ru: string;
  experience_years: number;
  teaching_langs: string[];
  intro_video_url: string | null;
};

export function TeacherAnketa() {
  const t = useTranslations("Cabinet.teacher");
  const tCommon = useTranslations("Cabinet.common");
  const tLangs = useTranslations("TeacherCard.langs");
  const { userId, profile, refreshProfile } = useCabinet();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [form, setForm] = useState<AnketaForm | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("teacher_profiles")
      .select(
        "headline_uz, headline_ru, bio_uz, bio_ru, experience_years, teaching_langs, intro_video_url",
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

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    setUploadFailed(false);
    try {
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (error) throw error;
      await refreshProfile();
    } catch {
      setUploadFailed(true);
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = "";
    }
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

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">{t("anketaTitle")}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">{t("anketaSubtitle")}</p>
      </div>

      {/* Media */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
          <div>
            <p className="text-sm font-medium text-zinc-700">{t("photo")}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative">
                <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
                {uploadingPhoto && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/40 text-white">
                    <Spinner size={18} />
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={uploadingPhoto}
                onClick={() => photoRef.current?.click()}
              >
                <Camera size={15} aria-hidden="true" />
                {t("photoChange")}
              </Button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label={t("photoChange")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPhoto(f);
                }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-700">{t("video")}</p>
            {form.intro_video_url && (
              <video
                src={form.intro_video_url}
                controls
                preload="metadata"
                className="mt-2 max-h-44 w-full max-w-xs rounded-xl bg-zinc-900"
              />
            )}
            <div className="mt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={uploadingVideo}
                loading={uploadingVideo}
                onClick={() => videoRef.current?.click()}
              >
                {!uploadingVideo && <Video size={15} aria-hidden="true" />}
                {t("videoUpload")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{t("videoNote")}</p>
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
          </div>
        </div>
        {uploadFailed && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {t("uploadError")}
          </p>
        )}
      </Card>

      {/* Texts */}
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("headlineUz")}
            value={form.headline_uz}
            maxLength={120}
            onChange={(e) => patch({ headline_uz: e.target.value })}
          />
          <Input
            label={t("headlineRu")}
            value={form.headline_ru}
            maxLength={120}
            onChange={(e) => patch({ headline_ru: e.target.value })}
          />
        </div>
        <Textarea
          label={t("bioUz")}
          rows={4}
          maxLength={2000}
          value={form.bio_uz}
          onChange={(e) => patch({ bio_uz: e.target.value })}
        />
        <Textarea
          label={t("bioRu")}
          rows={4}
          maxLength={2000}
          value={form.bio_ru}
          onChange={(e) => patch({ bio_ru: e.target.value })}
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
            <div className="flex flex-wrap gap-2">
              {LANG_CODES.map((code) => {
                const active = form.teaching_langs.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleLang(code)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-300",
                    )}
                  >
                    {tLangs(code)}
                  </button>
                );
              })}
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
    </div>
  );
}
