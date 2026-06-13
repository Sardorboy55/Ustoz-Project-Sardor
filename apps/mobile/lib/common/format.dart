import 'dart:ui';

/// Formats a DB money amount (integer **tiyin**) for display:
/// `8000000` → `"80 000 so'm"` (uz) / `"80 000 сум"` (ru).
///
/// The single source of truth for money rendering — do not re-implement.
String formatTiyin(num tiyin, Locale locale) {
  final uzs = (tiyin / 100).round();
  final digits = uzs.abs().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+$)'),
        (m) => '${m[1]} ',
      );
  final sign = uzs < 0 ? '-' : '';
  final currency = locale.languageCode == 'ru' ? 'сум' : "so'm";
  return '$sign$digits $currency';
}

/// Same as [formatTiyin] but without the currency word — for tight layouts
/// where the currency is rendered separately.
String formatTiyinBare(num tiyin) {
  final uzs = (tiyin / 100).round();
  final digits = uzs.abs().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+$)'),
        (m) => '${m[1]} ',
      );
  return uzs < 0 ? '-$digits' : digits;
}
