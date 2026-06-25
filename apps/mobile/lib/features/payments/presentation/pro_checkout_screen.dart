import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/error_state.dart';
import '../data/payment_repository.dart';
import 'qr_payment_view.dart';

/// Buy Pro subscription via Paynet QR (purpose='pro'). Teachers only.
class ProCheckoutScreen extends ConsumerStatefulWidget {
  const ProCheckoutScreen({super.key});

  @override
  ConsumerState<ProCheckoutScreen> createState() => _ProCheckoutScreenState();
}

class _ProCheckoutScreenState extends ConsumerState<ProCheckoutScreen> {
  bool _loading = true;
  bool _error = false;
  String? _blockedMsg;
  int _payAmount = 0;
  bool _checking = false;
  bool _notFound = false;

  bool get _ru => Localizations.localeOf(context).languageCode == 'ru';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = false;
      _blockedMsg = null;
    });
    try {
      final row = await ref.read(paymentRepositoryProvider).ensureProPayment();
      if (!mounted) return;
      setState(() {
        _payAmount = (row?['pay_amount'] as num?)?.toInt() ?? 0;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      // ensure_pro_payment raises if the user is not a teacher.
      setState(() {
        _loading = false;
        _blockedMsg = _ru
            ? 'Pro доступен преподавателям. Сначала станьте преподавателем.'
            : 'Pro o\'qituvchilar uchun. Avval o\'qituvchi bo\'ling.';
      });
    }
  }

  /// «Я оплатил — Продолжить»: опрашиваем бэкенд ~40 сек. SMS-форвардер находит
  /// платёж по уникальной сумме → Pro активируется.
  Future<void> _check() async {
    setState(() {
      _checking = true;
      _notFound = false;
    });
    final repo = ref.read(paymentRepositoryProvider);
    final deadline = DateTime.now().add(const Duration(seconds: 40));
    while (DateTime.now().isBefore(deadline)) {
      bool ok = false;
      try {
        ok = await repo.paymentConfirmed(purpose: 'pro', payAmount: _payAmount);
      } catch (_) {
        /* сеть моргнула — повторим */
      }
      if (ok) {
        if (!mounted) return;
        setState(() => _checking = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_ru ? 'Pro активирован ✓' : 'Pro faollashdi ✓'),
          ),
        );
        Navigator.of(context).maybePop();
        return;
      }
      await Future.delayed(const Duration(seconds: 3));
    }
    if (mounted) {
      setState(() {
        _checking = false;
        _notFound = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    return Scaffold(
      appBar: AppBar(title: const Text('Pro')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error
          ? ErrorState(onRetry: _load)
          : _blockedMsg != null
          ? Padding(
              padding: const EdgeInsets.all(AppTokens.s24),
              child: Center(
                child: Text(
                  _blockedMsg!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.zinc500),
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(AppTokens.s16),
              children: [
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.workspace_premium_rounded,
                            color: AppColors.accent,
                          ),
                          const SizedBox(width: AppTokens.s8),
                          const Text(
                            'IBILIM Pro',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppTokens.s8),
                      Text(
                        ru
                            ? 'Выше в каталоге, бейдж PRO, больше учеников. На 30 дней.'
                            : 'Katalogda yuqorida, PRO belgisi, ko\'proq o\'quvchi. 30 kunga.',
                        style: const TextStyle(
                          color: AppColors.zinc500,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppTokens.s16),
                QrPaymentView(
                  payAmountTiyin: _payAmount,
                  checking: _checking,
                  notFound: _notFound,
                  onContinue: _check,
                ),
              ],
            ),
    );
  }
}
