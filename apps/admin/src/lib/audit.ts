import { createClient } from "@/lib/supabase";

/**
 * Записывает действие админа в admin_audit_log (RLS: только свой uid).
 * Вызывать ПОСЛЕ успешного действия. Ошибка лога не должна ломать UX —
 * возвращаем boolean, наверх не бросаем.
 */
export async function logAdminAction(
  action: string,
  entity: string,
  entityId: string | null,
  payload: Record<string, unknown> = {},
): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("admin_audit_log").insert({
    admin_id: user.id,
    action,
    entity,
    entity_id: entityId,
    payload,
  });
  if (error) {
    console.error("admin_audit_log insert failed:", error.message);
    return false;
  }
  return true;
}
