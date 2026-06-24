// Telegram-бот уведомлений IBILIM (@Ibilimuzbot). Делает две вещи:
//   1) WEBHOOK (Telegram шлёт сюда апдейты): /start <token> — привязка аккаунта;
//      кнопка «Стать преподавателем»; оценка преподавателя звёздами (callback).
//   2) CRON (?task=cron): ставит напоминания (enqueue_lesson_reminders) и
//      рассылает накопленные telegram-уведомления из таблицы notifications.
//
// Деплой: supabase functions deploy telegram-notify-bot --no-verify-jwt
// Секреты: TELEGRAM_NOTIFY_BOT_TOKEN (обяз.), TELEGRAM_WEBHOOK_SECRET,
//          TELEGRAM_CRON_SECRET (опц.). SUPABASE_URL/SERVICE_ROLE — авто.
import { createClient } from "npm:@supabase/supabase-js@2";

const BOT = Deno.env.get("TELEGRAM_NOTIFY_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const CRON_SECRET = Deno.env.get("TELEGRAM_CRON_SECRET") ?? "";

const APP_BASE = "https://ibilim.uz";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

async function tg(method: string, body: unknown): Promise<any> {
  const r = await fetch(`https://api.telegram.org/bot${BOT}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

function fmtTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Asia/Tashkent",
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: "🎓 O'qituvchi bo'lish / Стать преподавателем", url: `${APP_BASE}/become-teacher` }],
      [{ text: "📚 Ilovani ochish / Открыть приложение", url: APP_BASE }],
    ],
  };
}

// Двуязычный (uz / ru) рендер сообщения по template + payload.
function render(template: string, p: Record<string, any>): { text: string; keyboard?: any } {
  const t = fmtTime(p.start_at);
  const su = p.subject_uz ?? "";
  const sr = p.subject_ru ?? "";
  const openLesson = {
    inline_keyboard: [[{ text: "▶️ Darsga kirish / Войти в урок", url: `${APP_BASE}/lessons` }]],
  };
  switch (template) {
    case "purchase_student":
      return {
        text:
          `🎉 To'lov qabul qilindi! ${p.teacher_name ?? ""} bilan «${su}» darsi — ${t}.\n` +
          `🎉 Оплата принята! Урок «${sr}» с ${p.teacher_name ?? ""} — ${t}.`,
      };
    case "purchase_teacher":
      return {
        text:
          `💰 Sizdan dars sotib olishdi! O'quvchi: ${p.student_name ?? ""}, «${su}», ${t}.\n` +
          `💰 У вас купили урок! Ученик: ${p.student_name ?? ""}, «${sr}», ${t}.`,
      };
    case "lesson_soon":
      return {
        text:
          `⏰ Darsingiz 15 daqiqadan keyin boshlanadi (${t}).\n` +
          `⏰ Ваш урок начнётся через 15 минут (${t}).`,
        keyboard: openLesson,
      };
    case "lesson_start":
      return {
        text:
          `▶️ Darsingiz boshlandi! Kirishingiz mumkin.\n` +
          `▶️ Ваш урок начался! Можно заходить.`,
        keyboard: openLesson,
      };
    case "rate_teacher": {
      const b = p.booking_id;
      const row = [1, 2, 3, 4, 5].map((n) => ({ text: `${n}⭐`, callback_data: `rate:${b}:${n}` }));
      return {
        text:
          `Dars tugadi. ${p.teacher_name ?? "O'qituvchi"}ni baholang:\n` +
          `Урок завершён. Оцените преподавателя ${p.teacher_name ?? ""}:`,
        keyboard: { inline_keyboard: [row] },
      };
    }
    default:
      return { text: template };
  }
}

