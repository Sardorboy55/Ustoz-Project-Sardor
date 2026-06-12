-- ============ Storage buckets ============
-- avatars, intro-videos: public read, owner writes into their own folder <uid>/...
-- chat-files, homework: private (signed URLs), participants write into their own folder

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',      'avatars',      true,  5242880,   array['image/jpeg','image/png','image/webp']),
  ('intro-videos', 'intro-videos', true,  104857600, array['video/mp4','video/quicktime','video/webm']),
  ('chat-files',   'chat-files',   false, 20971520,  null),
  ('homework',     'homework',     false, 20971520,  null)
on conflict (id) do nothing;

-- owner-folder write pattern: first path segment must equal auth.uid()
create policy storage_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars','intro-videos','chat-files','homework')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_owner_update on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars','intro-videos','chat-files','homework')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars','intro-videos','chat-files','homework')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- public buckets are readable by anyone
create policy storage_public_read on storage.objects for select
  using (bucket_id in ('avatars','intro-videos'));

-- private buckets: owner reads own folder; chat/homework counterparties get
-- access via signed URLs issued by Edge Functions (Phase 5/6)
create policy storage_private_owner_read on storage.objects for select to authenticated
  using (
    bucket_id in ('chat-files','homework')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
