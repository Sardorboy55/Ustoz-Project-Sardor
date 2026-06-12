-- ============ Fable5: admin write capabilities ============
-- docs/06 requires the admin panel to ban users, moderate reviews, manage
-- categories/subjects, edit app_settings and close support tickets. Until now
-- only SELECT policies existed for admins. Additive: new policies + narrow
-- grants; where a permissive self-policy already exists on the table
-- (profiles, teacher_profiles) we use SECURITY DEFINER functions instead of
-- column grants, so regular users cannot touch admin-only columns.

-- ---------- categories & subjects: admin CRUD ----------
grant insert, update, delete on categories to authenticated;
grant insert, update, delete on subjects   to authenticated;

create policy categories_admin_insert on categories for insert with check (is_admin());
create policy categories_admin_update on categories for update using (is_admin()) with check (is_admin());
create policy categories_admin_delete on categories for delete using (is_admin());

create policy subjects_admin_insert on subjects for insert with check (is_admin());
create policy subjects_admin_update on subjects for update using (is_admin()) with check (is_admin());
create policy subjects_admin_delete on subjects for delete using (is_admin());

-- ---------- reviews: admin hide/show (docs/06 §10) ----------
grant update (is_hidden) on reviews to authenticated;
create policy reviews_admin_update on reviews for update using (is_admin()) with check (is_admin());

-- ---------- app_settings: admin edits (docs/06 §12) ----------
grant insert, update on app_settings to authenticated;
create policy app_settings_admin_insert on app_settings for insert with check (is_admin());
create policy app_settings_admin_update on app_settings for update using (is_admin()) with check (is_admin());

-- ---------- moderation queue: admin resolves (docs/06 §4) ----------
grant update on moderation_queue to authenticated;
create policy moderation_queue_admin_update on moderation_queue for update
  using (is_admin()) with check (is_admin());

-- ---------- support tickets: admin replies/closes (docs/06 §13) ----------
grant update (status, admin_id, admin_reply, resolved_at) on support_tickets to authenticated;
create policy support_tickets_admin_update on support_tickets for update
  using (is_admin()) with check (is_admin());

-- ---------- audit log: admins write their own entries ----------
grant insert on admin_audit_log to authenticated;
create policy admin_audit_log_insert on admin_audit_log for insert with check (
  is_admin() and admin_id = (select auth.uid())
);

-- ---------- ban/unban user (profiles has a permissive self-policy → function) ----------
create or replace function public.admin_set_user_banned(
  p_user_id uuid, p_banned boolean, p_comment text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;

  update profiles set is_banned = p_banned where id = p_user_id;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(), case when p_banned then 'user_ban' else 'user_unban' end,
            'profiles', p_user_id::text, jsonb_build_object('comment', p_comment));
end $$;

-- ---------- teacher moderation flags (teacher_profiles self-policy → function) ----------
-- Pass null to leave a flag unchanged. p_reset_strikes clears cancel_strikes.
create or replace function public.admin_set_teacher_flags(
  p_teacher_id uuid,
  p_moderation_flag boolean default null,
  p_is_verified boolean default null,
  p_reset_strikes boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;

  update teacher_profiles set
    moderation_flag = coalesce(p_moderation_flag, moderation_flag),
    is_verified     = coalesce(p_is_verified, is_verified),
    cancel_strikes  = case when p_reset_strikes then 0 else cancel_strikes end
  where user_id = p_teacher_id;
  if not found then raise exception 'TEACHER_NOT_FOUND'; end if;

  insert into admin_audit_log (admin_id, action, entity, entity_id, payload)
    values (auth.uid(), 'teacher_flags_update', 'teacher_profiles', p_teacher_id::text,
            jsonb_build_object('moderation_flag', p_moderation_flag,
                               'is_verified', p_is_verified,
                               'reset_strikes', p_reset_strikes));
end $$;

revoke execute on function public.admin_set_user_banned(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_set_teacher_flags(uuid, boolean, boolean, boolean) from public, anon;
