# 07 — Интеграции

## 7.1 Payme (приоритет №1)

Merchant API — JSON-RPC, Payme сам дёргает наш endpoint (`payme-webhook` Edge Function). Реализовать методы протокола:
`CheckPerformTransaction` · `CreateTransaction` · `PerformTransaction` · `CancelTransaction` · `CheckTransaction` · `GetStatement`.

- Авторизация запросов: Basic auth `Paycom:{PAYME_KEY}` — проверять заголовок, иначе ошибка `-32504`.
- `account` в счёте: `{booking_id}` или `{payment_id}` (наш uuid). Суммы Payme шлёт в тийинах — совпадает с нашей моделью.
- Идемпотентность по `external_id` (id транзакции Payme), хранить `raw_payload`.
- `PerformTransaction` → `payments.succeeded` → бронь `paid` / пакет создан / PRO продлён → уведомления.
- Checkout: redirect `https://checkout.paycom.uz/{base64(m=MERCHANT_ID;ac.payment_id={id};a={amount})}`.
- Тест: sandbox-кабинет Payme + `PAYMENTS_MODE=test` (отдельный merchant id).

## 7.2 Click

SHOP-API: Click дёргает два наших endpoint'а — `prepare` и `complete` (`click-webhook`).
- Подпись: `sign_string = md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + (merchant_prepare_id for complete) + amount + action + sign_time)` — сверять.
- `merchant_trans_id` = наш `payment_id`. Суммы Click шлёт в сумах с копейками — конвертировать в тийины аккуратно (×100, round).
- Checkout: `https://my.click.uz/services/pay?service_id=...&merchant_id=...&amount=...&transaction_param={payment_id}`.

## 7.3 Uzum (бывш. Apelsin)

Merchant API по их актуальной документации (check/create/confirm/reverse/status — схема близка к Payme). **Перед реализацией Claude Code должен запросить у Темура доступ к кабинету Uzum и свежую доку** — API у них обновлялся. Общие требования те же: подпись, идемпотентность, raw_payload.

## 7.4 Международные карты (фаза 7, не MVP)

Stripe в Узбекистане для местных юрлиц недоступен. Кандидаты: **OCTO (octo.uz)** или **Payze** — оба принимают Visa/Mastercard для узбекских мерчантов. Выбор — при наступлении фазы, по актуальным комиссиям. В коде это просто ещё один `payment_provider`.

## 7.5 Eskiz.uz (SMS)

- Auth: `POST /api/auth/login {email,password}` → Bearer token (TTL 30 дней, кэшировать и авто-рефрешить).
- Отправка: `POST /api/message/sms/send {mobile_phone, message, from}`.
- Использование: OTP-коды (Supabase Auth Hook «Send SMS» → наша функция `sms-hook`), напоминание за 1 час до урока, статусы выплат.
- Шаблоны SMS в Eskiz требуют согласования — подать шаблоны заранее: «Ваш код: {code}», «Урок через 1 час: {subject} в {time}», «Выплата {amount} отправлена».
- До согласования alpha-name работает тестовый режим.

## 7.6 Agora

- Продукты: RTC (видео/аудио) + Screen Share. Whiteboard Agora НЕ используем (своя доска на Realtime).
- Сервер: `agora-token` Edge Function генерирует RtcTokenBuilder-токен (npm `agora-token` через `npm:` import в Deno): канал = `booking_id`, uid = int-хэш user_id, роль publisher, TTL до конца окна урока.
- Flutter: `agora_rtc_engine`. Web: `agora-rtc-sdk-ng`.
- Профиль видео: 640×480@15fps по умолчанию (трафик/качество для мобильного интернета UZ), адаптивный fallback на аудио при плохой сети.
- Free tier: 10 000 минут/мес суммарно — следить за расходом в консоли Agora; алерт при 70%.

## 7.7 Миграция на LiveKit (план, фаза 7+)

Триггер: расход Agora стабильно > бесплатного лимита (≈ >80 платных часов уроков/мес) — считаем экономику.
1. Поднять LiveKit OSS на VPS (4 vCPU/8GB, ~$40–80/мес) + TURN, домен `live.<домен>`, мониторинг.
2. Реализовать `LiveKitVideoSession` (Flutter `livekit_client`) и серверную выдачу токенов (`livekit-server-sdk`) — вторая реализация `VideoProvider`.
3. Фича-флаг `video_provider` в `app_settings`: канареечно 10% уроков → 100%.
4. Agora остаётся fallback'ом на месяц, затем отключение.

## 7.8 Firebase Cloud Messaging

- `notify-push` Edge Function: FCM HTTP v1 (service account JSON в secrets), мультитокен на пользователя (`profiles.fcm_tokens`), удаление протухших токенов по ответу FCM.
- Каналы Android: lessons (high), chat (high), marketing (default). iOS: запрос разрешения после первого успешного бронирования (не на старте — конверсия).
- Шаблоны: новое бронирование · напоминания −24ч/−1ч · новое сообщение · домашка назначена/проверена · выплата · PRO истекает · рассылки админа. Все тексты uz/ru по `profiles.locale`.

## 7.9 Cron-задачи (Supabase pg_cron или внешний шедулер → Edge Functions)

| Расписание | Задача |
|---|---|
| каждые 5 мин | экспирация `pending_payment` > 15 мин |
| каждые 10 мин | авто-завершение уроков; зачисления на кошелёк (холд 24ч); no-show |
| каждые 10 мин | отправка `notifications` с `scheduled_at <= now()` |
| 00:05 Tashkent | пересчёт стриков; сброс месячных лимитов FREE (1-го числа); cancel_strikes за 30 дней |
| 09:00 Tashkent | напоминания об истекающих PRO (−3 дня) и пакетах (−14 дней) |
