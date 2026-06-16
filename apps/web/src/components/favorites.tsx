"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type FavoritesContextValue = {
  authed: boolean;
  isFavorite: (teacherId: string) => boolean;
  toggle: (teacherId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Client island: loads the signed-in student's favorite teacher ids once and
 * shares them with every FavoriteButton below. Safe for guests (no queries).
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => (supabaseRef.current ??= createClient());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getUser();
        if (!mounted || !data.user) return;
        setAuthed(true);
        const { data: rows } = await supabase
          .from("student_favorites")
          .select("teacher_id");
        if (!mounted || !rows) return;
        setFavorites(new Set(rows.map((r: { teacher_id: string }) => r.teacher_id)));
      } catch {
        // graceful: hearts just start empty
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const isFavorite = useCallback(
    (teacherId: string) => favorites.has(teacherId),
    [favorites],
  );

  const toggle = useCallback(async (teacherId: string) => {
    const had = favoritesRef.current.has(teacherId);
    // optimistic flip
    setFavorites((prev) => {
      const next = new Set(prev);
      if (had) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("unauthenticated");
      if (had) {
        const { error } = await supabase
          .from("student_favorites")
          .delete()
          .eq("student_id", uid)
          .eq("teacher_id", teacherId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("student_favorites")
          .insert({ student_id: uid, teacher_id: teacherId });
        // 23505 = already favorited in another tab — treat as success
        if (error && error.code !== "23505") throw error;
      }
    } catch {
      // revert the optimistic flip
      setFavorites((prev) => {
        const next = new Set(prev);
        if (had) next.add(teacherId);
        else next.delete(teacherId);
        return next;
      });
    }
  }, []);

  const value = useMemo(
    () => ({ authed, isFavorite, toggle }),
    [authed, isFavorite, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

/**
 * Heart toggle for a teacher card. Guests are sent to /auth.
 * Must be rendered inside a FavoritesProvider.
 */
export function FavoriteButton({
  teacherId,
  bare = false,
  className,
}: {
  teacherId: string;
  /** Drop the white pill background — for use on light surfaces (cards). */
  bare?: boolean;
  className?: string;
}) {
  const ctx = useContext(FavoritesContext);
  const router = useRouter();
  const t = useTranslations("TeacherCard");

  const active = ctx?.isFavorite(teacherId) ?? false;

  return (
    <button
      type="button"
      aria-label={active ? t("favRemove") : t("favAdd")}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!ctx || !ctx.authed) {
          router.push("/auth");
          return;
        }
        ctx.toggle(teacherId);
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-600",
        !bare && "bg-white/90",
        active ? "text-red-500" : "text-zinc-400 hover:text-red-500",
        className,
      )}
    >
      <Heart
        size={20}
        fill={active ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
