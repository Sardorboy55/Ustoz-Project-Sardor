"use client";

import { useRef, useState } from "react";
import { Camera, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

export default function ProfilePage() {
  const t = useTranslations("Cabinet.profile");
  const router = useRouter();
  const { userId, profile, refreshProfile } = useCabinet();

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);

  const [name, setName] = useState(profile.full_name);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [signingOut, setSigningOut] = useState(false);

  const nameInvalid = name.trim().length < 2;

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setUploadFailed(false);
    try {
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // cache-bust: the path is stable, the content is not
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (updErr) throw updErr;
      await refreshProfile();
    } catch {
      setUploadFailed(true);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveName = async () => {
    if (nameInvalid) return;
    setSaving(true);
    setSaveState("idle");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setSaveState("error");
      return;
    }
    setSaveState("saved");
    await refreshProfile();
  };

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        {t("title")}
      </h1>

      {/* Avatar */}
      <Card className="p-5">
        <p className="text-sm font-medium text-zinc-700">{t("photo")}</p>
        <div className="mt-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            aria-label={t("changePhoto")}
            title={t("changePhoto")}
            className="group relative block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
          >
            <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera size={26} aria-hidden="true" />
            </span>
            <span className="pointer-events-none absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm transition-opacity group-hover:opacity-0">
              <Camera size={14} aria-hidden="true" />
            </span>
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/55 text-white">
                <Spinner size={22} />
              </span>
            )}
          </button>
          {uploadFailed && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {t("uploadError")}
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label={t("changePhoto")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAvatar(file);
            }}
          />
        </div>
      </Card>

      {/* Name + phone */}
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-2">
          <Input
            label={t("name")}
            value={name}
            maxLength={80}
            error={nameInvalid ? t("nameError") : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setSaveState("idle");
            }}
            wrapperClassName="min-w-0 flex-1"
          />
          <Button
            onClick={saveName}
            loading={saving}
            disabled={nameInvalid || name.trim() === profile.full_name}
            className={cn(nameInvalid && "mb-6")}
          >
            {t("save")}
          </Button>
        </div>
        {saveState === "saved" && (
          <p className="text-sm font-medium text-brand-700">{t("saved")}</p>
        )}
        {saveState === "error" && (
          <p role="alert" className="text-sm text-red-600">
            {t("saveError")}
          </p>
        )}

        <Input label={t("phone")} value={`+${profile.phone}`} disabled readOnly />
      </Card>

      {/* Sign out */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          loading={signingOut}
          onClick={signOut}
          className="text-red-600 hover:bg-red-50 active:bg-red-100"
        >
          {!signingOut && <LogOut size={16} aria-hidden="true" />}
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
