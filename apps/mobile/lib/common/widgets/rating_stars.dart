import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// Amber 5-star rating with fractional fill (e.g. 4.3 → 4 full + 30% star).
///
/// Optionally renders the numeric value and the reviews count next to stars:
/// `RatingStars(rating: 4.8, showValue: true, count: 24)`.
class RatingStars extends StatelessWidget {
  const RatingStars({
    super.key,
    required this.rating,
    this.size = 16,
    this.showValue = false,
    this.count,
  });

  /// 0..5
  final double rating;
  final double size;
  final bool showValue;
  final int? count;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final clamped = rating.clamp(0.0, 5.0);

    Widget row(Color color, IconData icon) => Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(
            5,
            (_) => Icon(icon, size: size, color: color),
          ),
        );

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          children: [
            row(
              Theme.of(context).brightness == Brightness.light
                  ? AppColors.zinc200
                  : AppColors.zinc700,
              Icons.star_rounded,
            ),
            ClipRect(
              clipper: _FractionClipper(clamped / 5),
              child: row(AppColors.accent, Icons.star_rounded),
            ),
          ],
        ),
        if (showValue) ...[
          SizedBox(width: size * 0.3),
          Text(
            clamped.toStringAsFixed(1),
            style: TextStyle(
              fontSize: size * 0.85,
              fontWeight: FontWeight.w700,
              color: scheme.onSurface,
            ),
          ),
          if (count != null)
            Text(
              ' ($count)',
              style: TextStyle(
                fontSize: size * 0.8,
                color: scheme.onSurfaceVariant,
              ),
            ),
        ],
      ],
    );
  }
}

class _FractionClipper extends CustomClipper<Rect> {
  const _FractionClipper(this.fraction);

  final double fraction;

  @override
  Rect getClip(Size size) =>
      Rect.fromLTRB(0, 0, size.width * fraction, size.height);

  @override
  bool shouldReclip(_FractionClipper oldClipper) =>
      oldClipper.fraction != fraction;
}
