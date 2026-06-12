# 02 — Архитектура

## Общая схема

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Flutter app │   │ Next.js web │   │ Next.js     │
│ iOS/Android │   │ site+cabinet│   │ admin panel │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │   anon key + user JWT (RLS)       │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────┐
│                    SUPABASE                       │
│  PostgreSQL (RLS) · Auth (phone OTP) · Storage    │
│  Realtime (чат, доска) · Edge Functions:          │
│   payme-webhook · click-webhook · uzum-webhook    │
│   agora-token · booking-create · booking-cancel   │
│   payout-request · subscription-pay · sms-hook    │
│   lesson-complete-cron · notify-push · notify-sms │
└───────┬───────────┬───────────┬───────────┬──────┘
        ▼           ▼           ▼           ▼
     Payme       Click/Uzum   Agora      Eskiz SMS / FCM
```

## Почему так

- **Supabase**: PostgreSQL с RLS закрывает 80% API без написания сервера; Realtime даёт чат и синхронизацию доски бесплатно; Edge Functions — вебхуки платёжек и серверная логика. Команда уже знакома со стеком.
- **Next.js для веба**: профили преподавателей — главный SEO-актив («репетитор английского Ташкент»). SSR/ISR-страницы `/t/[slug]` индексируются Google. Flutter Web для этого не подходит.
- **Agora → LiveKit**: Agora даёт 10 000 бесплатных минут/мес и простой Flutter SDK — быстрый запуск. При росте объёмов перейдём на self-hosted LiveKit (минуты бесплатны, платим только за сервер). Весь видео-код пишется через интерфейс `VideoProvider` — миграция меняет одну реализацию, не приложение. Детали: `docs/07-integrations.md`.

## Приложения

### apps/mobile (Flutter)
- Поддержка: iOS 13+, Android 7+ (minSdk 24).
- Состояние: Riverpod (codegen). Навигация: GoRouter. Модели: freezed + json_serializable.
- Локализация: ARB (uz, ru), переключение в настройках, дефолт uz.
- Deep links: `ustoz://lesson/{id}`, `ustoz://teacher/{slug}` + универсальные ссылки с сайта.
- Push: firebase_messaging; локальные напоминания: flutter_local_notifications.
- Платежи: оплата через webview/redirect на страницу платёжки (Payme/Click/Uzum checkout URL), результат — по webhook + поллинг статуса.

### apps/web (Next.js)
- Страницы: лендинг, каталог `/catalog/[category]`, профиль `/t/[slug]` (ISR, revalidate 60с), авторизация, кабинет ученика, кабинет преподавателя, видеокомната (Agora Web SDK — десктоп), статические страницы (оферта, политика).
- SEO: метатеги uz/ru, sitemap.xml (генерация из БД), schema.org `Person`+`Offer` на профилях, hreflang uz/ru.
- Мобильный браузер: баннер «Скачать приложение», видеокомната на мобильном вебе недоступна (редирект в приложение).

### apps/admin (Next.js)
- Отдельный деплой на `admin.<домен>`. Вход только для пользователей с ролью `admin` (проверка в middleware + RLS).
- Разделы: `docs/06-admin-panel.md`.

## Edge Functions (Deno/TS)

| Функция | Назначение |
|---|---|
| `sms-hook` | Auth Hook Supabase «Send SMS» → отправка OTP через Eskiz |
| `booking-create` | Валидация слота, создание брони `pending_payment`, генерация ссылки на оплату |
| `payme-webhook`, `click-webhook`, `uzum-webhook` | Приём вебхуков, идемпотентность, перевод брони в `paid`, запись `payments` |
| `booking-cancel` | Политика отмен, возвраты на баланс ученика |
| `agora-token` | RTC-токен для участников брони (проверка: пользователь ∈ {student, teacher} брони, окно: −10 мин … +duration+30 мин) |
| `lesson-complete-cron` | Cron (каждые 10 мин): авто-завершение уроков, зачисление на кошелёк после 24ч холда, no-show обработка |
| `payout-request` | Создание заявки на вывод, проверка баланса, заморозка суммы |
| `subscription-pay` | Оплата PRO, продление `subscription_expires_at` |
| `notify-push`, `notify-sms` | Очередь уведомлений → FCM / Eskiz |
| `profile-moderation` | Regex-проверка текста профиля/чата на контакты |

## Окружения

- `dev` — локальный Supabase (supabase CLI) + `PAYMENTS_MODE=test` (мок-вебхуки), Agora тестовый проект.
- `staging` — отдельный Supabase-проект, тестовые мерчант-креды платёжек.
- `prod` — продовый Supabase, боевые креды. Секреты — только в Supabase secrets / Vercel env, никогда в репо.

Деплой: web/admin — Vercel; Edge Functions — `supabase functions deploy`; мобильное — TestFlight / Internal testing → сторы.

## Безопасность

- RLS на каждой таблице; клиентам — только anon key; service-role — только в Edge Functions.
- Все денежные операции — Postgres-функции `SECURITY DEFINER` с проверками; прямые UPDATE балансов запрещены (REVOKE).
- Вебхуки платёжек: проверка подписи (Payme — Basic auth по ключу; Click — md5 sign_string; Uzum — по их схеме) + идемпотентность по `external_id`.
- Rate limiting OTP: max 3 SMS / 10 мин на номер, max 5 проверок кода.
- Agora-токены короткоживущие, канал = `booking_id`, выдаются только участникам.
- Storage: bucket'ы `avatars` (public read), `intro-videos` (public read), `chat-files` (private, signed URLs), `homework` (private).
- Логи платёжных вебхуков хранятся сырыми (`payments.raw_payload`) для разбора споров.
