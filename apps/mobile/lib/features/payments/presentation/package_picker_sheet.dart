import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_card.dart';
import '../data/payment_repository.dart';
import 'qr_payment_view.dart';

/// Buy a lesson package (5/10/20) for a teacher_subject via Paynet QR.
Future<void> showPackagePickerSheet(
  BuildContext context, {
  required String teacherSubjectId,
  required String subjectName,
  required Map<int, int?>
  prices, // duration(30/60/90) → price in tiyin (null = not offered)
  required Map<int, int> discounts, // size(5/10/20) → discount %
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).colorScheme.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (_) => _PackagePickerSheet(
      teacherSubjectId: teacherSubjectId,
      subjectName: subjectName,
      prices: prices,
      discounts: discounts,
    ),
  );
}

class _PackagePickerSheet extends ConsumerStatefulWidget {
  const _PackagePickerSheet({
    required this.teacherSubjectId,
    required this.subjectName,
    required this.prices,
    required this.discounts,
  });

  final String teacherSubjectId;
  final String subjectName;
  final Map<int, int?> prices;
  final Map<int, int> discounts;

  @override
  ConsumerState<_PackagePickerSheet> createState() =>
      _PackagePickerSheetState();
}

class _PackagePickerSheetState extends ConsumerState<_PackagePickerSheet> {
  late final List<int> _durations = [
    30,
    60,
    90,
  ].where((d) => (widget.prices[d] ?? 0) > 0).toList();
  static const _sizes = [5, 10, 20];

  int? _duration;
  int _size = 5;
  int _step = 0; // 0 = select, 1 = pay
  int _payAmount = 0;
  bool _busy = false;
  String? _error;

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
    _duration = _durations.isNotEmpty ? _durations.first : null;
  }

  int _totalTiyin(int duration, int size) {
    final base = widget.prices[duration] ?? 0;
    final disc = widget.discounts[size] ?? 0;
    return (base * size * (100 - disc) / 100).round();
  }

  Future<void> _proceed() async {
    if (_duration == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repo = ref.read(paymentRepositoryProvider);
      final row = await repo.ensurePackagePayment(
        teacherSubjectId: widget.teacherSubjectId,
        lessons: _size,
        durationMin: _duration!,
      );
      final pay =
          (row?['pay_amount'] as num?)?.toInt() ??
          _totalTiyin(_duration!, _size);
      final st = pay > 0
          ? await repo.myPaymentStatus(purpose: 'package', payAmount: pay)
          : null;
      if (!mounted) return;
      setState(() {
        _payAmount = pay;
        _status = st?['status'] as String?;
        _reviewNote = st?['review_note'] as String?;
        _step = 1;
        _busy = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = _ru ? 'Не удалось создать платёж' : 'To\'lov yaratilmadi';
        });
      }
    }
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
      await ref.read(paymentRepositoryProvider).submitPackageProof(path);
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
    final locale = Localizations.localeOf(context);
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.9,
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(
              AppTokens.s16,
              AppTokens.s8,
              AppTokens.s16,
              AppTokens.s16,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: AppTokens.s16),
                    decoration: BoxDecoration(
                      color: AppColors.zinc300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  ru ? 'Пакет уроков' : 'Darslar paketi',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  widget.subjectName,
                  style: const TextStyle(color: AppColors.zinc500),
                ),
                const SizedBox(height: AppTokens.s16),
                if (_step == 0) ..._selectStep(ru, locale) else _payStep(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _selectStep(bool ru, Locale locale) {
    if (_durations.isEmpty) {
      return [
        Text(
          ru
              ? 'Пакеты недоступны для этого предмета'
              : 'Bu fan uchun paket yo\'q',
        ),
      ];
    }
    final total = _totalTiyin(_duration!, _size);
    final perLesson = (total / _size).round();
    return [
      Text(
        ru ? 'Длительность урока' : 'Dars davomiyligi',
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: AppTokens.s8),
      Wrap(
        spacing: AppTokens.s8,
        children: [
          for (final d in _durations)
            ChoiceChip(
              label: Text('$d ${ru ? "мин" : "min"}'),
              selected: _duration == d,
              onSelected: (_) => setState(() => _duration = d),
            ),
        ],
      ),
      const SizedBox(height: AppTokens.s16),
      Text(
        ru ? 'Сколько уроков' : 'Nechta dars',
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: AppTokens.s8),
      for (final n in _sizes) _sizeCard(ru, locale, n),
      const SizedBox(height: AppTokens.s16),
      AppCard(
        padding: const EdgeInsets.all(AppTokens.s12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    ru ? 'Итого' : 'Jami',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.zinc500,
                    ),
                  ),
                  Text(
                    formatTiyin(total, locale),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              '${formatTiyin(perLesson, locale)} / ${ru ? "урок" : "dars"}',
              style: const TextStyle(fontSize: 12, color: AppColors.zinc500),
            ),
          ],
        ),
      ),
      const SizedBox(height: AppTokens.s12),
      if (_error != null) ...[
        Text(_error!, style: const TextStyle(color: Color(0xFFB91C1C))),
        const SizedBox(height: AppTokens.s8),
      ],
      FilledButton(
        onPressed: _busy ? null : _proceed,
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        child: _busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Text(
                ru
                    ? 'Перейти к оплате · ${formatTiyin(total, locale)}'
                    : 'To\'lovga · ${formatTiyin(total, locale)}',
              ),
      ),
    ];
  }

  Widget _sizeCard(bool ru, Locale locale, int n) {
    final selected = _size == n;
    final disc = widget.discounts[n] ?? 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.s8),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppTokens.radiusCard),
        onTap: () => setState(() => _size = n),
        child: Container(
          padding: const EdgeInsets.all(AppTokens.s12),
          decoration: BoxDecoration(
            color: selected ? AppColors.primaryTint : null,
            borderRadius: BorderRadius.circular(AppTokens.radiusCard),
            border: Border.all(
              color: selected ? AppColors.primary : AppColors.zinc200,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            children: [
              Icon(
                selected
                    ? Icons.radio_button_checked_rounded
                    : Icons.radio_button_unchecked_rounded,
                color: selected ? AppColors.primary : AppColors.zinc400,
                size: 22,
              ),
              const SizedBox(width: AppTokens.s12),
              Text(
                '$n ${ru ? "уроков" : "dars"}',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              if (disc > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.success,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '−$disc%',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _payStep() {
    final ru = _ru;
    if (_status == 'confirmed') {
      return AppCard(
        child: Column(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: AppColors.success,
              size: 44,
            ),
            const SizedBox(height: AppTokens.s12),
            Text(
              ru ? 'Пакет оплачен ✓' : 'Paket to\'landi ✓',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppTokens.s8),
            Text(
              ru
                  ? 'Уроки зачислены в «Мои пакеты».'
                  : 'Darslar «Mening paketlarim»ga qo\'shildi.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.zinc500, height: 1.4),
            ),
            const SizedBox(height: AppTokens.s16),
            FilledButton(
              onPressed: () {
                final router = GoRouter.of(context);
                Navigator.of(context).pop();
                router.push('/packages');
              },
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
              child: Text(ru ? 'К моим пакетам' : 'Mening paketlarim'),
            ),
          ],
        ),
      );
    }
    return QrPaymentView(
      payAmountTiyin: _payAmount,
      status: _status,
      hasReceipt: _receiptPath != null,
      uploading: _uploading,
      submitting: _submitting,
      onUploadTap: _uploadReceipt,
      onSubmitTap: _submitProof,
      reviewNote: _reviewNote,
      errorText: _proofError,
    );
  }
}
