import 'package:intl/intl.dart';

/// Display timezone is fixed to Asia/Tashkent (UTC+5, no DST) per product spec.
/// DB stores `timestamptz` (UTC); convert before rendering.
const tashkentOffset = Duration(hours: 5);

/// Returns a DateTime whose wall-clock fields show Tashkent time.
/// (The result is only for formatting — do not compare it with local times.)
DateTime toTashkent(DateTime dt) => dt.toUtc().add(tashkentOffset);

/// "YYYY-MM-DD" calendar date of [dt] in Tashkent — timezone-independent key
/// for date-bounded RPCs (e.g. get_free_slots). Mirrors web's tashkentDateKey.
String tashkentDateKey(DateTime dt) =>
    toTashkent(dt).toIso8601String().substring(0, 10);

/// "12.06" — short day.month.
String formatTkDayMonth(DateTime dt) {
  final t = toTashkent(dt);
  return '${t.day.toString().padLeft(2, '0')}.${t.month.toString().padLeft(2, '0')}';
}

/// "14:30" in Tashkent time.
String formatTkTime(DateTime dt) {
  final t = toTashkent(dt);
  return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
}

/// "12 iyun, 14:30" / "12 июня, 14:30" in Tashkent time.
String formatTkDateTime(DateTime dt, String localeCode) {
  final t = toTashkent(dt);
  final date = DateFormat('d MMMM', localeCode).format(t);
  return '$date, ${formatTkTime(dt)}';
}

/// "Juma, 12 iyun" / "Пятница, 12 июня".
String formatTkWeekdayDate(DateTime dt, String localeCode) {
  final t = toTashkent(dt);
  final s = DateFormat('EEEE, d MMMM', localeCode).format(t);
  return s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

/// Short weekday label, e.g. "Ju" / "пт".
String formatTkWeekdayShort(DateTime dt, String localeCode) {
  final t = toTashkent(dt);
  return DateFormat('E', localeCode).format(t);
}

/// True when [dt] falls on the same Tashkent calendar day as [other].
bool isSameTkDay(DateTime dt, DateTime other) {
  final a = toTashkent(dt);
  final b = toTashkent(other);
  return a.year == b.year && a.month == b.month && a.day == b.day;
}
