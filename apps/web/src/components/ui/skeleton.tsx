import { cn } from "@/lib/cn";

/** Pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-zinc-200/70", className)}
    />
  );
}

/** A few lines of pulsing text. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Placeholder shaped like a teacher/list card: avatar + text lines. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex gap-4 rounded-2xl border border-zinc-200 bg-white p-5",
        className,
      )}
    >
      <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}