async function handleUpdate(u: any): Promise<void> {
  // --- оценка звёздами (callback) ---
  if (u.callback_query) {
    const cq = u.callback_query;
    const data: string = cq.data ?? "";
    const chatId = cq.message?.chat?.id;
    if (data.startsWith("rate:")) {
      const [, bookingId, starsStr] = data.split(":");
      const { data: ok } = await admin.rpc("submit_telegram_rating", {
        p_chat_id: chatId,
        p_booking_id: bookingId,
        p_stars: Number(starsStr),
      });
      await tg("answerCallbackQuery", {
        callback_query_id: cq.id,
        text: ok ? "Rahmat! / Спасибо!" : "Xatolik / Не получилось",
      });
      if (ok) {
        await tg("editMessageText", {
          chat_id: chatId,
          message_id: cq.message.message_id,
          text: `✅ Bahoyingiz: ${starsStr}⭐ / Ваша оценка: ${starsStr}⭐. Rahmat! Спасибо!`,
        });
      }
    }
    return;
  }

  // --- сообщения ---
  const msg = u.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const text: string = msg.text ?? "";

  if (text.startsWith("/start")) {
    const token = text.split(/\s+/)[1];
    if (token) {
      const { data: ok } = await admin.rpc("consume_telegram_link_token", {
        p_token: token,
        p_chat_id: chatId,
        p_username: msg.chat.username ?? msg.from?.username ?? null,
      });
      await tg("sendMessage", {
        chat_id: chatId,
        text: ok
          ? "✅ Telegram ulandi! Darslar va to'lovlar haqida shu yerda xabar beramiz.\n" +
            "✅ Telegram подключён! Будем присылать сюда уведомления об уроках и оплатах."
          : "⚠️ Havola eskirgan. Ilovada «Подключить Telegram» tugmasini qayta bosing.\n" +
            "⚠️ Ссылка устарела. Нажмите «Подключить Telegram» в приложении ещё раз.",
        reply_markup: mainMenu(),
      });
    } else {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "IBILIM botiga xush kelibsiz! / Добро пожаловать в бот IBILIM!\n\n" +
          "Hisobni ulash uchun ilovada «Подключить Telegram» tugmasini bosing.\n" +
          "Чтобы подключить аккаунт — нажмите «Подключить Telegram» в приложении.",
        reply_markup: mainMenu(),
      });
    }
    return;
  }

  // любое другое сообщение → меню
  await tg("sendMessage", { chat_id: chatId, text: "Menyu / Меню:", reply_markup: mainMenu() });
}

// Разослать накопленные telegram-уведомления из notifications.
async function flushPending(): Promise<number> {
  const { data: rows } = await admin
    .from("notifications")
    .select("id,user_id,template,payload")
    .eq("channel", "telegram")
    .is("sent_at", null)
    .order("scheduled_at", { ascending: true })
    .limit(50);
  if (!rows?.length) return 0;

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: accs } = await admin
    .from("telegram_accounts")
    .select("user_id,chat_id")
    .in("user_id", userIds);
  const chatByUser = new Map((accs ?? []).map((a) => [a.user_id, a.chat_id]));

  const nowIso = new Date().toISOString();
  let sent = 0;
  for (const r of rows) {
    const chatId = chatByUser.get(r.user_id);
    if (!chatId) {
      // нет привязки — помечаем отправленным, чтобы очередь не копилась
      await admin.from("notifications").update({ sent_at: nowIso }).eq("id", r.id);
      continue;
    }
    const { text, keyboard } = render(r.template, r.payload ?? {});
    const res = await tg("sendMessage", { chat_id: chatId, text, reply_markup: keyboard });
    if (res?.ok) {
      await admin.from("notifications").update({ sent_at: nowIso }).eq("id", r.id);
      sent++;
    } else if (res?.error_code === 403) {
      // пользователь не нажал Start / заблокировал бота — не зацикливаемся
      await admin.from("notifications").update({ sent_at: nowIso }).eq("id", r.id);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (!BOT) return new Response("no bot token", { status: 500 });
  const url = new URL(req.url);

  // CRON: напоминания + рассылка
  if (url.searchParams.get("task") === "cron") {
    if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
    await admin.rpc("enqueue_lesson_reminders");
    const sent = await flushPending();
    return Response.json({ ok: true, sent });
  }

  if (req.method !== "POST") return new Response("ok"); // health-check

  // Webhook: проверяем секрет Telegram, если задан
  if (WEBHOOK_SECRET && req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  try {
    await handleUpdate(update);
  } catch (e) {
    console.error("handleUpdate error:", e);
  }
  return new Response("ok"); // Telegram нужен быстрый 200
});
