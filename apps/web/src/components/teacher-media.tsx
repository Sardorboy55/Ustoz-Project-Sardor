"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/cn";

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "•"
  );
}

/**
 * Teacher media box (italki-style): shows a cover/avatar poster (or an initials
 * banner when there is none). If `videoUrl` is set, a play button appears;
 * clicking it plays the teacher's own uploaded intro video inline, filled to the
 * frame. Until a video exists the poster falls back to the avatar/initials.
 */
export function TeacherMedia({
  name,
  videoUrl,
  posterUrl,
  playLabel,
  className,
  rounded = "rounded-2xl",
  playCentered = false,
}: {
  name: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  playLabel: string;
  className?: string;
  rounded?: string;
  /** Center the play button (profile hero) instead of the bottom-left corner. */
  playCentered?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200",
        rounded,
        className,
      )}
    >
      {playing && videoUrl ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- teacher intro clip, no captions track
        <video
          src={videoUrl}
          poster={posterUrl ?? undefined}
          controls
          autoPlay
          className="h-full w-full bg-zinc-900 object-cover"
        />
      ) : (
        <>
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URLs
            <img
              src={posterUrl}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-full w-full items-center justify-center text-6xl font-bold text-brand-700/60"
            >
              {initialsOf(name)}
            </span>
          )}

          {videoUrl && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={playLabel}
              className={cn(
                "absolute z-[2] grid place-items-center rounded-full bg-white/90 text-brand-700 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                playCentered
                  ? "left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2"
                  : "bottom-3 left-3 h-12 w-12",
              )}
            >
              <Play
                size={playCentered ? 24 : 20}
                className="ml-0.5 fill-current"
                aria-hidden="true"
              />
            </button>
          )}
        </>
      )}
    </div>
  );
}
