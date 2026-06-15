"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { CabinetNav } from "./cabinet-nav";

export type CabinetProfile = {
  id: string;
  phone: string;
  full_name: string;
  avatar_url: string | null;
  locale: string;
  is_teacher: boolean;
  student_balance: number;
};

type CabinetContextValue = {
  userId: string;
  profile: CabinetProfile;
  /** Re-reads the profile row (e.g. after become_teacher or avatar change). */
  refreshProfile: () => Promise<void>;
  unreadCount: number;
  setUnreadCount: Dispatch<SetStateAction<number>>;
};

const CabinetContext = createContext<CabinetContextValue | null>(null);

export function useCabinet(): CabinetContextValue {
  const ctx = useContext(CabinetContext);
  if (!ctx) throw new Error("useCabinet must be used inside <CabinetShell>");
  return ctx;
}

const PROFILE_COLS =
  "id, phone, full_name, avatar_url, locale, is_teacher, student_balance";

/**
 * Client gate for every /cabinet page: requires a session (guests are sent
 * to /auth with a return URL), loads the profile + unread notifications
 * count and renders the sidebar/tabs around the page content.
 */
export function CabinetShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<"loading" | "error" | "ready">("loading");
  const [profile, setProfile] = useState<CabinetProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace(
        `/auth?next=${encodeURIComponent(pathname || "/cabinet")}`,
      );
      return;
    }
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLS).eq("id", user.id).single(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ]);
    if (profileRes.error || !profileRes.data) {
      setPhase("error");
      return;
    }
    setProfile(profileRes.data as CabinetProfile);
    setUnreadCount(unreadRes.count ?? 0);
    setPhase("ready");
  }, [pathname, router]);

  // Refreshes on every cabinet navigation — keeps the unread badge honest.
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const refreshProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as CabinetProfile);
  }, []);

  if (phase === "error") {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <ErrorState onRetry={() => void load()} />
      </main>
    );
  }

  if (phase === "loading" || !profile) {
    return (
      <main
        aria-busy="true"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <div className="hidden w-56 shrink-0 space-y-2 lg:block">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden lg:hidden">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-64" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </main>
    );
  }

  return (
    <CabinetContext.Provider
      value={{
        userId: profile.id,
        profile,
        refreshProfile,
        unreadCount,
        setUnreadCount,
      }}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          <CabinetNav isTeacher={profile.is_teacher} unreadCount={unreadCount} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </main>
    </CabinetContext.Provider>
  );
}
