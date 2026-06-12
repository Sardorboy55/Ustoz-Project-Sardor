import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/widgets/empty_state.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../l10n/app_localizations.dart';
import '../data/notifications_repository.dart';

/// Notification center: localized templates, unread highlighting, mark-all.
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  Future<void> _markAll(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    try {
      await ref.read(notificationsRepositoryProvider).markAllRead();
      ref.invalidate(notificationsListProvider);
      ref.invalidate(unreadNotificationsCountProvider);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.commonError)));
      }
    }
  }

  Future<void> _open(
    BuildContext context,
    WidgetRef ref,
    Map<String, dynamic> n,
  ) async {
    if (n['read_at'] == null) {
      try {
        await ref
            .read(notificationsRepositoryProvider)
            .markRead(n['id'] as String);
        ref.invalidate(notificationsListProvider);
        ref.invalidate(unreadNotificationsCountProvider);
      } catch (_) {/* non-blocking */}
    }
    if (!context.mounted) return;
    switch (n['template']) {
      case 'booking_reminder_24h':
      case 'booking_reminder_1h':
      case 'booking_cancelled':
      case 'review_request':
        context.go('/lessons');
      default:
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final items = ref.watch(notificationsListProvider);
    final hasUnread =
        (items.value ?? const []).any((n) => n['read_at'] == null);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.notificationsTitle),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: () => _markAll(context, ref),
              child: Text(l10n.notificationsMarkAll),
            ),
        ],
      ),
      body: items.when(
        loading: () => ListView(
          children: [for (var i = 0; i < 6; i++) const SkeletonListTile()],
        ),
        error: (e, _) => ErrorState(
          onRetry: () => ref.invalidate(notificationsListProvider),
        ),
        data: (rows) {
          if (rows.isEmpty) {
            return EmptyState(
              icon: Icons.notifications_none_rounded,
              title: l10n.notificationsEmptyTitle,
              body: l10n.notificationsEmptyBody,
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(notificationsListProvider);
              ref.invalidate(unreadNotificationsCountProvider);
              await ref
                  .read(notificationsListProvider.future)
                  .catchError((_) => <Map<String, dynamic>>[]);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: AppTokens.s8),
              itemCount: rows.length,
              separatorBuilder: (_, _) => Divider(
                height: 1,
                indent: AppTokens.s16 + 44 + AppTokens.s12,
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              itemBuilder: (context, i) => _NotificationTile(
                notification: rows[i],
                onTap: () => _open(context, ref, rows[i]),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  const _NotificationTile({required this.notification, required this.onTap});

  final Map<String, dynamic> notification;
  final VoidCallback onTap;

  (IconData, String, String) _resolve(AppLocalizations l10n) {
    return switch (notification['template'] as String?) {
      'booking_reminder_24h' => (
          Icons.alarm_rounded,
          l10n.notifReminder24Title,
          l10n.notifReminder24Body,
        ),
      'booking_reminder_1h' => (
          Icons.alarm_on_rounded,
          l10n.notifReminder1hTitle,
          l10n.notifReminder1hBody,
        ),
      'booking_cancelled' => (
          Icons.event_busy_rounded,
          l10n.notifCancelledTitle,
          l10n.notifCancelledBody,
        ),
      'review_request' => (
          Icons.star_rounded,
          l10n.notifReviewTitle,
          l10n.notifReviewBody,
        ),
      _ => (
          Icons.notifications_none_rounded,
          l10n.notifGenericTitle,
          '',
        ),
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    final locale = Localizations.localeOf(context).languageCode;
    final unread = notification['read_at'] == null;
    final (icon, title, body) = _resolve(l10n);
    final scheduledAt =
        DateTime.parse(notification['scheduled_at'] as String);
    final isStar = notification['template'] == 'review_request';
    final isCancel = notification['template'] == 'booking_cancelled';
    final iconColor = isStar
        ? AppColors.accent
        : isCancel
            ? AppTokens.of(context).danger
            : scheme.primary;

    return Material(
      color: unread
          ? (isLight
              ? AppColors.primaryTint.withValues(alpha: 0.45)
              : scheme.primaryContainer.withValues(alpha: 0.25))
          : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.s16,
            vertical: AppTokens.s12,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 22, color: iconColor),
              ),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight:
                                  unread ? FontWeight.w700 : FontWeight.w600,
                            ),
                          ),
                        ),
                        if (unread)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: AppTokens.s8),
                            decoration: BoxDecoration(
                              color: scheme.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    if (body.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        body,
                        style: TextStyle(
                          fontSize: 13,
                          height: 1.3,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                    const SizedBox(height: AppTokens.s4),
                    Text(
                      formatTkDateTime(scheduledAt, locale),
                      style: TextStyle(
                        fontSize: 11,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
