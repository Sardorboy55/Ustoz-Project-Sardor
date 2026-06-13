import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../l10n/app_localizations.dart';

/// Amber "PRO" badge for pro-tier teachers.
class ProBadge extends StatelessWidget {
  const ProBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Text(
        'PRO',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.5,
          color: Color(0xFF92400E), // amber-800
        ),
      ),
    );
  }
}

/// Teal check for verified teachers. [withLabel] adds the localized word.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key, this.withLabel = false, this.size = 16});

  final bool withLabel;
  final double size;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final icon = Icon(Icons.verified_rounded, size: size, color: scheme.primary);
    if (!withLabel) {
      return Tooltip(message: l10n.verifiedBadge, child: icon);
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        icon,
        const SizedBox(width: 4),
        Text(
          l10n.verifiedBadge,
          style: TextStyle(
            fontSize: size * 0.75,
            fontWeight: FontWeight.w600,
            color: scheme.primary,
          ),
        ),
      ],
    );
  }
}

/// Teal-tint "free trial" badge.
class TrialBadge extends StatelessWidget {
  const TrialBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isLight ? AppColors.primaryTint : scheme.primaryContainer,
        borderRadius: BorderRadius.circular(AppTokens.radiusChip),
      ),
      child: Text(
        l10n.catalogTrialChip,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: isLight ? AppColors.primaryDark : scheme.onPrimaryContainer,
        ),
      ),
    );
  }
}
