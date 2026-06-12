"use client";

// Настройки платформы (app_settings). Деньги показываем в сумах,
// храним в тийинах. Сохранение по ключу с подтверждением и аудит-логом.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { logAdminAction } from "@/lib/audit";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "@/components/ui";

type FieldKind = "money" | "int" | "bool";

const KNOWN_FIELDS: { key: string; label: string; unit?: string; kind: FieldKind }[] = [
  { key: "pro_price", label: "Цена PRO-подписки", unit: "сум/мес", kind: "money" },
  {
    key: "free_monthly_lessons_limit",
    label: "Лимит уроков FREE-преподавателя",
    unit: "уроков/мес",
    kind: "int",
  },
  { key: "cancel_window_hours", label: "Окно бесплатной отмены", unit: "ч", kind: "int" },
  { key: "payout_hold_hours", label: "Холд выплат после урока", unit: "ч", kind: "int" },
  { key: "payout_min_amount", label: "Минимальная выплата", unit: "сум", kind: "money" },
  { key: "acquiring_pct", label: "Комиссия эквайринга", unit: "%", kind: "int" },
  { key: "chat_masking_enabled", label: "Маскировка контактов в чате", kind: "bool" },
  {
    key: "pending_payment_ttl_min",
    label: "TTL неоплаченной брони",
    unit: "мин",
    kind: "int",
  },
];

const KNOWN_KEYS = new Set(KNOWN_FIELDS.map((f) => f.key));

async function fetchSettings(): Promise<Map<string, unknown>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.key, row.value]));
}

/** jsonb-значение → строка для инпута */
function toInput(kind: FieldKind, value: unknown): string {
  if (value == null) return "";
  if (kind === "money") return String(Math.round(Number(value) / 100));
  if (kind === "bool") return value === true || value === "true" ? "true" : "false";
  return String(value);
}

/** строка из инпута → jsonb-значение для БД */
function toDb(kind: FieldKind, input: string): unknown {
  if (kind === "money") return Math.round(Number(input)) * 100;
  if (kind === "bool") return input === "true";
  return Math.round(Number(input));
}

