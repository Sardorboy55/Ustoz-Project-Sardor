"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/ui/rating-stars";

export type HeroTeacher = {
  slug: string;
  name: string;
  subject: string;
  rating: number;
  avatarUrl: string | null;
};

/** A floating, clickable teacher mini-card. The inner content fades in on change. */
function TeacherChip({
  teacher,
  className,
}: {
  teacher: HeroTeacher;
  className: string;
}) {
  return (
    <Link
      href={teacher.slug ? `/t/${teacher.slug}` : "/catalog"}
      className={`group block w-64 rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg transition hover:shadow-xl ${className}`}
    >
      <div key={teacher.slug || teacher.name} className="animate-hero-fade">
        <div className="flex items-center gap-3">
          <Avatar src={teacher.avatarUrl} name={teacher.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-900 transition-colors group-hover:text-brand-700">
              {teacher.name}
            </p>
            <p className="truncate text-xs text-zinc-500">{teacher.subject}</p>
          </div>
        </div>
        <RatingStars value={teacher.rating} size={13} className="mt-3" />
      </div>
    </Link>
  );
}

/**
 * Hero collage: two teacher cards over animated blur blobs + floating chips and
 * a mini schedule. Cycles through `teachers` every 5s (smooth fade) and each
 * card links to the teacher's profile.
 */
export function HeroCollage({ teachers }: { teachers: HeroTeacher[] }) {
  const t = useTranslations("Landing");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (teachers.length <= 2) return;
    const id = setInterval(
      () => setIdx((v) => (v + 1) % teachers.length),
      5000,
    );
    return () => clearInterval(id);
  }, [teachers.length]);

  if (teachers.length === 0) return null;
  const a = teachers[idx % teachers.length];
  const b = teachers[(idx + 1) % teachers.length];

  return (
    <div className="relative hidden h-[420px] select-none lg:block">
      {/* Animated blur blobs */}
      <div className="animate-blob absolute -right-10 top-6 h-72 w-72 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="animate-blob-slow absolute bottom-10 left-0 h-56 w-56 rounded-full bg-accent-200/40 blur-3xl" />

      {/* Front cards (clickable, rotate every 5s) */}
      <TeacherChip teacher={a} className="animate-float absolute left-0 top-8" />
      <TeacherChip
        teacher={b}
        className="animate-float-slow absolute bottom-6 right-0"
      />

      {/* Rating chip */}
      <div className="animate-float absolute right-6 top-2 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-zinc-900 shadow-md">
        <Star
          size={15}
          className="text-accent-500"
          fill="currentColor"
          strokeWidth={0}
          aria-hidden="true"
        />
        4.9
        <span className="font-normal text-zinc-400">{t("heroRatingLabel")}</span>
      </div>

      {/* "Available today" chip — lifted up to fill the empty space */}
      <div className="animate-float-slow absolute bottom-44 left-10 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-md">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {t("heroAvailableToday")}
      </div>

      {/* Mini schedule */}
      <div className="absolute right-2 top-1/2 w-44 -translate-y-1/2 rounded-2xl border border-zinc-100 bg-white p-4 shadow-lg">
        <p className="text-xs font-semibold text-zinc-700">
          {t("heroSchedule")}
        </p>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-md ${
                [9, 12, 17, 22].includes(i)
                  ? "bg-brand-600"
                  : i === 15
                    ? "bg-accent-400"
                    : "bg-zinc-100"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
