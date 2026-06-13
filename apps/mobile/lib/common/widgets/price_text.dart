import 'package:flutter/material.dart';

import '../format.dart';

/// Renders a DB money amount (integer **tiyin**) localized:
/// `PriceText(8000000)` → "80 000 so'm" / "80 000 сум".
///
/// [suffix] is appended verbatim (e.g. "/60 daq"), [prefix] prepended
/// (e.g. "dan " / "от ").
class PriceText extends StatelessWidget {
  const PriceText(
    this.tiyin, {
    super.key,
    this.style,
    this.prefix,
    this.suffix,
  });

  final num tiyin;
  final TextStyle? style;
  final String? prefix;
  final String? suffix;

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final defaultStyle = Theme.of(context)
        .textTheme
        .titleMedium
        ?.copyWith(fontWeight: FontWeight.w700);
    return Text(
      '${prefix ?? ''}${formatTiyin(tiyin, locale)}${suffix ?? ''}',
      style: style ?? defaultStyle,
    );
  }
}
