-- The "История" (Tarix) subject was seeded with a mojibake Russian name
-- ("РСЃС‚РѕСЂРёСЏ" — double-encoded UTF-8). name_uz/slug were fine; fix name_ru.
update subjects
  set name_ru = 'История'
  where id = '0f567f18-305f-4841-aa39-6d43e119230e'
    and name_ru <> 'История';
