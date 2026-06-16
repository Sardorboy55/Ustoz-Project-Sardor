"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  Briefcase,
  ChevronLeft,
  Clock,
  Gauge,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  Moon,
  Palette,
  Plane,
  Plus,
  Search,
  Sun,
  Sunset,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

/**
 * New-user onboarding funnel (italki-style). Russian-only for now — once the
 * flow is approved we localise (uz/ru/en). Answers are kept in localStorage and,
 * on finish, the learner is sent to the catalog pre-filtered by the chosen
 * language. Real server-side matching needs DB access (added later).
 */

const STORAGE_KEY = "ustoz.onboarding";
const TOTAL_STEPS = 6;

const LEARN_LANGS = [
  { code: "en", name: "Английский", flag: "🇬🇧" },
  { code: "es", name: "Испанский", flag: "🇪🇸" },
  { code: "fr", name: "Французский", flag: "🇫🇷" },
  { code: "ja", name: "Японский", flag: "🇯🇵" },
  { code: "zh", name: "Китайский", flag: "🇨🇳" },
  { code: "de", name: "Немецкий", flag: "🇩🇪" },
  { code: "it", name: "Итальянский", flag: "🇮🇹" },
  { code: "ko", name: "Корейский", flag: "🇰🇷" },
  { code: "ar", name: "Арабский", flag: "🇸🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "pt", name: "Португальский", flag: "🇧🇷" },
  { code: "nl", name: "Нидерландский", flag: "🇳🇱" },
] as const;

const GOALS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "personal", icon: Heart, label: "Личные отношения" },
  { id: "culture", icon: Palette, label: "Культурный интерес" },
  { id: "abroad", icon: Globe, label: "Жизнь заграницей" },
  { id: "brain", icon: Brain, label: "Тренировка мозга" },
  { id: "education", icon: GraduationCap, label: "Образование и экзамены" },
  { id: "travel", icon: Plane, label: "Путешествия" },
  { id: "career", icon: Briefcase, label: "Карьера и бизнес" },
];

const INTERESTS = [
  { id: "music", label: "Музыка", emoji: "🎵" },
  { id: "sport", label: "Спорт", emoji: "🏀" },
  { id: "food", label: "Еда", emoji: "🍕" },
  { id: "cinema", label: "Кино", emoji: "🎬" },
  { id: "reading", label: "Чтение", emoji: "📚" },
  { id: "writing", label: "Письмо", emoji: "✍️" },
  { id: "art", label: "Искусство", emoji: "🎨" },
  { id: "history", label: "История", emoji: "🏛️" },
  { id: "science", label: "Наука", emoji: "🔬" },
  { id: "finance", label: "Финансы", emoji: "💼" },
  { id: "health", label: "Здоровье", emoji: "🩺" },
  { id: "it", label: "ИТ", emoji: "💻" },
  { id: "animals", label: "Животные", emoji: "🐾" },
  { id: "games", label: "Игры", emoji: "🎮" },
  { id: "travel", label: "Путешествия", emoji: "✈️" },
  { id: "legal", label: "Юридические услуги", emoji: "⚖️" },
  { id: "marketing", label: "Маркетинг", emoji: "📈" },
  { id: "fashion", label: "Мода и красота", emoji: "👗" },
  { id: "nature", label: "Природа", emoji: "🌿" },
  { id: "comics", label: "Анимация и комиксы", emoji: "🦸" },
];

const PACE: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "asap", icon: Gauge, label: "Как можно скорее" },
  { id: "moderate", icon: Gauge, label: "В умеренном темпе" },
  { id: "relaxed", icon: Gauge, label: "Я не тороплюсь" },
  { id: "unsure", icon: HelpCircle, label: "Я не уверен(а)" },
];

const LEVELS = [
  { id: "native", label: "Носитель языка" },
  { id: "fluent", label: "Свободно" },
  { id: "intermediate", label: "Средний" },
  { id: "beginner", label: "Начальный" },
];

