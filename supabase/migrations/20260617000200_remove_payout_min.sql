-- Remove the 50 000 UZS minimum payout: teachers can withdraw any positive
-- amount. wallet_request_payout reads the floor from app_settings
-- ('payout_min_amount', default 5 000 000 tiyin) — set it to 1 tiyin (≈ none).
insert into app_settings (key, value)
  values ('payout_min_amount', '1'::jsonb)
  on conflict (key) do update set value = excluded.value;
