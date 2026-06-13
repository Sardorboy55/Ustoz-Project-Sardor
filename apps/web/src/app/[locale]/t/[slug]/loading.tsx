import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

export default function TeacherLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"
    >
      <Skeleton className="mb-6 h-4 w-36" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div className="flex gap-5">
            <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-12 space-y-10">
            <div>
              <Skeleton className="h-6 w-44" />
              <SkeletonText lines={4} className="mt-4" />
            </div>
            <div>
              <Skeleton className="h-6 w-52" />
              <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
              <Skeleton className="mt-4 h-32 w-full rounded-2xl" />
            </div>
            <div>
              <Skeleton className="h-6 w-60" />
              <Skeleton className="mt-4 h-80 w-full rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-44 w-full rounded-t-2xl rounded-b-none" />
          <div className="space-y-3 rounded-b-2xl border border-t-0 border-zinc-200 bg-white p-5">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