// Monday-first; value = JS getDay() (0=Sun).
const DAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 0, label: "Вс" },
];

const TIMES: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "morning", icon: Sun, label: "Утро" },
  { id: "afternoon", icon: Sunset, label: "День" },
  { id: "evening", icon: Moon, label: "Вечер" },
];

const LENGTHS = [30, 45, 60, 90];

type Spoken = { lang: string; level: string };
type Answers = {
  learnLang: string | null;
  goal: string | null;
  interests: string[];
  pace: string | null;
  spoken: Spoken[];
  schedule: { days: number[]; time: string | null; length: number | null };
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [a, setA] = useState<Answers>({
    learnLang: null,
    goal: null,
    interests: [],
    pace: null,
    spoken: [{ lang: "", level: "native" }],
    schedule: { days: [], time: null, length: null },
  });

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const pick = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));

  const learnName = useMemo(
    () => LEARN_LANGS.find((l) => l.code === a.learnLang)?.name ?? "",
    [a.learnLang],
  );

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
    } catch {
      // ignore storage failures
    }
    const qs = new URLSearchParams();
    if (learnName) qs.set("q", learnName);
    router.push(`/catalog${qs.toString() ? `?${qs.toString()}` : ""}`);
  };

  const filteredLangs = LEARN_LANGS.filter((l) =>
    l.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const toggleInterest = (id: string) =>
    setA((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((x) => x !== id)
        : [...prev.interests, id],
    }));

  const toggleDay = (value: number) =>
    setA((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: prev.schedule.days.includes(value)
          ? prev.schedule.days.filter((d) => d !== value)
          : [...prev.schedule.days, value],
      },
    }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          aria-label="Назад"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 outline-none transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600 disabled:invisible"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium text-zinc-400">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      <div className="mt-8 flex-1">
        {/* Step 1 — language to learn */}
        {step === 0 && (
          <div>
            <Header
              title="Какой язык Вы изучаете?"
              subtitle="Вы можете добавить больше языков позже."
            />
            <div className="relative mt-6">
              <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск языков"
                className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredLangs.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    pick("learnLang", l.code);
                    next();
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                    a.learnLang === l.code
                      ? "border-brand-600 ring-1 ring-brand-600"
                      : "border-zinc-200 hover:border-brand-300 hover:shadow-md",
                  )}
                >
                  <span className="text-2xl leading-none">{l.flag}</span>
                  <span className="font-semibold text-zinc-900">{l.name}</span>
                </button>
              ))}
              {filteredLangs.length === 0 && (
                <p className="text-sm text-zinc-500">Ничего не найдено.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — goal */}
        {step === 1 && (
          <div>
            <Header
              title={`С какой целью Вы изучаете ${learnName.toLowerCase() || "язык"}?`}
              subtitle="Вы можете изменить это позже."
            />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {GOALS.map((g) => (
                <IconCard
                  key={g.id}
                  icon={g.icon}
                  label={g.label}
                  active={a.goal === g.id}
                  onClick={() => {
                    pick("goal", g.id);
                    next();
                  }}
                />
              ))}
            </div>
            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              или
              <span className="h-px flex-1 bg-zinc-200" />
            </div>
            <IconCard
              icon={Clock}
              label="Для ребёнка"
              sublabel="Найдите идеального учителя для своего ребёнка"
              active={a.goal === "child"}
              onClick={() => {
                pick("goal", "child");
                next();
              }}
            />
          </div>
        )}

        {/* Step 3 — interests */}
        {step === 2 && (
          <div>
            <Header
              title="Что интересует вас?"
              subtitle="Это поможет нам лучше подобрать учителя для вас."
            />
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {INTERESTS.map((it) => {
                const active = a.interests.includes(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleInterest(it.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-brand-300",
                    )}
                  >
                    <span aria-hidden="true">{it.emoji}</span>
                    {it.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button size="lg" className="w-full max-w-md" onClick={next}>
                Продолжить
              </Button>
              <button
                type="button"
                onClick={next}
                className="text-sm font-medium text-zinc-400 transition hover:text-zinc-600"
              >
                Пропустить
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — pace */}
        {step === 3 && (
          <div>
            <Header title="Как быстро Вы хотите достичь своих целей?" />
            <div className="mx-auto mt-6 grid max-w-md gap-3">
              {PACE.map((p) => (
                <IconCard
                  key={p.id}
                  icon={p.icon}
                  label={p.label}
                  active={a.pace === p.id}
                  onClick={() => {
                    pick("pace", p.id);
                    next();
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 5 — spoken languages */}
        {step === 4 && (
          <div>
            <Header title="На каких языках вы говорите?" />
            <div className="mx-auto mt-6 max-w-md space-y-3">
              {a.spoken.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.lang}
                    onChange={(e) =>
                      setA((prev) => {
                        const spoken = [...prev.spoken];
                        spoken[i] = { ...spoken[i], lang: e.target.value };
                        return { ...prev, spoken };
                      })
                    }
                    className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  >
                    <option value="">Выбрать язык</option>
                    {LEARN_LANGS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.level}
                    onChange={(e) =>
                      setA((prev) => {
                        const spoken = [...prev.spoken];
                        spoken[i] = { ...spoken[i], level: e.target.value };
                        return { ...prev, spoken };
                      })
                    }
                    className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                  >
                    {LEVELS.map((lv) => (
                      <option key={lv.id} value={lv.id}>
                        {lv.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Удалить"
                    disabled={a.spoken.length === 1}
                    onClick={() =>
                      setA((prev) => ({
                        ...prev,
                        spoken: prev.spoken.filter((_, idx) => idx !== i),
                      }))
                    }
                    className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 outline-none transition hover:bg-zinc-100 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-brand-600 disabled:invisible"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setA((prev) => ({
                    ...prev,
                    spoken: [...prev.spoken, { lang: "", level: "fluent" }],
                  }))
                }
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-brand-300 bg-brand-50/50 py-3 text-sm font-semibold text-brand-700 outline-none transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <Plus size={16} aria-hidden="true" />
                Добавить другой
              </button>
              <Button size="lg" className="w-full" onClick={next}>
                Продолжить
              </Button>
            </div>
          </div>
        )}

        {/* Step 6 — schedule */}
        {step === 5 && (
          <div>
            <Header title="Какое расписание подходит вам больше всего?" />
            <div className="mx-auto mt-6 max-w-xl space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Доступные дни
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAYS.map((d, i) => {
                    const active = a.schedule.days.includes(d.value);
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleDay(d.value)}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                          active
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-300",
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Предпочтительное время дня
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {TIMES.map((tm) => {
                    const active = a.schedule.time === tm.id;
                    const Icon = tm.icon;
                    return (
                      <button
                        key={tm.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          pick("schedule", { ...a.schedule, time: tm.id })
                        }
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                          active
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-300",
                        )}
                      >
                        <Icon size={16} aria-hidden="true" />
                        {tm.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Предпочтительная длина урока
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LENGTHS.map((len) => {
                    const active = a.schedule.length === len;
                    return (
                      <button
                        key={len}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          pick("schedule", { ...a.schedule, length: len })
                        }
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
                          active
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-brand-300",
                        )}
                      >
                        <Clock size={15} aria-hidden="true" />
                        {len} мин.
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button size="lg" className="w-full" onClick={finish}>
                Подобрать преподавателей
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h1 className="mx-auto max-w-md text-balance text-2xl font-extrabold tracking-tight text-zinc-900 sm:max-w-xl sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">{subtitle}</p>
      )}
    </div>
  );
}

function IconCard({
  icon: Icon,
  label,
  sublabel,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-600",
        active
          ? "border-brand-600 ring-1 ring-brand-600"
          : "border-zinc-200 hover:border-brand-300 hover:shadow-md",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-zinc-900">{label}</span>
        {sublabel && (
          <span className="block text-sm text-zinc-500">{sublabel}</span>
        )}
      </span>
    </button>
  );
}
