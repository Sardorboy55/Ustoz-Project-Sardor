#!/usr/bin/env bash
# Phase 3 acceptance: booking flow + concurrent double-booking + cancel policy.
set -u
BASE="http://127.0.0.1:54321"
KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
PSQL="docker exec supabase_db_ustoz psql -U postgres -d postgres -t -A -c"

login() { # phone -> access_token
  curl -s -X POST "$BASE/auth/v1/otp" -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"phone\":\"$1\"}" > /dev/null
  curl -s -X POST "$BASE/auth/v1/verify" -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"type\":\"sms\",\"phone\":\"$1\",\"token\":\"123456\"}" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])"
}

echo "== logins =="
STUDENT=$(login "+998900000010"); echo "student token: ${#STUDENT} chars"
AZIZA=$(login "+998900000001");  echo "aziza token: ${#AZIZA} chars"

TS_ID=$($PSQL "select ts.id from teacher_subjects ts join subjects s on s.id=ts.subject_id where ts.teacher_id='00000000-0000-4000-a000-000000000001' and s.slug='ingliz-tili';")
echo "teacher_subject: $TS_ID"

book() { # token startAt duration kind -> http_code + body
  curl -s -w "\n%{http_code}" -X POST "$BASE/functions/v1/booking-create" \
    -H "apikey: $KEY" -H "Authorization: Bearer $1" -H "Content-Type: application/json" \
    -d "{\"teacherSubjectId\":\"$TS_ID\",\"startAt\":\"$2\",\"durationMin\":$3,\"kind\":\"$4\"}"
}

echo; echo "== 1. regular booking (Sat 10:00 Tashkent) =="
book "$STUDENT" "2026-06-13T10:00:00+05:00" 60 regular | tail -2

echo; echo "== 2. CONCURRENT double-booking same slot (Sat 11:00) =="
book "$STUDENT" "2026-06-13T11:00:00+05:00" 60 regular > /tmp/b1.out 2>&1 &
book "$STUDENT" "2026-06-13T11:00:00+05:00" 60 regular > /tmp/b2.out 2>&1 &
wait
echo "--- request A: $(tail -1 /tmp/b1.out) | $(head -c 120 /tmp/b1.out)"
echo "--- request B: $(tail -1 /tmp/b2.out) | $(head -c 120 /tmp/b2.out)"

echo; echo "== 3. free trial 20 min (Sat 12:00) =="
book "$STUDENT" "2026-06-13T12:00:00+05:00" 20 trial_free | tail -2

echo; echo "== 4. second free trial must fail =="
book "$STUDENT" "2026-06-13T12:30:00+05:00" 20 trial_free | tail -2

echo; echo "== 5. reminders scheduled =="
$PSQL "select template, channel, count(*) from notifications group by 1,2 order by 1,2;"

echo; echo "== 6. student cancels trial (>=12h -> allowed, status cancelled_by_student) =="
TRIAL_ID=$($PSQL "select id from bookings where kind='trial_free' limit 1;")
curl -s -X POST "$BASE/functions/v1/booking-cancel" \
  -H "apikey: $KEY" -H "Authorization: Bearer $STUDENT" -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$TRIAL_ID\",\"reason\":\"test\"}"
echo

echo; echo "== 7. teacher cancels the 10:00 booking -> strike =="
B_ID=$($PSQL "select id from bookings where status='pending_payment' order by start_at limit 1;")
curl -s -X POST "$BASE/functions/v1/booking-cancel" \
  -H "apikey: $KEY" -H "Authorization: Bearer $AZIZA" -H "Content-Type: application/json" \
  -d "{\"bookingId\":\"$B_ID\"}"
echo
$PSQL "select cancel_strikes from teacher_profiles where user_id='00000000-0000-4000-a000-000000000001';"

echo; echo "== 8. final bookings state =="
$PSQL "select kind, status, duration_min, price from bookings order by start_at;"
