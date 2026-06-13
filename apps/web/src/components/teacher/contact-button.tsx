"use client";

import { useState, type ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";

/**
 * "Message the teacher" button. Guests go to /auth (with a return URL);
 * students get their chat with the teacher created on first click
 * (RLS: only the student may create the chat) and land in the inbox.
 */
export function ContactTeacherButton({
  teacherId,
  teacherSlug,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  teacherId: string;
  /** Profile slug used to return to /t/[slug] after sign-in. */
  teacherSlug: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("Teacher");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/auth?next=${encodeURIComponent(`/t/${teacherSlug}`)}`);
        return;
      }
      if (user.id === teacherId) {
        // a teacher viewing their own profile — nothing to message
        router.push("/cabinet");
        return;
      }

      let chatId: string | null = null;
      const { data: existing } = await supabase
        .from("chats")
        .select("id")
        .eq("student_id", user.id)
        .eq("teacher_id", teacherId)
        .maybeSingle();
      chatId = existing?.id ?? null;

      if (!chatId) {
        const { data: created, error } = await supabase
          .from("chats")
          .insert({ student_id: user.id, teacher_id: teacherId })
          .select("id")
          .single();
        if (error) {
          if (error.code === "23505") {
            // created concurrently in another tab — re-read
            const { data: again } = await supabase
              .from("chats")
              .select("id")
              .eq("student_id", user.id)
              .eq("teacher_id", teacherId)
              .maybeSingle();
            chatId = again?.id ?? null;
          }
        } else {
          chatId = created?.id ?? null;
        }
      }

      if (!chatId) {
        setFailed(true);
        return;
      }
      router.push(`/cabinet/messages?chat=${chatId}`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("min-w-0", className)}>
      <Button
        variant={variant}
        size={size}
        loading={busy}
        onClick={open}
        className="w-full"
      >
        {!busy && <MessageCircle size={16} aria-hidden="true" />}
        {children ?? t("message")}
      </Button>
      {failed && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {t("messageError")}
        </p>
      )}
    </div>
  );
}
