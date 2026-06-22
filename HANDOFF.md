# HANDOFF — ввод в курс дела (для Claude на новой машине)

Привет, «братик». Этот файл — сжатый рассказ о проекте и его инфраструктуре, чтобы ты
быстро понял, что происходит, и не сломал боевое. Читай целиком перед деплоем/миграциями.

---

## 1. Что это за проект

**IBILIM** (раньше назывался USTOZ — переименован) — маркетплейс репетиторов/специалистов
для Узбекистана (как italki/Preply). Уроки идут ВНУТРИ платформы (видео + чат).
Источник правды по продукту — папка `docs/`. Стек и правила — в `CLAUDE.md` (читай его).

Монорепо:
- `apps/web` — Next.js (App Router, TS, Tailwind, next-intl) — **публичный сайт + кабинеты**. Это основной готовый продукт.
- `apps/admin` — Next.js — **админ-панель**.
- `apps/mobile` — Flutter — мобильное приложение (**отстаёт от сайта**, см. §7).
- `packages/shared` — общие TS-типы (`@ustoz/shared`).
- `supabase/` — миграции (`migrations/`) и edge-функции (`functions/`).

⚠️ Важно: бренд в коде = **IBILIM**, но узбекское слово **«ustoz» = «учитель»** — обычное
слово в UI, его НЕ трогать. Технические id остались на `ustoz`/`uz.ustoz` (пакет
`@ustoz/shared`, домены `ustoz.uz`/`ustoz-web-two.vercel.app`, applicationId `uz.ustoz.app`).

---

## 2. Инфраструктура (точные адреса)

| Что | Значение |
|---|---|
| Репозиторий | `Sardorboy55/Ustoz-Project-Sardor`, **дефолтная ветка `main`** |
| Web (прод) | https://ustoz-web-two.vercel.app · Vercel project `ustoz-web` (id `prj_4d31w4xwS1IsgnIx61geKwPpKMDe`), team `uz-student-sardor` |
| Admin (прод) | https://ustoz-project-sardor.vercel.app · **авто-деплой при git push** (git-integrated, НЕ через хук) |
| Supabase (прод) | `pohlwvzwzcscsyigswod` → `https://pohlwvzwzcscsyigswod.supabase.co` · **боевой, RLS включён** |
| Домен (в работе) | **ibilim.uz** куплен на ahost.uz, DNS-зона ещё НЕ поднята (ahost отвечает REFUSED). Пока живём на vercel-домене. |

Секреты НЕ в гите. Лежат: Vercel env (web), Supabase Edge secrets, GitHub Actions secrets.

---

## 3. Деплой (как мы это делаем)

Скрипт **`deploy.sh`** в корне:
```bash
bash deploy.sh "сообщение коммита"
```
Делает: `git add -A` → commit → **push в `main`** → curl Vercel deploy-hook для **web**.
- **Admin** деплоится сам при push в main (git-integrated в Vercel), его в хуке нет.
- Дефолтная ветка репо = `main` (переключали с `fix/bugs-and-perf`, чтобы работали GitHub Actions).

Проверки перед деплоем: `npx tsc --noEmit` и `npx eslint <файлы>` в `apps/web` / `apps/admin`.

---

## 4. Supabase и МИГРАЦИИ (читай внимательно!)

- Проект **боевой**, RLS на всех таблицах. Деньги — только через `wallet_transactions` в
  SECURITY DEFINER функциях, не прямыми UPDATE.
- ⚠️ **Миграции применяются ВРУЧНУЮ**: владелец копипастит содержимое `.txt`-файлов из корня
  репо в Supabase **SQL Editor** и жмёт Run. НЕ через `supabase db push`/CLI.
  (Причина: у владельца ограниченный доступ + старый macOS, дашборд-формы иногда не принимали ввод.)
- Файлы миграций лежат в `supabase/migrations/*.sql`; для каждого есть копия `ustoz-*.txt`
  в корне (её и запускают).
- **СЕЙЧАС НЕ ПРИМЕНЕНЫ 2 файла** (надо прогнать):
  1. `ustoz-paket-oplata-qr.txt` — оплата пакетов уроков по QR
  2. `ustoz-zakryt-mgnovennogo-prepoda.txt` — закрыть мгновенное «стать преподавателем» в обход интервью
- Остальные применены (имя при регистрации, бронь-не-пропадает, уведомления, ручная оплата, Pro, интервью, SMS-приём).

