-- Extensions required by the schema
create extension if not exists btree_gist;   -- uuid equality inside GiST exclusion constraint (bookings anti double-booking)
create extension if not exists pg_trgm;      -- trigram text search for catalog (Phase 2)
