import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

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

  // manual-payment (receipt + admin confirm) state
  String? _status; // null | pending | confirmed | rejected
  String? _reviewNote;
  String? _receiptPath;
  bool _uploading = false;
  bool _submitting = false;
  String? _proofError;

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
      final repo = ref.read(paymentRepositoryProvider);
      final row = await repo.ensureProPayment();
      final pay = (row?['pay_amount'] as num?)?.toInt() ?? 0;
      Map<String, dynamic>? st;
      if (pay > 0) {
        st = await repo.myPaymentStatus(purpose: 'pro', payAmount: pay);
      }
      if (!mounted) return;
      setState(() {
        _payAmount = pay;
        _status = st?['status'] as String?;
        _reviewNote = st?['review_note'] as String?;
        _loading = false;
      });
      if (_status == 'confirmed') _onConfirmed();
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

  void _onConfirmed() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(_ru ? 'Pro активирован ✓' : 'Pro faollashdi ✓')),
    );
    Navigator.of(context).maybePop();
  }

  /// «Загрузить чек» → pick from gallery → upload to the receipts bucket.
  Future<void> _uploadReceipt() async {
    setState(() {
      _uploading = true;
      _proofError = null;
    });
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
      );
      if (picked == null) {
        if (mounted) setState(() => _uploading = false);
        return;
      }
      final path = await ref
          .read(paymentRepositoryProvider)
          .uploadReceipt(picked);
      if (!mounted) return;
      setState(() {
        _receiptPath = path;
        _uploading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _uploading = false;
          _proofError = _ru ? 'Не удалось загрузить чек' : 'Chek yuklanmadi';
        });
      }
    }
  }

  /// «Отправить заявку» → submit proof → status «На проверке».
  Future<void> _submitProof() async {
    final path = _receiptPath;
    if (path == null) return;
    setState(() {
      _submitting = true;
      _proofError = null;
    });
    try {
      await ref.read(paymentRepositoryProvider).submitProProof(path);
      if (!mounted) return;
      setState(() {
        _status = 'pending';
        _reviewNote = null;
        _receiptPath = null;
        _submitting = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _proofError = _ru ? 'Не удалось отправить заявку' : 'Ariza yuborilmadi';
        });
      }
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
                  status: _status,
                  hasReceipt: _receiptPath != null,
                  uploading: _uploading,
                  submitting: _submitting,
                  onUploadTap: _uploadReceipt,
                  onSubmitTap: _submitProof,
                  reviewNote: _reviewNote,
                  errorText: _proofError,
                ),
              ],
            ),
    );
  }
}
