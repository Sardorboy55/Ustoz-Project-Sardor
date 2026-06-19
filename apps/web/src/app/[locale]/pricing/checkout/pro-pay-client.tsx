"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Paperclip, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/button";

type State = "loading" | "guest" | "not_teacher" | "ready" | "sent";

/**
 * Оплата Pro по QR (ручное подтверждение админом). Преподаватель платит на счёт
 * Paynet, грузит чек → submit_pro_payment → «на проверке». После подтверждения
 * админом подписка Pro активируется.
 */
export function ProPayClient({ priceLabel }: { priceLabel: string }) {
  const [state, setState] = useState<State>("loading");
  const [uid, setUid] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    queueMicrotask(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setState("guest");
      setUid(user.id);

      const { data: tp } = await supabase
        .from("teacher_profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!tp) return setState("not_teacher");

      const { data: pay } = await supabase
        .from("manual_payments")
        .select("id")
        .eq("purpose", "pro")
        .eq("status", "pending")
        .maybeSingle();
      setState(pay ? "sent" : "ready");
    });
  }, []);

  const onReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !uid) return;
    if (file.size > 10 * 1024 * 1024) {
      setErr("Файл больше 10 МБ.");
      return;
    }
    setUploading(true);
    setErr(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${uid}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("payment-receipts")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      setErr("Не удалось загрузить файл.");
      return;
    }
    const { error: rpcErr } = await supabase.rpc("submit_pro_payment", {
      p_receipt_path: path,
    });
    setUploading(false);
    if (rpcErr) {
      setErr("Не удалось отправить чек. Попробуйте ещё раз.");
      return;
    }
    setState("sent");
  };

  if (state === "loading") {
    return (
      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </aside>
    );
  }

  if (state === "guest") {
    return (
      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-600">Войдите, чтобы оформить Pro.</p>
        <ButtonLink href="/auth?next=/pricing/checkout" className="mt-3 w-full">
          Войти
        </ButtonLink>
      </aside>
    );
  }

  if (state === "not_teacher") {
    return (
      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-zinc-600">
          Pro доступен преподавателям. Сначала станьте преподавателем.
        </p>
        <ButtonLink href="/become-teacher" variant="secondary" className="mt-3 w-full">
          Стать преподавателем
        </ButtonLink>
      </aside>
    );
  }

  if (state === "sent") {
    return (
      <aside className="h-fit rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
        <BadgeCheck size={28} className="mx-auto text-amber-600" aria-hidden="true" />
        <p className="mt-2 font-bold text-amber-800">Оплата на проверке</p>
        <p className="mt-1 text-sm text-amber-700">
          Мы проверим поступление и активируем Pro. Обычно это занимает немного
          времени.
        </p>
        <Link href="/cabinet" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
          В личный кабинет
        </Link>
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      <div className="flex items-center justify-center gap-2">
        <QrCode size={18} className="text-brand-600" aria-hidden="true" />
        <p className="text-sm font-bold text-zinc-900">Оплата через Paynet</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/paynet-qr.png"
        alt="QR Paynet"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        className="mx-auto mt-4 h-44 w-44 rounded-2xl border border-zinc-200 bg-white object-contain"
      />
      <p className="mt-3 text-sm text-zinc-700">
        Отсканируйте QR в <span className="font-semibold">Paynet</span> (или
        оплатите на счёт ниже) на сумму{" "}
        <span className="font-semibold">{priceLabel}</span>.
      </p>
      <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-left text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-zinc-500">Получатель</span>
          <span className="font-semibold text-zinc-900">TEMUR BASHIROV</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span className="text-zinc-500">Счёт</span>
          <span className="font-mono font-semibold text-zinc-900">
            8888012884806485
          </span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onReceipt}
        className="hidden"
      />
      <Button
        className="mt-4 w-full"
        loading={uploading}
        onClick={() => fileRef.current?.click()}
      >
        <Paperclip size={16} aria-hidden="true" />
        Я оплатил — загрузить чек
      </Button>
      {err && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {err}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500">
        После проверки администратором Pro активируется автоматически.
      </p>
    </aside>
  );
}
