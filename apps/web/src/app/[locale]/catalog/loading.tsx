import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

/** Catalog skeleton: title, search bar, sidebar filters and result cards. */
export default function CatalogLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <Skeleton className="mt-6 h-14 w-full rounded-2xl" />

      <div className="mt-6 items-start lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <div className="mb-6 hidden space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 lg:mb-0 lg:block">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-48 rounded-xl" />
          </div>
          <div className="mt-5 grid gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
