import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/loading_button.dart';
import '../../../common/widgets/section_header.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../common/widgets/status_chip.dart';
import '../../../l10n/app_localizations.dart';
import '../data/teacher_repository.dart';

/// Teacher cabinet → "Overview": next lessons, monthly income, wallet
/// with payout requests, recent transactions.
class TeacherDashboardTab extends ConsumerWidget {
  const TeacherDashboardTab({super.key});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(teacherUpcomingLessonsProvider);
    ref.invalidate(teacherMonthIncomeProvider);
    ref.invalidate(teacherLessonsDoneProvider);
    ref.invalidate(teacherWalletProvider);
    ref.invalidate(teacherWalletTransactionsProvider);
    await ref
        .read(teacherWalletProvider.future)
        .catchError((_) => <String, int>{});
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    return RefreshIndicator(
      onRefresh: () => _refresh(ref),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppTokens.s16),
        children: [
          const _StatsRow(),
          const SizedBox(height: AppTokens.s24),
          SectionHeader(title: l10n.dashUpcomingTitle),
          const SizedBox(height: AppTokens.s8),
          const _UpcomingLessons(),
          const SizedBox(height: AppTokens.s24),
          const _WalletCard(),
          const SizedBox(height: AppTokens.s24),
          SectionHeader(title: l10n.walletHistory),
          const SizedBox(height: AppTokens.s8),
          const _TransactionsList(),
          const SizedBox(height: AppTokens.s32),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// stats: month income + lessons total
// ---------------------------------------------------------------------------

class _StatsRow extends ConsumerWidget {
  const _StatsRow();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final income = ref.watch(teacherMonthIncomeProvider);
    final lessons = ref.watch(teacherLessonsDoneProvider);

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            icon: Icons.payments_outlined,
            label: l10n.dashMonthIncome,
            value: income.when(
              loading: () => null,
              error: (e, _) => '—',
              data: (v) => formatTiyin(v, locale),
            ),
            onRetry: income.hasError
                ? () => ref.invalidate(teacherMonthIncomeProvider)
                : null,
          ),
        ),
        const SizedBox(width: AppTokens.s12),
        Expanded(
          child: _StatCard(
            icon: Icons.school_outlined,
            label: l10n.dashLessonsTotal,
            value: lessons.when(
              loading: () => null,
              error: (e, _) => '—',
              data: (v) => '$v',
            ),
            onRetry: lessons.hasError
                ? () => ref.invalidate(teacherLessonsDoneProvider)
                : null,
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    this.onRetry,
  });

  final IconData icon;
  final String label;

  /// Null while loading.
  final String? value;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      onTap: onRetry,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: scheme.primary),
          const SizedBox(height: AppTokens.s8),
          value == null
              ? const SkeletonPulse(child: SkeletonBox(width: 80, height: 18))
              : Text(
                  value!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                  ),
                ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// upcoming lessons (3)
// ---------------------------------------------------------------------------

class _UpcomingLessons extends ConsumerWidget {
  const _UpcomingLessons();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final lessons = ref.watch(teacherUpcomingLessonsProvider);

