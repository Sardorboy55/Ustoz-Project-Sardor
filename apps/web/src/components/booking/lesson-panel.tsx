"use client";

import { useEffect, useState } from "react";
import { Clock, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Lesson panel for a confirmed booking (Google Meet model). The teacher attaches
 * a meeting link and, once the lesson has started, manually completes it (which
 * credits their wallet). Both sides get a "join" button and a live timer that
 * counts up from the lesson start. Payment already happened at booking time.
 */
export function LessonPanel({
  bookingId,
  isTeacher,
  startAtMs,
  initialMeetingUrl,
  onCompleted,
}: {
  bookingId: string;
  isTeacher: boolean;
  startAtMs: number;
  initialMeetingUrl: string | null;
  onCompleted: () => void;
}) {
  const t = useTranslations("Booking.page");
  const [now, setNow] = useState(() => Date.now());
  const [url, setUrl] = useState(initialMeetingUrl);
  const [editing, setEditing] = useState(isTeacher && !initialMeetingUrl);
  const [input, setInput] = useState(initialMeetingUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [linkErr, setLinkErr] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeErr, setCompleteErr] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const started = now >= startAtMs;
  const elapsed = Math.max(0, now - startAtMs);
  const mm = Math.floor(elapsed / 60_000);
  const ss = Math.floor((elapsed % 60_000) / 1000);
  const timer = `${mm}:${String(ss).padStart(2, "0")}`;

  const saveLink = async () => {
    const v = input.trim();
    if (!v || saving) return;
    setSaving(true);
    setLinkErr(false);
    const supabase = createClient();
    const { error } = await supabase.rpc("lesson_set_meeting_url", {
      p_booking_id: bookingId,
      p_url: v,
    });
    setSaving(false);
    if (error) {
      setLinkErr(true);
      return;
    }
    setUrl(v);
    setEditing(false);
  };

  const complete = async () => {
    if (completing) return;
    setCompleting(true);
    setCompleteErr(false);
    const supabase = createClient();
    const { error } = await supabase.rpc("lesson_complete", {
      p_booking_id: bookingId,
    });
    setCompleting(false);
    if (error) {
      setCompleteErr(true);
      return;
    }
    onCompleted();
  };

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Video size={18} className="text-brand-600" aria-hidden="true" />
        <h2 className="text-lg font-bold tracking-tight text-zinc-900">
          {t("lessonTitle")}
        </h2>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm">
        <Clock size={15} className="text-zinc-400" aria-hidden="true" />
        {started ? (
          <span className="font-semibold text-emerald-700">
            {t("lessonInProgress")} · {timer}
          </span>
        ) : (
          <span className="text-zinc-500">{t("lessonStartsSoon")}</span>
        )}
      </div>

      {/* Meeting link */}
      {isTeacher && editing ? (
        <div className="mt-4">
          <Input
            type="url"
            inputMode="url"
            label={t("lessonLinkLabel")}
            placeholder="https://meet.google.com/..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            error={linkErr ? t("lessonError") : undefined}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={saveLink} loading={saving} disabled={!input.trim()}>
              {t("lessonSave")}
            </Button>
            {url && (
              <Button
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setInput(url);
                }}
              >
                {t("lessonCancelEdit")}
              </Button>
            )}
          </div>
        </div>
      ) : url ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("primary", "md")}
          >
            <Video size={18} aria-hidden="true" />
            {t("lessonJoin")}
          </a>
          {isTeacher && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              {t("lessonEdit")}
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">{t("lessonNoLink")}</p>
      )}

      {/* Teacher: complete the lesson once it has started */}
      {isTeacher && started && (
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <Button variant="secondary" loading={completing} onClick={complete}>
            {t("lessonComplete")}
          </Button>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t("lessonCompleteHint")}
          </p>
          {completeErr && (
            <p role="alert" className="mt-1.5 text-sm text-red-600">
              {t("lessonError")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