export default function SettingsPage() {
  const toast = useToast();

  const [attempt, setAttempt] = useState(0);
  const [settings, setSettings] = useState<Map<string, unknown> | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // loading = settings === null; сбрасываем в обработчиках, не в эффекте
  const retry = useCallback(() => {
    setError(false);
    setSettings(null);
    setEdited({});
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setError(false);
      })
      .catch((e) => {
        console.error("settings load failed:", e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // json-ключи: всё, что не в известном списке
  const jsonKeys = settings
    ? Array.from(settings.keys())
        .filter((k) => !KNOWN_KEYS.has(k))
        .sort()
    : [];

  const knownField = KNOWN_FIELDS.find((f) => f.key === confirmKey);
  const isJsonKey = confirmKey !== null && !knownField;

  const currentInput = (key: string, kind?: FieldKind): string => {
    if (key in edited) return edited[key];
    const value = settings?.get(key);
    if (kind) return toInput(kind, value);
    return JSON.stringify(value, null, 2) ?? "";
  };

  const isDirty = (key: string, kind?: FieldKind): boolean => {
    if (!(key in edited)) return false;
    const original = kind
      ? toInput(kind, settings?.get(key))
      : (JSON.stringify(settings?.get(key), null, 2) ?? "");
    return edited[key] !== original;
  };

  const validate = (key: string): string | null => {
    const field = KNOWN_FIELDS.find((f) => f.key === key);
    const input = currentInput(key, field?.kind);
    if (field) {
      if (field.kind === "bool") return null;
      const n = Number(input);
      if (!Number.isFinite(n) || n < 0) return "Введите неотрицательное число.";
      return null;
    }
    try {
      JSON.parse(input);
      return null;
    } catch {
      return "Невалидный JSON — проверьте кавычки и запятые.";
    }
  };

  const askSave = (key: string) => {
    const err = validate(key);
    if (err) {
      toast(err, "error");
      return;
    }
    setConfirmKey(key);
  };

  const save = async () => {
    if (!confirmKey || !settings) return;
    const field = KNOWN_FIELDS.find((f) => f.key === confirmKey);
    const input = currentInput(confirmKey, field?.kind);
    const newValue = field ? toDb(field.kind, input) : JSON.parse(input);
    const oldValue = settings.get(confirmKey);

    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase
      .from("app_settings")
      .upsert({ key: confirmKey, value: newValue }, { onConflict: "key" });
    setBusy(false);
    if (e) {
      console.error("setting save failed:", e);
      toast("Не удалось сохранить настройку. Попробуйте ещё раз.", "error");
      return;
    }
    await logAdminAction("app_setting_update", "app_settings", confirmKey, {
      old: oldValue ?? null,
      new: newValue,
    });
    toast("Настройка сохранена");
    setConfirmKey(null);
    retry();
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={AlertCircle}
          title="Не удалось загрузить настройки"
          text="Проверьте соединение и попробуйте ещё раз."
          action={<Button onClick={retry}>Повторить</Button>}
        />
      </Card>
    );
  }

  if (settings === null) {
    return (
      <div className="space-y-4">
        <Card title="Основные настройки">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Основные настройки">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {KNOWN_FIELDS.map((field) => (
            <div key={field.key} className="flex items-end gap-2">
              <div className="flex-1">
                {field.kind === "bool" ? (
                  <Select
                    label={field.label}
                    value={currentInput(field.key, field.kind)}
                    onChange={(e) =>
                      setEdited((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  >
                    <option value="true">Включена</option>
                    <option value="false">Выключена</option>
                  </Select>
                ) : (
                  <Input
                    label={field.unit ? `${field.label} (${field.unit})` : field.label}
                    type="number"
                    min={0}
                    value={currentInput(field.key, field.kind)}
                    onChange={(e) =>
                      setEdited((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </div>
              <Button
                variant="secondary"
                disabled={!isDirty(field.key, field.kind)}
                onClick={() => askSave(field.key)}
              >
                Сохранить
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Расширенные настройки (JSON)">
        {jsonKeys.length === 0 ? (
          <EmptyState
            icon={Settings2}
            title="Дополнительных ключей нет"
            text="JSON-настройки (xp_rules, level_thresholds и другие) появятся здесь."
          />
        ) : (
          <div className="space-y-4">
            {jsonKeys.map((key) => (
              <div key={key} className="flex items-start gap-2">
                <div className="flex-1">
                  <Textarea
                    label={key}
                    className="font-mono text-xs"
                    rows={Math.min(8, (currentInput(key).match(/\n/g)?.length ?? 0) + 2)}
                    value={currentInput(key)}
                    onChange={(e) =>
                      setEdited((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
                <Button
                  variant="secondary"
                  className="mt-6"
                  disabled={!isDirty(key)}
                  onClick={() => askSave(key)}
                >
                  Сохранить
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={confirmKey !== null}
        onClose={() => setConfirmKey(null)}
        title="Сохранить настройку?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmKey(null)}>
              Отмена
            </Button>
            <Button loading={busy} onClick={save}>
              Сохранить
            </Button>
          </>
        }
      >
        {confirmKey && (
          <div className="space-y-2 text-sm">
            <p className="text-zinc-600">
              Ключ <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">{confirmKey}</code>
              {knownField ? ` — ${knownField.label}.` : "."}
            </p>
            {isJsonKey ? (
              <p className="text-zinc-500">
                Новое JSON-значение вступит в силу сразу для всей платформы.
              </p>
            ) : (
              <p className="text-zinc-500">
                Новое значение:{" "}
                <strong>
                  {currentInput(confirmKey, knownField?.kind)}
                  {knownField?.unit ? ` ${knownField.unit}` : ""}
                </strong>
                . Изменение вступит в силу сразу.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
