"use client";
import { useCallback, useEffect, useState } from "react";
import { Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JitsiRoom } from "./jitsi-room";

// За сколько до начала открывается кнопка «Войти».
const JOIN_BEFORE_MS = 10 * 60_000;

/**
 * Compact "join the lesson" button + fullscreen embedded room. Lets a student or
 * teacher enter the Jitsi call straight from a lesson card (no need to open the
 * booking page). Renders nothing until the join window opens (10 min before
 * start); turns "live" once the lesson has started so the user sees it's on.
 */
export function JoinLessonButton({
  bookingId,
  startAtMs,
  displayName,
  size = "sm",
  className,
}: {
  bookingId: string;
  startAtMs: number;
  displayName: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [inRoom, setInRoom] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const leave = useCallback(() => setInRoom(false), []);

  const canJoin = now >= startAtMs - JOIN_BEFORE_MS;
  if (!canJoin) return null;

  const started = now >= startAtMs;
  const room = `ustoz-${bookingId}`;

  return (
    <>
      <Button size={size} className={className} onClick={() => setInRoom(true)}>
        <Video size={size === "sm" ? 15 : 18} aria-hidden="true" />
        {started ? "Урок идёт — войти" : "Войти в урок"}
      </Button>

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
    </>
  );
}
