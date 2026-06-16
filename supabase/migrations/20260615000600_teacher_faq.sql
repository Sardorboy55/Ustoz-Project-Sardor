-- Teacher-authored FAQ shown on the public profile. Array of {q, a} objects.
-- Additive; the teacher edits it from the cabinet (RLS already lets a teacher
-- update their own teacher_profiles row), and it is publicly readable like the
-- rest of the profile.
alter table teacher_profiles
  add column if not exists faq jsonb not null default '[]'::jsonb;
