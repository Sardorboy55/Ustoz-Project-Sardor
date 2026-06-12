"use client";

import { useRef, useState } from "react";
import { Camera, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCabinet } from "@/components/cabinet/cabinet-shell";

const LOCALES = [
  { code: "uz", label: "O'zbekcha" },
  { code: "ru", label: "Русский" },
] as const;

export default function ProfilePage() {
  const t = useTranslations("Cabinet.profile");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
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

  const switchLocale = (code: string) => {
    // remember the preference; the link itself switches the UI locale
    const supabase = createClient();
    void supabase.from("profiles").update({ locale: code }).eq("id", userId);
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
        <div className="mt-3 flex items-center gap-4">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.full_name} size="xl" />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/40 text-white">
                <Spinner size={22} />
              </span>
            )}
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Camera size={15} aria-hidden="true" />
              {t("changePhoto")}
            </Button>
            {uploadFailed && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {t("uploadError")}
              </p>
            )}
          </div>
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

      {/* Interface language */}
      <Card className="p-5">
        <p className="text-sm font-medium text-zinc-700">{t("language")}</p>
        <div className="mt-3 flex gap-2">
          {LOCALES.map(({ code, label }) => (
            <Link
              key={code}
              href={pathname}
              locale={code}
              onClick={() => switchLocale(code)}
              aria-current={locale === code ? "true" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                locale === code
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-brand-300",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </Card>

      {/* Sign out */}
      <div className="pt-2">
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
