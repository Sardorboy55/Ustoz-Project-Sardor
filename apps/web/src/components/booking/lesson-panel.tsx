"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Video, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JitsiRoom } from "./jitsi-room";

// За сколько до начала открывается кнопка «Войти».
const JOIN_BEFORE_MS = 10 * 60_000;

/**
 * Lesson panel (Jitsi model). The video room lives INSIDE the platform — the
 * room name is derived from the booking id, so no manual links: both teacher and
 * student press "Join" and land in the same embedded room. The teacher completes
 * the lesson once it has started (which credits their wallet). Payment already
 * happened at booking time.
 */
export function LessonPanel({
  bookingId,
  isTeacher,
  startAtMs,
  displayName,
  onCompleted,
}: {
  bookingId: string;
  isTeacher: boolean;
  startAtMs: number;
  displayName: string;
  onCompleted: () => void;
}) {
  const t = useTranslations("Booking.page");
  const [now, setNow] = useState(() => Date.now());
  const [inRoom, setInRoom] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeErr, setCompleteErr] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const started = now >= startAtMs;
  const canJoin = now >= startAtMs - JOIN_BEFORE_MS;
  const elapsed = Math.max(0, now - startAtMs);
  const mm = Math.floor(elapsed / 60_000);
  const ss = Math.floor((elapsed % 60_000) / 1000);
  const timer = `${mm}:${String(ss).padStart(2, "0")}`;
  const room = `ustoz-${bookingId}`;

  const leave = useCallback(() => setInRoom(false), []);

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
    setInRoom(false);
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

      {canJoin ? (
        <div className="mt-4">
          <Button onClick={() => setInRoom(true)}>
            <Video size={18} aria-hidden="true" />
            {t("lessonJoin")}
          </Button>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            Урок проходит прямо здесь, в браузере. Нажмите «Войти» и разрешите
            доступ к камере и микрофону — вы попадёте в одну комнату с
            собеседником.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          Кнопка «Войти» появится за 10 минут до начала урока.
        </p>
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

      {/* Полноэкранная встроенная видео-комната */}
      {inRoom && (
        <div className="fixed inset-0 z-50 bg-black">
          <JitsiRoom room={room} displayName={displayName} onLeave={leave} />
          <button
            type="button"
            onClick={leave}
            aria-label="Выйти из урока"
            className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-white"
          >
            <X size={16} aria-hidden="true" />
            Выйти
          </button>
        </div>
      )}
    </Card>
  );
}
