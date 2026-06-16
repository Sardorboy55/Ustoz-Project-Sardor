"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";

export type Testimonial = {
  name: string;
  role: string;
  text: string;
  rating: number;
};

const AUTOPLAY_MS = 7000;

/**
 * Landing testimonials carousel (italki-style): one centered card with the
 * neighbours peeking, arrows + dots, scroll-snap for touch. The active card is
 * centred exactly via scrollLeft (so the first card opens centred too), and it
 * auto-advances every 7s, pausing while the pointer is over it.
 */
export function Testimonials({
  title,
  items,
}: {
  title: string;
  items: Testimonial[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeRef = useRef(0);
  const pausedRef = useRef(false);
  const [active, setActive] = useState(0);

  // Centre card [i] in the viewport by setting scrollLeft directly — reliable
  // regardless of padding/breakpoint, and avoids scrollIntoView's vertical jump.
  const centerCard = useCallback((i: number, smooth: boolean) => {
    const track = trackRef.current;
    const card = cardRefs.current[i];
    if (!track || !card) return;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      centerCard(clamped, true);
    },
    [items.length, centerCard],
  );

  // Track which card is closest to the viewport centre to drive the fade/dots.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const elCenter = el.offsetLeft + el.clientWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    activeRef.current = best;
    setActive(best);
  }, []);

  // Centre the first card on mount and re-centre the active one on resize.
  useEffect(() => {
    centerCard(0, false);
    const onResize = () => centerCard(activeRef.current, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [centerCard]);

  // Auto-advance every 3s, looping; paused while hovered.
  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      centerCard((activeRef.current + 1) % items.length, true);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [items.length, centerCard]);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">
          {title}
        </h2>

        <div
          className="relative mt-10"
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
        >
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Previous"
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-600 shadow-sm transition hover:text-brand-600 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
            disabled={active === items.length - 1}
            aria-label="Next"
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-600 shadow-sm transition hover:text-brand-600 disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>

          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-[10%] pb-2 sm:px-[20%] lg:px-[27%] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, i) => (
              <div
                key={item.name}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={cn(
                  "shrink-0 basis-[80%] snap-center transition-opacity duration-300 sm:basis-[60%] lg:basis-[46%]",
                  i === active ? "opacity-100" : "opacity-40",
                )}
              >
                <article className="h-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <Avatar name={item.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-zinc-900">
                            {item.name}
                          </p>
                          <p className="truncate text-sm text-zinc-500">
                            {item.role}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          {Array.from({ length: 5 }, (_, s) => (
                            <Star
                              key={s}
                              size={16}
                              aria-hidden="true"
                              className={
                                s < item.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-zinc-200 text-zinc-200"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                        {item.text}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {items.map((item, i) => (
              <button
                key={item.name}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === active ? "w-6 bg-brand-600" : "w-2 bg-zinc-300",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