Можно прогонять миграции и через Management API (`POST /v1/projects/{ref}/database/query`)
с personal access token — так делали сброс аккаунта и настройку Google.

---

## 5. Авторизация (вход)

На сайте оставлены только **Google** и **Telegram** (телефон и почта убраны с формы).
- **Google OAuth**: настроен. Web-клиент в Google Cloud (проект IBILIM) + провайдер Google
  включён в Supabase (Auth → Providers). Callback: `apps/web/src/app/[locale]/auth/callback/route.ts`
  + rewrite `/auth/callback` в `next.config.ts` (важно: при `localePrefix:'as-needed'` без
  middleware bare-маршрут не ловится). Site URL/redirect в Supabase = vercel-домен.
- **Telegram**: бот `@ibilim_login_bot` (домен привязан через BotFather `/setdomain`).
  Edge-функция `supabase/functions/telegram-auth` проверяет подпись и выдаёт сессию через OTP.
  Секрет `TELEGRAM_BOT_TOKEN` в Supabase Edge secrets.
- Профиль создаётся триггером `handle_new_user` (берёт имя из метаданных провайдера).
- Реальный SMS-вход (телефон) — НЕ работает: нет SMS-провайдера. Edge-функция `sms-hook`
  под Eskiz написана, но Eskiz-аккаунта пока нет. Тест-номера `+998 90 000 00 XX` → код `123456`.

---

## 6. Оплаты (важно: мерчант-API НЕТ)

Платежи — **ручное/SMS-подтверждение по Paynet QR** (чтобы не платить ~2% эквайринга).
Все платежи идут через таблицу `manual_payments` (purpose = `lesson` | `pro` | `package`):
- Ученик платит на счёт Paynet (QR `apps/web/public/paynet-qr.png`, счёт TEMUR BASHIROV),
  сумма уникальная (цена + код), грузит чек → запись `pending`.
- Подтверждение: админ в `/payment-confirmations`, ИЛИ авто по SMS (`sms-hook`/`ingest_payment_sms`).
- На подтверждении: урок → бронь `paid` + кредит преподавателю; pro → tier; package → начисляется `student_packages`.
- Картой (Click/Payme/Uzum) — «скоро», не подключено.

---

## 7. Мобильное приложение / APK

- `apps/mobile` (Flutter) — **старое**, отстало от сайта (вход по телефону, не все функции). Тема переведена в синий IBILIM, дальше на паузе.
- **Локально APK не собрать**: macOS у владельца = 12.0, а проектный Flutter требует macOS 14+. Сборка — только в облаке через GitHub Actions (`.github/workflows/build-apk.yml`).
- Пробовали **TWA** (обёртка PWA-сайта в APK, `.github/workflows/build-twa-apk.yml`) — владельцу не подошло (открывается «через Chrome»). Решили делать **полноценное нативное** приложение — это на паузе (нужен Google Cloud «Android»-клиент: package `uz.ustoz.app` + SHA-1 ключа подписи).

---

## 8. Что в работе / ждёт владельца

- ⚠️ Прогнать 2 SQL (см. §4).
- 🌐 Домен **ibilim.uz** — ждём, пока ahost поднимет DNS-зону. Потом: поменять домен в Supabase redirect + BotFather + хардкод-ссылках.
- 📱 Нативное приложение (Flutter) — большой проект, на паузе.
- 💬 Реальный SMS (Eskiz) и письма (Resend) — когда будут аккаунты.
- 🐞 Последний открытый баг: бронь иногда падает («Не удалось создать бронь») — задеплоен фикс, показывающий точную причину (вероятно «бронь самого себя»).

---

## 9. Предостережения (НЕ сломай боевое)

- База **боевая** — перед изменениями схемы делай бэкап / показывай SQL владельцу.
- Деньги трогать только через функции (`wallet_transactions`), не прямыми UPDATE.
- Секреты не коммить (токены, ключи Eskiz/ElevenLabs/бот). Они в env/secrets.
- Локализация обязательна (uz/ru/en). Дефолтный язык `uz` без префикса (`localePrefix: 'as-needed'`).
- Время — Asia/Tashkent, хранится в UTC. Деньги — в тийинах (1 сум = 100 тийин).

Подробности по продукту — в `docs/` и `CLAUDE.md`. Удачи! 🤝
