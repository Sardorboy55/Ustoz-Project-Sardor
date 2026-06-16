"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TAG_KEYS = ["tagPunctual", "tagClear", "tagPolite", "tagRecommend"] as const;

/**
 * Star rating (1–5) + quick tags + comment, writing one row to `reviews`.
 * Shared by the lessons-list modal and the booking page. Mount it fresh
 * (key={bookingId}) so the form resets per lesson. `onReviewed` fires once the
 * review is recorded — including the "already reviewed" case (unique-violation
 * from a second device), which we treat as success.
 */
export function ReviewForm({
  bookingId,
  teacherId,
  studentId,
  onReviewed,
}: {
  bookingId: string;
  teacherId: string;
  studentId: string;
  onReviewed: (stars: number) => void;
}) {
  const t = useTranslations("Cabinet.lessons");
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggleTag = (label: string) => {
    setBody((prev) => {
      if (prev.includes(label)) {
        return prev
          .replace(`${label}. `, "")
          .replace(`${label}.`, "")
          .replace(label, "")
          .replace(/\s*\.\s*$/, ".") // collapse a separator left dangling at the end
          .trim();
      }
      const base = prev.trim();
      return base ? `${base.replace(/\.?$/, ".")} ${label}.` : `${label}.`;
    });
  };

  const submit = async () => {
    if (stars < 1) return;
    setBusy(true);
    setFailed(false);
    const supabase = createClient();
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      student_id: studentId,
      teacher_id: teacherId,
      stars,
      body: body.trim() || null,
    });
    setBusy(false);
    // 23505 = already reviewed (e.g. from mobile); reflect it like a success.
    if (error && error.code !== "23505") {
      setFailed(true);
      return;
    }
    onReviewed(stars);
  };

  return (
    <div>
      <p className="text-sm font-medium text-zinc-700">{t("reviewStars")}</p>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} / 5`}
            aria-pressed={stars >= n}
            onClick={() => setStars(n)}
            className="rounded-lg p-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <Star
              size={30}
              aria-hidden="true"
              className={stars >= n ? "text-accent-500" : "text-zinc-200"}
              fill="currentColor"
              strokeWidth={0}
            />
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-700">{t("reviewTags")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TAG_KEYS.map((key) => {
          const label = t(key);
          const active = body.includes(label);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => toggleTag(label)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
                active
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-300",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Textarea
        label={t("reviewComment")}
        rows={3}
        maxLength={1000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        wrapperClassName="mt-4"
      />

      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t("reviewError")}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button loading={busy} disabled={stars < 1} onClick={submit}>
          {t("reviewSubmit")}
        </Button>
      </div>
    </div>
  );
}
