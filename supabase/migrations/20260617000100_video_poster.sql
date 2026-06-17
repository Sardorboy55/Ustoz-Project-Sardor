-- Optional cover image (poster) for the teacher's intro video, shown before the
-- video is played. Additive; teacher uploads it from the cabinet. Remember the
-- column-level UPDATE grant — RLS alone is not enough (see 20260617000000).
alter table teacher_profiles
  add column if not exists intro_video_poster_url text;

grant update (intro_video_poster_url) on teacher_profiles to authenticated;
