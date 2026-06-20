-- ============================================================================
-- handle_new_user: при регистрации (любой провайдер — телефон, email, Google)
-- подхватываем имя из метаданных в profiles.full_name. Раньше имя не копировалось,
-- и Google/телефон-регистрации создавали профиль с пустым именем.
-- Идемпотентно (create or replace).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, locale, full_name)
  values (
    new.id,
    coalesce(new.phone, new.email, new.id::text),
    'uz',
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  )
  on conflict (id) do nothing;

  insert into public.gamification (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;