    return lessons.when(
      loading: () => const Column(
        children: [
          SkeletonCard(height: 76),
          SizedBox(height: AppTokens.s8),
          SkeletonCard(height: 76),
        ],
      ),
      error: (e, _) => _InlineRetry(
        onRetry: () => ref.invalidate(teacherUpcomingLessonsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return AppCard(
            child: Row(
              children: [
                Icon(
                  Icons.event_available_outlined,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: AppTokens.s12),
                Expanded(
                  child: Text(
                    l10n.dashNoUpcoming,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          );
        }
        return Column(
          children: [
            for (var i = 0; i < rows.length; i++) ...[
              if (i > 0) const SizedBox(height: AppTokens.s8),
              _LessonRow(booking: rows[i]),
            ],
          ],
        );
      },
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({required this.booking});

  final Map<String, dynamic> booking;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final scheme = Theme.of(context).colorScheme;
    final start = DateTime.parse(booking['start_at'] as String);
    final student = (booking['student'] as Map?)?.cast<String, dynamic>();
    final subj = ((booking['teacher_subjects'] as Map?)?['subjects'] as Map?)
            ?.cast<String, dynamic>() ??
        const {};
    final subjectName =
        (locale == 'ru' ? subj['name_ru'] : subj['name_uz']) as String? ?? '';
    final studentName = student?['full_name'] as String? ?? '';

    return AppCard(
      padding: const EdgeInsets.all(AppTokens.s12),
      child: Row(
        children: [
          AppAvatar(
            imageUrl: student?['avatar_url'] as String?,
            name: studentName,
            size: 44,
          ),
          const SizedBox(width: AppTokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  studentName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$subjectName · ${formatTkDayMonth(start)}, '
                  '${formatTkTime(start)} · ${booking['duration_min']} ${l10n.minutes}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTokens.s8),
          StatusChip(status: booking['status'] as String),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// wallet + payout
// ---------------------------------------------------------------------------

class _WalletCard extends ConsumerWidget {
  const _WalletCard();

  Future<void> _openPayoutSheet(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _PayoutSheet(),
    );
    if (sent == true) {
      ref.invalidate(teacherWalletProvider);
      ref.invalidate(teacherWalletTransactionsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.payoutSuccess)));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final wallet = ref.watch(teacherWalletProvider);

    return wallet.when(
      loading: () => const SkeletonCard(height: 140),
      error: (e, _) => AppCard(
        child:
            _InlineRetry(onRetry: () => ref.invalidate(teacherWalletProvider)),
      ),
      data: (w) {
        final balance = w['balance'] ?? 0;
        final frozen = w['frozen'] ?? 0;
        return AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.account_balance_wallet_outlined,
                      size: 20, color: scheme.primary),
                  const SizedBox(width: AppTokens.s8),
                  Text(
                    l10n.walletTitle,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppTokens.s12),
              Text(
                l10n.walletAvailable,
                style:
                    TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 2),
              Text(
                formatTiyin(balance, locale),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (frozen > 0) ...[
                const SizedBox(height: AppTokens.s4),
                Text(
                  l10n.walletFrozen(formatTiyin(frozen, locale)),
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: AppTokens.s12),
              FilledButton.icon(
                onPressed: () => _openPayoutSheet(context, ref),
                icon: const Icon(Icons.arrow_outward_rounded, size: 20),
                label: Text(l10n.payoutRequest),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _PayoutSheet extends ConsumerStatefulWidget {
  const _PayoutSheet();

  @override
  ConsumerState<_PayoutSheet> createState() => _PayoutSheetState();
}

class _PayoutSheetState extends ConsumerState<_PayoutSheet> {
  final _amount = TextEditingController();
  final _card = TextEditingController();
  bool _sending = false;
  String? _error;

  static const _minUzs = 50000;

  @override
  void dispose() {
    _amount.dispose();
    _card.dispose();
    super.dispose();
  }

  String get _cardDigits => _card.text.replaceAll(RegExp(r'\D'), '');

  bool get _valid =>
      (int.tryParse(_amount.text) ?? 0) > 0 && _cardDigits.length == 16;

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    final amountUzs = int.tryParse(_amount.text) ?? 0;
    if (amountUzs < _minUzs) {
      setState(() => _error = l10n.payoutErrorMin);
      return;
    }
    if (_cardDigits.length != 16) {
      setState(() => _error = l10n.payoutErrorCard);
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(teacherRepositoryProvider).requestPayout(
            amountTiyin: amountUzs * 100,
            cardNumber: _cardDigits,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on PayoutException catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = switch (e.code) {
          'MIN_AMOUNT' => l10n.payoutErrorMin,
          'INSUFFICIENT' => l10n.payoutErrorInsufficient,
          'INVALID_CARD' => l10n.payoutErrorCard,
          _ => l10n.commonError,
        };
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = l10n.commonError;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Padding(
      padding: EdgeInsets.only(
        left: AppTokens.s16,
        right: AppTokens.s16,
        top: AppTokens.s8,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppTokens.s16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Text(
              l10n.payoutRequest,
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          const SizedBox(height: AppTokens.s16),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: l10n.payoutAmountLabel,
              helperText: l10n.payoutMinHint,
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppTokens.s12),
          TextField(
            controller: _card,
            keyboardType: TextInputType.number,
            maxLength: 19,
            inputFormatters: [
              FilteringTextInputFormatter.allow(RegExp(r'[\d ]')),
            ],
            decoration: InputDecoration(
              labelText: l10n.payoutCardLabel,
              hintText: '8600 0000 0000 0000',
              counterText: '',
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (_error != null) ...[
            const SizedBox(height: AppTokens.s8),
            Text(
              _error!,
              style: TextStyle(
                fontSize: 13,
                color: AppTokens.of(context).danger,
              ),
            ),
          ],
          const SizedBox(height: AppTokens.s16),
          LoadingButton(
            loading: _sending,
            onPressed: _valid ? _submit : null,
            child: Text(l10n.payoutRequest),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// transactions
// ---------------------------------------------------------------------------

class _TransactionsList extends ConsumerWidget {
  const _TransactionsList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final txs = ref.watch(teacherWalletTransactionsProvider);

    return txs.when(
      loading: () => const Column(
        children: [
          SkeletonListTile(padding: EdgeInsets.symmetric(vertical: 8)),
          SkeletonListTile(padding: EdgeInsets.symmetric(vertical: 8)),
        ],
      ),
      error: (e, _) => _InlineRetry(
        onRetry: () => ref.invalidate(teacherWalletTransactionsProvider),
      ),
      data: (rows) {
        if (rows.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(AppTokens.s16),
            child: Center(
              child: Text(
                l10n.walletHistoryEmpty,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
          );
        }
        return AppCard(
          padding: const EdgeInsets.symmetric(vertical: AppTokens.s4),
          child: Column(
            children: [
              for (var i = 0; i < rows.length; i++) ...[
                if (i > 0)
                  Divider(
                    height: 1,
                    indent: AppTokens.s16,
                    endIndent: AppTokens.s16,
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                _TxRow(tx: rows[i]),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _TxRow extends StatelessWidget {
  const _TxRow({required this.tx});

  final Map<String, dynamic> tx;

  (String, IconData) _resolve(AppLocalizations l10n) {
    return switch (tx['type'] as String?) {
      'lesson_income' => (l10n.txLessonIncome, Icons.school_outlined),
      'payout' => (l10n.txPayout, Icons.arrow_outward_rounded),
      'payout_freeze' => (l10n.txPayoutFreeze, Icons.ac_unit_rounded),
      'payout_unfreeze' => (l10n.txPayoutUnfreeze, Icons.undo_rounded),
      'refund_in' => (l10n.txRefundIn, Icons.replay_rounded),
      'booking_spend' => (l10n.txBookingSpend, Icons.shopping_bag_outlined),
      _ => (l10n.txAdminAdjust, Icons.tune_rounded),
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context);
    final scheme = Theme.of(context).colorScheme;
    final tokens = AppTokens.of(context);
    final amount = (tx['amount'] as num?)?.toInt() ?? 0;
    final created = DateTime.parse(tx['created_at'] as String);
    final (title, icon) = _resolve(l10n);
    final amountColor = amount > 0
        ? tokens.success
        : amount < 0
            ? tokens.danger
            : scheme.onSurfaceVariant;
    final amountText = amount > 0
        ? '+${formatTiyin(amount, locale)}'
        : formatTiyin(amount, locale);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.s16,
        vertical: AppTokens.s12,
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: scheme.onSurfaceVariant),
          const SizedBox(width: AppTokens.s12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  '${formatTkDayMonth(created)} · ${formatTkTime(created)}',
                  style: TextStyle(
                    fontSize: 12,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppTokens.s8),
          Text(
            amountText,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: amountColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _InlineRetry extends StatelessWidget {
  const _InlineRetry({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: TextButton.icon(
        onPressed: onRetry,
        icon: const Icon(Icons.refresh_rounded, size: 18),
        label: Text(l10n.commonRetry),
      ),
    );
  }
}
