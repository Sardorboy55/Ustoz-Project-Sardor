import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** Accessible accordion item built on <details> — no JS needed. */
export function FaqItem({
  question,
  answer,
  className,
}: {
  question: string;
  answer: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={cn(
        "group rounded-2xl border border-zinc-200 bg-white px-5 py-4 open:shadow-sm",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-zinc-900 outline-none [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-zinc-600">{answer}</div>
    </details>
  );
}
