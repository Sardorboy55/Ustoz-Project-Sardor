import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../l10n/app_localizations.dart';

/// Booking status pill: tinted background + localized label.
/// Accepts the raw DB status string; unknown statuses render gray with the
/// raw value (no crash on future enum additions).
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tokens = AppTokens.of(context);
    final isLight = Theme.of(context).brightness == Brightness.light;

    final (color, label) = switch (status) {
      'pending_payment' => (
          tokens.statusPendingPayment,
          l10n.statusPendingPayment
        ),
      'paid' => (tokens.statusPaid, l10n.statusPaid),
      'in_progress' => (tokens.statusInProgress, l10n.statusInProgress),
      'completed' => (tokens.statusCompleted, l10n.statusCompleted),
      'cancelled_by_student' => (
          tokens.statusCancelled,
          l10n.statusCancelledByStudent
        ),
      'cancelled_by_teacher' => (
          tokens.statusCancelled,
          l10n.statusCancelledByTeacher
        ),
      'expired' => (tokens.statusExpired, l10n.statusExpired),
      'no_show_student' => (tokens.statusNoShow, l10n.statusNoShowStudent),
      'no_show_teacher' => (tokens.statusNoShow, l10n.statusNoShowTeacher),
      _ => (tokens.statusExpired, status),
    };

    // text needs more contrast than the tinted background
    final fg = isLight
        ? Color.lerp(color, Colors.black, 0.3)!
        : Color.lerp(color, Colors.white, 0.35)!;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isLight ? 0.12 : 0.22),
        borderRadius: BorderRadius.circular(AppTokens.radiusChip),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
        ),
      ),
    );
  }
}
