-- The faq column was added (20260615000600) after the column-level UPDATE grant
-- on teacher_profiles, so teachers got "permission denied for column faq" when
-- saving their FAQ. Grant UPDATE on the column to close the gap.
grant update (faq) on teacher_profiles to authenticated;
