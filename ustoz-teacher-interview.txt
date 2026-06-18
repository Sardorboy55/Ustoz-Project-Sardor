-- ============================================================================
-- AI HR voice-interview gate for becoming a teacher — единый флоу заявки.
--
-- Порядок: кандидат заполняет АНКЕТУ (имя, предмет, описание, опыт) → грузит
-- ДОКУМЕНТЫ/дипломы (по желанию; дают бейдж «Профессиональный») → проходит
-- голосовое СОБЕСЕДОВАНИЕ (ElevenLabs, предмет известен заранее) → заявка идёт
-- на ПРОВЕРКУ. Профиль преподавателя создаётся ТОЛЬКО после одобрения админом.
-- Документы = только бейдж: собеседование обязательно для всех.
--
-- Все записи — только через SECURITY DEFINER функции (нет прямых grant на таблицу).
-- ============================================================================

create type teacher_application_status as enum (
  'interviewing',   -- анкета/собеседование в процессе
  'pending_review', -- собеседование завершено; ждёт оценки ИИ + проверки человеком
  'approved',       -- админ одобрил → пользователь стал преподавателем
  'rejected'        -- админ отклонил → можно подготовиться и попробовать снова
);

create table teacher_applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  subject_id       uuid references subjects(id) on delete set null,
  status           teacher_application_status not null default 'interviewing',
  -- Анкета (копируется в teacher_profiles при одобрении):
  full_name        text not null default '',
  headline         text not null default '',   -- краткое описание (одна строка)
  bio              text not null default '',    -- о себе
  experience_years int  not null default 0 check (experience_years between 0 and 80),
  document_urls    text[] not null default '{}',-- пути к дипломам/документам в Storage
  -- Собеседование / оценка:
  conversation_id  text,
  ai_passed        boolean,
  ai_score         int,
  ai_summary       text,
  transcript       jsonb,
  recording_url    text,
  -- Решение человека:
  review_note      text,
  reviewer_id      uuid references profiles(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index teacher_applications_user_idx   on teacher_applications (user_id, created_at desc);
create index teacher_applications_status_idx on teacher_applications (status, created_at desc);

alter table teacher_applications enable row level security;

-- Владелец читает свои заявки (статус на экране заявки).
create policy teacher_applications_select_own on teacher_applications
  for select using ((select auth.uid()) = user_id);

-- Админы читают всё (очередь на проверку).
create policy teacher_applications_select_admin on teacher_applications
  for select using (is_admin());

-- INSERT/UPDATE/DELETE политик нет: все изменения — через RPC ниже.

-- ============================================================================
-- Бейдж «Профессиональный» (есть подтверждённые документы) на профиле.
-- ============================================================================
alter table teacher_profiles
  add column if not exists is_professional boolean not null default false;

-- ============================================================================
-- Storage: приватный бакет для документов/дипломов. Файлы лежат под {user_id}/...
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('teacher-docs', 'teacher-docs', false)
  on conflict (id) do nothing;

drop policy if exists "teacher docs insert own" on storage.objects;
create policy "teacher docs insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'teacher-docs'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "teacher docs read own" on storage.objects;
create policy "teacher docs read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'teacher-docs'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "teacher docs read admin" on storage.objects;
create policy "teacher docs read admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'teacher-docs' and is_admin());

drop policy if exists "teacher docs delete own" on storage.objects;
create policy "teacher docs delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'teacher-docs'
         and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ============================================================================
-- Внутренняя: создать профиль преподавателя для произвольного пользователя.
-- Вынесено из become_teacher(), чтобы одобрение админом провижнило за кандидата.
-- ============================================================================
create or replace function public._provision_teacher(p_uid uuid)
returns teacher_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_base text;
  v_slug text;
  i      int := 0;
  v_row  teacher_profiles;
begin
  if p_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from teacher_profiles where user_id = p_uid;
  if found then
    update profiles set is_teacher = true where id = p_uid;  -- ensure flag (re-approval after reset)
    return v_row;  -- idempotent
  end if;

  select full_name into v_name from profiles where id = p_uid;
  v_base := trim(both '-' from lower(regexp_replace(coalesce(v_name,''), '[^a-zA-Z0-9]+', '-', 'g')));
  if v_base = '' then v_base := 'ustoz'; end if;

  v_slug := v_base;
  while exists (select 1 from teacher_profiles where slug = v_slug) loop
    i := i + 1;
    v_slug := v_base || '-' || i::text;
  end loop;

  insert into teacher_profiles (user_id, slug) values (p_uid, v_slug) returning * into v_row;
  insert into wallets (teacher_id) values (p_uid) on conflict do nothing;
  update profiles set is_teacher = true where id = p_uid;
  return v_row;
end $$;

-- become_teacher() теперь делегирует общей функции провижна.
create or replace function public.become_teacher()
returns teacher_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  return public._provision_teacher(v_uid);
end $$;

-- ============================================================================
-- upsert_teacher_application — сохранить анкету (создать или обновить черновик).
-- Идемпотентно: переиспользует открытую заявку кандидата (interviewing).
-- ============================================================================
create or replace function public.upsert_teacher_application(
  p_subject_id uuid,
  p_full_name text,
  p_headline text default '',
  p_bio text default '',
  p_experience_years int default 0
)
returns teacher_applications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row teacher_applications;
  v_exp int := greatest(0, least(80, coalesce(p_experience_years, 0)));
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  -- Гейт по флагу is_teacher (а не по наличию профиля): так аккаунт можно
  -- «сбросить» в обычного пользователя простым is_teacher=false и пройти флоу заново.
  if coalesce((select is_teacher from profiles where id = v_uid), false) then
    raise exception 'ALREADY_TEACHER';
  end if;
  if p_subject_id is null or not exists (select 1 from subjects where id = p_subject_id) then
    raise exception 'SUBJECT_NOT_FOUND';
  end if;

  select * into v_row
  from teacher_applications
  where user_id = v_uid and status = 'interviewing'
  order by created_at desc
  limit 1;

  if found then
    update teacher_applications set
      subject_id       = p_subject_id,
      full_name        = coalesce(p_full_name, ''),
      headline         = coalesce(p_headline, ''),
      bio              = coalesce(p_bio, ''),
      experience_years = v_exp,
      updated_at       = now()
    where id = v_row.id
    returning * into v_row;
    return v_row;
  end if;

  insert into teacher_applications
    (user_id, subject_id, full_name, headline, bio, experience_years)
    values (v_uid, p_subject_id, coalesce(p_full_name,''), coalesce(p_headline,''),
            coalesce(p_bio,''), v_exp)
    returning * into v_row;
  return v_row;
end $$;

-- ============================================================================
-- set_teacher_application_documents — записать пути к загруженным документам.
-- ============================================================================
create or replace function public.set_teacher_application_documents(
  p_application_id uuid,
  p_document_urls text[]
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update teacher_applications
    set document_urls = coalesce(p_document_urls, '{}'), updated_at = now()
    where id = p_application_id and user_id = v_uid and status = 'interviewing';
  if not found then raise exception 'APPLICATION_NOT_OPEN'; end if;
end $$;

-- ============================================================================
-- submit_teacher_application — кандидат отмечает собеседование завершённым.
-- Требует заполненную анкету (имя + предмет).
-- ============================================================================
create or replace function public.submit_teacher_application(
  p_application_id uuid,
  p_conversation_id text default null
)
returns teacher_applications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row teacher_applications;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  update teacher_applications
    set status = 'pending_review',
        conversation_id = coalesce(p_conversation_id, conversation_id),
        updated_at = now()
    where id = p_application_id
      and user_id = v_uid
      and status = 'interviewing'
      and length(trim(full_name)) > 0
      and subject_id is not null
    returning * into v_row;

  if not found then
    raise exception 'APPLICATION_NOT_READY';
  end if;
  return v_row;
end $$;

-- ============================================================================
-- admin_review_teacher_application — решение человека после прослушивания.
-- Одобрение: провижн преподавателя + перенос анкеты + бейдж «Профессиональный»
-- (если есть документы). Отказ — можно повторить.
-- ============================================================================
create or replace function public.admin_review_teacher_application(
  p_application_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_app teacher_applications;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into v_app from teacher_applications where id = p_application_id;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;

  update teacher_applications
    set status      = case when p_approve then 'approved' else 'rejected' end,
        review_note = p_note,
        reviewer_id = auth.uid(),
        reviewed_at = now(),
        updated_at  = now()
    where id = p_application_id;

  if p_approve then
    -- Имя из анкеты → profiles (нужно до провижна: из него строится slug).
    if length(trim(coalesce(v_app.full_name, ''))) > 0 then
      update profiles set full_name = v_app.full_name where id = v_app.user_id;
    end if;

    perform public._provision_teacher(v_app.user_id);

    -- Перенос анкеты в профиль + бейдж «Профессиональный» при наличии документов.
    update teacher_profiles set
      headline_ru     = coalesce(nullif(v_app.headline, ''), headline_ru),
      headline_uz     = coalesce(nullif(v_app.headline, ''), headline_uz),
      bio_ru          = coalesce(nullif(v_app.bio, ''), bio_ru),
      bio_uz          = coalesce(nullif(v_app.bio, ''), bio_uz),
      experience_years = v_app.experience_years,
      is_professional  = (array_length(v_app.document_urls, 1) is not null)
    where user_id = v_app.user_id;
  end if;

  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(),
            case when p_approve then 'teacher_application_approve' else 'teacher_application_reject' end,
            'teacher_applications', p_application_id::text,
            jsonb_build_object('approve', p_approve, 'note', p_note, 'user_id', v_app.user_id));
end $$;

-- Гранты: анкета/документы/отправка — для authenticated; admin_review — is_admin() внутри.
revoke execute on function public._provision_teacher(uuid) from public, anon;
revoke execute on function public.upsert_teacher_application(uuid, text, text, text, int) from public, anon;
revoke execute on function public.set_teacher_application_documents(uuid, text[]) from public, anon;
revoke execute on function public.submit_teacher_application(uuid, text) from public, anon;
revoke execute on function public.admin_review_teacher_application(uuid, boolean, text) from public, anon;
grant execute on function public.upsert_teacher_application(uuid, text, text, text, int) to authenticated;
grant execute on function public.set_teacher_application_documents(uuid, text[]) to authenticated;
grant execute on function public.submit_teacher_application(uuid, text) to authenticated;
grant execute on function public.admin_review_teacher_application(uuid, boolean, text) to authenticated;
