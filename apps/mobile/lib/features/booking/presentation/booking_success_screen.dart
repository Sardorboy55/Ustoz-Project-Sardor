import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/format.dart';
import '../../../common/widgets/status_chip.dart';
import '../../../l10n/app_localizations.dart';
import '../../chat/data/chat_repository.dart';

/// Navigation payload for `/booking-success` (passed via GoRouter `extra`).
class BookingSuccessArgs {
  const BookingSuccessArgs({
    required this.booking,
    required this.teacherId,
    required this.teacherName,
    required this.subjectNameUz,
    required this.subjectNameRu,
  });

  /// The bookings row returned by the `booking-create` Edge Function.
  final Map<String, dynamic> booking;
  final String teacherId;
  final String teacherName;
  final String subjectNameUz;
  final String subjectNameRu;
}

class BookingSuccessScreen extends ConsumerStatefulWidget {
  const BookingSuccessScreen({super.key, this.args});

  final BookingSuccessArgs? args;

  @override
  ConsumerState<BookingSuccessScreen> createState() =>
      _BookingSuccessScreenState();
}

class _BookingSuccessScreenState extends ConsumerState<BookingSuccessScreen> {
  bool _openingChat = false;

  Future<void> _writeToTeacher() async {
    final args = widget.args;
    if (args == null || _openingChat) return;
    final l10n = AppLocalizations.of(context)!;
    setState(() => _openingChat = true);
    try {
      final chatId = await ref
          .read(chatRepositoryProvider)
          .ensureChatWithTeacher(args.teacherId);
      if (mounted) context.push('/chats/$chatId');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.commonError)));
      }
    } finally {
      if (mounted) setState(() => _openingChat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final tokens = AppTokens.of(context);
    final args = widget.args;
    final booking = args?.booking;
    final status = booking?['status'] as String? ?? 'pending_payment';
    final pending = status == 'pending_payment';
    final start = booking == null
        ? null
        : DateTime.tryParse(booking['start_at'] as String? ?? '');
    final price = booking?['price'] as num? ?? 0;
    final isTrial = booking?['kind'] == 'trial_free';
    final subjectName = locale.languageCode == 'ru'
        ? args?.subjectNameRu
        : args?.subjectNameUz;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.all(AppTokens.s24),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - AppTokens.s24 * 2,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    const Spacer(),
                    // animated check: scale + fade in
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 550),
                      curve: Curves.easeOutBack,
                      builder: (context, v, child) => Opacity(
                        opacity: v.clamp(0.0, 1.0),
                        child: Transform.scale(scale: v, child: child),
                      ),
                      child: Container(
                        width: 96,
                        height: 96,
                        decoration: BoxDecoration(
                          color: tokens.success.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.check_circle_rounded,
                          size: 64,
                          color: tokens.success,
                        ),
                      ),
                    ),
                    const SizedBox(height: AppTokens.s16),
                    Text(
                      l10n.bookingSuccessTitle,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: AppTokens.s16),
                    if (args != null && booking != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppTokens.s16),
                        decoration: BoxDecoration(
                          color: scheme.surface,
                          borderRadius: BorderRadius.circular(
                            AppTokens.radiusCard,
                          ),
                          border: Border.all(color: scheme.outlineVariant),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    subjectName ?? '',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                StatusChip(status: status),
                              ],
                            ),
                            const SizedBox(height: AppTokens.s8),
                            _DetailRow(
                              icon: Icons.person_outline_rounded,
                              text: args.teacherName,
                            ),
                            if (start != null)
                              _DetailRow(
                                icon: Icons.schedule_rounded,
                                text:
                                    '${formatTkWeekdayDate(start, locale.languageCode)}, ${formatTkTime(start)}',
                              ),
                            _DetailRow(
                              icon: Icons.timer_outlined,
                              text:
                                  '${booking['duration_min']} ${l10n.minutes}',
                            ),
                            _DetailRow(
                              icon: Icons.payments_outlined,
                              text: isTrial
                                  ? l10n.bookingFreeTrialLabel
                                  : formatTiyin(price, locale),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppTokens.s12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppTokens.s12),
                        decoration: BoxDecoration(
                          color: (pending ? tokens.warning : tokens.success)
                              .withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(
                            AppTokens.radiusButton,
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              pending
                                  ? Icons.hourglass_top_rounded
                                  : Icons.check_rounded,
                              size: 18,
                              color: pending ? tokens.warning : tokens.success,
                            ),
                            const SizedBox(width: AppTokens.s8),
                            Expanded(
                              child: Text(
                                pending
                                    ? l10n.bookingPendingNote
                                    : l10n.bookingSuccessPaidNote,
                                style: TextStyle(
                                  fontSize: 13,
                                  height: 1.35,
                                  color: scheme.onSurface,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (pending && !isTrial && price > 0) ...[
                      FilledButton.icon(
                        onPressed: () => context.push(
                          '/booking/${booking!['id']}/pay',
                          extra: booking,
                        ),
                        icon: const Icon(Icons.payments_rounded, size: 20),
                        label: Text(locale.languageCode == 'ru'
                            ? 'Оплатить урок'
                            : 'Darsni to\'lash'),
                      ),
                      const SizedBox(height: AppTokens.s8),
                      OutlinedButton(
                        onPressed: () => context.go('/lessons'),
                        child: Text(l10n.bookingGoLessons),
                      ),
                    ] else
                      FilledButton(
                        onPressed: () => context.go('/lessons'),
                        child: Text(l10n.bookingGoLessons),
                      ),
                    const SizedBox(height: AppTokens.s8),
                    if (args != null)
                      OutlinedButton.icon(
                        onPressed: _openingChat ? null : _writeToTeacher,
                        icon: _openingChat
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                ),
                              )
                            : const Icon(
                                Icons.chat_bubble_outline_rounded,
                                size: 20,
                              ),
                        label: Text(l10n.bookingWriteTeacher),
                      ),
                    const SizedBox(height: AppTokens.s8),
                    TextButton(
                      onPressed: () => context.go('/home'),
                      child: Text(l10n.bookingGoHome),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 16, color: scheme.onSurfaceVariant),
          const SizedBox(width: AppTokens.s8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
