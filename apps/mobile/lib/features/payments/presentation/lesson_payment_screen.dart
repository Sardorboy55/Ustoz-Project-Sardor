import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/error_state.dart';
import '../data/payment_repository.dart';
import 'qr_payment_view.dart';

/// Pay for a booked lesson via Paynet QR (purpose='lesson'), or with a package.
class LessonPaymentScreen extends ConsumerStatefulWidget {
  const LessonPaymentScreen({super.key, required this.bookingId, this.booking});

  final String bookingId;
  final Map<String, dynamic>? booking;

  @override
  ConsumerState<LessonPaymentScreen> createState() =>
      _LessonPaymentScreenState();
}

class _LessonPaymentScreenState extends ConsumerState<LessonPaymentScreen> {
  bool _loading = true;
  bool _error = false;
  int _payAmount = 0;
  bool _sent = false;
  int? _packageLeft;
  bool _uploading = false;
  bool _payingPackage = false;
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
    });
    try {
      final repo = ref.read(paymentRepositoryProvider);
      final row = await repo.ensureLessonPayment(widget.bookingId);
      int? left;
      final ts = widget.booking?['teacher_subject_id'] as String?;
      final dur = (widget.booking?['duration_min'] as num?)?.toInt();
      if (ts != null && dur != null) {
        left = await repo.matchingPackageLeft(
            teacherSubjectId: ts, durationMin: dur);
      }
      if (!mounted) return;
      setState(() {
        _payAmount = (row?['pay_amount'] as num?)?.toInt() ?? 0;
        _sent = row?['receipt_path'] != null;
        _packageLeft = left;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = true;
        });
      }
    }
  }

  Future<void> _upload() async {
    final picker = ImagePicker();
    final file =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
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
      await repo.submitLessonProof(widget.bookingId, path);
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

  Future<void> _payWithPackage() async {
    setState(() => _payingPackage = true);
    try {
      await ref.read(paymentRepositoryProvider).payWithPackage(widget.bookingId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_ru ? 'Оплачено пакетом ✓' : 'Paket bilan to\'landi ✓'),
      ));
      context.go('/lessons');
    } catch (_) {
      if (mounted) {
        setState(() => _payingPackage = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(_ru ? 'Не удалось списать пакет' : 'Paket yechilmadi'),
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    return Scaffold(
      appBar: AppBar(title: Text(ru ? 'Оплата урока' : 'Dars to\'lovi')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error
              ? ErrorState(onRetry: _load)
              : ListView(
                  padding: const EdgeInsets.all(AppTokens.s16),
                  children: [
                    _summary(ru),
                    const SizedBox(height: AppTokens.s16),
                    if (_packageLeft != null && !_sent) ...[
                      _payWithPackageCard(ru),
                      const SizedBox(height: AppTokens.s16),
                    ],
                    QrPaymentView(
                      payAmountTiyin: _payAmount,
                      sent: _sent,
                      uploading: _uploading,
                      onUploadTap: _upload,
                      errorText: _uploadError,
                      sentNote: ru
                          ? 'Как только подтвердим оплату — урок откроется.'
                          : 'To\'lov tasdiqlangach, dars ochiladi.',
                      sentAction: FilledButton(
                        onPressed: () => context.go('/lessons'),
                        child: Text(ru ? 'Мои уроки' : 'Mening darslarim'),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _summary(bool ru) {
    final b = widget.booking;
    final locale = Localizations.localeOf(context);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(ru ? 'К оплате' : 'To\'lovga',
              style: const TextStyle(fontSize: 13, color: AppColors.zinc500)),
          const SizedBox(height: 2),
          Text(
            formatTiyin(_payAmount, locale),
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          if (b != null && b['start_at'] != null) ...[
            const SizedBox(height: AppTokens.s8),
            Row(
              children: [
                const Icon(Icons.schedule_rounded,
                    size: 16, color: AppColors.zinc500),
                const SizedBox(width: 6),
                Text(
                  b['start_at'].toString(),
                  style: const TextStyle(fontSize: 13, color: AppColors.zinc700),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _payWithPackageCard(bool ru) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.inventory_2_outlined, color: AppColors.primary),
              const SizedBox(width: AppTokens.s8),
              Expanded(
                child: Text(
                  ru
                      ? 'У вас есть пакет — осталось $_packageLeft'
                      : 'Paketingiz bor — $_packageLeft ta qoldi',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.s8),
          Text(
            ru
                ? 'Можно оплатить урок пакетом — спишется 1 урок.'
                : 'Darsni paket bilan to\'lash mumkin — 1 dars yechiladi.',
            style: const TextStyle(fontSize: 13, color: AppColors.zinc500),
          ),
          const SizedBox(height: AppTokens.s12),
          FilledButton(
            onPressed: _payingPackage ? null : _payWithPackage,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            child: _payingPackage
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : Text(ru ? 'Списать 1 урок из пакета' : 'Paketdan 1 dars yechish'),
          ),
        ],
      ),
    );
  }
}
