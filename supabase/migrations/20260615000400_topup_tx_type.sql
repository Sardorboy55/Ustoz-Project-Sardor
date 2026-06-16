-- Add a 'topup' transaction type for balance top-ups. Kept in its own migration
-- so the new enum value is committed before the next migration uses it
-- (Postgres can't use a freshly-added enum value in the same transaction).
alter type wallet_tx_type add value if not exists 'topup';
