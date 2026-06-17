-- Optional fixed price for the trial (first) lesson, in tiyin. A teacher can
-- offer the first lesson free (trial_free_enabled), at a percent discount
-- (trial_discount_pct), or at a fixed price they set here. teacher_subjects has
-- a table-level UPDATE/INSERT grant to authenticated, so no column grant needed.
alter table teacher_subjects
  add column if not exists trial_price bigint
  check (trial_price is null or trial_price > 0);
