-- ============================================================================
-- Закрываем «чёрный ход»: become_teacher делал преподавателем МГНОВЕННО
-- (через _provision_teacher), минуя анкету + документы + AI-собеседование +
-- проверку админом. Теперь прямой вызов запрещён — стать преподавателем можно
-- ТОЛЬКО через флоу заявки (submit_teacher_application →
-- admin_review_teacher_application, который и зовёт _provision_teacher).
-- Идемпотентно (create or replace).
-- ============================================================================

create or replace function public.become_teacher()
returns teacher_profiles
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'USE_INTERVIEW_FLOW';
end $$;
