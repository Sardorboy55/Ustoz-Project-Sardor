-- Teacher-chosen trial lesson duration in minutes (e.g. 15, 20, 30, 45, 60).
-- NULL = no explicit choice; the UI falls back to the default 20-minute trial.
alter table teacher_subjects
  add column if not exists trial_duration_min int
  check (
    trial_duration_min is null
    or (trial_duration_min between 10 and 180 and trial_duration_min % 5 = 0)
  );
