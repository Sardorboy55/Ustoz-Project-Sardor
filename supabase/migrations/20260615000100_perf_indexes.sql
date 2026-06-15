-- Performance indexes for hot, user-facing read paths. Additive only.

-- Unread-notifications badge: .eq(user_id).is(read_at, null) runs on virtually
-- every cabinet navigation (web cabinet-shell) and the mobile unread badge, and
-- also backs the markAllRead UPDATE (same predicate). The existing
-- (user_id, scheduled_at desc) index leads with user_id but cannot prune
-- read_at, so it heap-checks all of a user's notifications. This partial index
-- contains only unread rows — tiny, and answers the count directly.
create index if not exists notifications_unread_by_user
  on notifications (user_id) where read_at is null;

-- Admin payout history sorts by resolved_at on resolved rows
-- (.neq(status,'pending').order(resolved_at desc)); both existing payout
-- indexes are on created_at, so that sort falls back to a full sort. Low volume
-- (admin-only) but the index is cheap and matches the query exactly.
create index if not exists payout_requests_resolved
  on payout_requests (resolved_at desc) where status <> 'pending';
