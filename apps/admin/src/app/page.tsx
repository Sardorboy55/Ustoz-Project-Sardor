// Раздел из docs/06-admin-panel.md. Phase 0 — оболочка; функциональность по фазам:
// выплаты/подписки — Фаза 7, остальное — Фаза 8.
const SECTIONS = [
  { n: 1, title: "Дашборд", note: "метрики, GMV, конверсия" },
  { n: 2, title: "Пользователи", note: "поиск, бан, баланс" },
  { n: 3, title: "Преподаватели", note: "tier, страйки, флаги" },
  { n: 4, title: "Очередь модерации", note: "контакт-фильтр" },
  { n: 5, title: "Категории и предметы", note: "CRUD" },
  { n: 6, title: "Брони и уроки", note: "статусы, споры" },
  { n: 7, title: "Платежи", note: "вебхуки, рефанды" },
  { n: 8, title: "Выплаты", note: "ежедневная очередь" },
  { n: 9, title: "Подписки", note: "PRO, продления" },
  { n: 10, title: "Отзывы", note: "скрытие при жалобах" },
  { n: 11, title: "Рассылки", note: "push-сегменты" },
  { n: 12, title: "Настройки", note: "app_settings" },
  { n: 13, title: "Поддержка", note: "обращения" },
];

export default function AdminHome() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-zinc-200 bg-white p-4">
        <div className="px-2 pb-4 text-lg font-extrabold tracking-wide text-teal-700">
          USTOZ <span className="font-medium text-zinc-400">admin</span>
        </div>
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <span
              key={s.n}
              className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm text-zinc-500"
            >
              {s.n}. {s.title}
            </span>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <h1 className="text-2xl font-bold">Админ-панель USTOZ</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-600">
          Каркас Фазы 0. Вход с проверкой роли admin, разделы и audit log появятся в
          Фазах 7–8 по docs/06-admin-panel.md.
        </p>
        <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold">
                {s.n}. {s.title}
              </div>
              <div className="mt-1 text-xs text-zinc-500">{s.note}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
