"use client";

import { useState, type ReactNode } from "react";
import { Check, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import {
  Button,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

/**
 * "Message the teacher" button. Instead of navigating away, it opens an inline
 * composer: the student types a message right here, sends it (the chat is
 * created on first send — RLS: only the student may create it), and gets a
 * "sent" confirmation with a "go to chat" button. Guests are sent to /auth
 * first (their draft would be lost across sign-in anyway).
 */
export function ContactTeacherButton({
  teacherId,
  teacherSlug,
  variant = "secondary",
  size = "md",
  className,
  children,
  icon = true,
}: {
  teacherId: string;
  /** Profile slug used to return to /t/[slug] after sign-in. */
  teacherSlug: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  /** Show the message icon (default true). */
  icon?: boolean;
}) {
  const t = useTranslations("Teacher");
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [openClick, setOpenClick] = useState(false); // modal open
  const [sent, setSent] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  // Trigger: sign-in gate, then open the composer (no navigation for students).
  const onTrigger = async () => {
    setBusy(true);
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
        router.push("/cabinet"); // a teacher viewing their own profile
        return;
      }
      setSent(false);
      setText("");
      setFailed(false);
      setChatId(null);
      setOpenClick(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (sending) return;
    setOpenClick(false);
  };

  /** Find-or-create the chat, then insert the message. */
  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
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

      let id = chatId;
      if (!id) {
        const { data: existing } = await supabase
          .from("chats")
          .select("id")
          .eq("student_id", user.id)
          .eq("teacher_id", teacherId)
          .maybeSingle();
        id = existing?.id ?? null;
        if (!id) {
          const { data: created, error } = await supabase
            .from("chats")
            .insert({ student_id: user.id, teacher_id: teacherId })
            .select("id")
            .single();
          if (error) {
            // created concurrently in another tab — re-read
            if (error.code === "23505") {
              const { data: again } = await supabase
                .from("chats")
                .select("id")
                .eq("student_id", user.id)
                .eq("teacher_id", teacherId)
                .maybeSingle();
              id = again?.id ?? null;
            } else {
              throw error;
            }
          } else {
            id = created?.id ?? null;
          }
        }
      }
      if (!id) {
        setFailed(true);
        return;
      }

      const { error: msgErr } = await supabase
        .from("messages")
        .insert({ chat_id: id, sender_id: user.id, body });
      if (msgErr) {
        setFailed(true);
        return;
      }
      setChatId(id);
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("min-w-0", className)}>
      <Button
        variant={variant}
        size={size}
        loading={busy}
        onClick={onTrigger}
        className="w-full"
      >
        {icon && !busy && <MessageCircle size={16} aria-hidden="true" />}
        {children ?? t("message")}
      </Button>

      <Modal
        open={openClick}
        onClose={close}
        title={sent ? undefined : t("msgComposeTitle")}
        size="lg"
      >
        {sent ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={28} strokeWidth={3} aria-hidden="true" />
            </span>
            <p className="mt-3 text-lg font-bold text-zinc-900">
              {t("msgSentTitle")}
            </p>
            <p className="mt-1 text-sm text-zinc-500">{t("msgSentBody")}</p>
            <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={() => router.push(`/cabinet/messages?chat=${chatId}`)}
              >
                {t("msgGoToChat")}
              </Button>
              <Button variant="ghost" onClick={() => setOpenClick(false)}>
                {t("msgClose")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Textarea
              autoFocus
              rows={4}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("msgPlaceholder")}
              error={failed ? t("messageError") : undefined}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void send();
              }}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={close} disabled={sending}>
                {t("msgClose")}
              </Button>
              <Button
                onClick={send}
                loading={sending}
                disabled={!text.trim()}
              >
                {t("msgSend")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
