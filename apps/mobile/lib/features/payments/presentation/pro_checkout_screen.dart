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
  bool _sent = false;
  bool _uploading = false;
  String? _uploadError;

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
        _sent = row?['receipt_path'] != null;
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

  Future<void> _upload() async {
    final file = await ImagePicker()
        .pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;
    if (await file.length() > 10 * 1024 * 1024) {
      setState(() =>
          _uploadError = _ru ? 'Файл больше 10 МБ' : 'Fayl 10 MB dan katta');
      return;
    }
    setState(() {
      _uploading = true;
      _uploadError = null;
    });
    try {
      final repo = ref.read(paymentRepositoryProvider);
      final path = await repo.uploadReceipt(file);
      await repo.submitProProof(path);
      if (mounted) {
        setState(() {
          _uploading = false;
          _sent = true;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _uploading = false;
          _uploadError =
              _ru ? 'Не удалось отправить чек' : 'Chek yuborilmadi';
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
                        child: Text(_blockedMsg!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: AppColors.zinc500)),
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
                                  Icon(Icons.workspace_premium_rounded,
                                      color: AppColors.accent),
                                  const SizedBox(width: AppTokens.s8),
                                  const Text('IBILIM Pro',
                                      style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800)),
                                ],
                              ),
                              const SizedBox(height: AppTokens.s8),
                              Text(
                                ru
                                    ? 'Выше в каталоге, бейдж PRO, больше учеников. На 30 дней.'
                                    : 'Katalogda yuqorida, PRO belgisi, ko\'proq o\'quvchi. 30 kunga.',
                                style: const TextStyle(
                                    color: AppColors.zinc500, height: 1.4),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppTokens.s16),
                        QrPaymentView(
                          payAmountTiyin: _payAmount,
                          sent: _sent,
                          uploading: _uploading,
                          onUploadTap: _upload,
                          errorText: _uploadError,
                          sentNote: ru
                              ? 'После проверки Pro активируется автоматически.'
                              : 'Tekshiruvdan so\'ng Pro avtomatik faollashadi.',
                          sentAction: FilledButton(
                            onPressed: () => Navigator.of(context).maybePop(),
                            child: Text(ru ? 'Готово' : 'Tayyor'),
                          ),
                        ),
                      ],
                    ),
    );
  }
}
