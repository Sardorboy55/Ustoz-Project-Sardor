import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_card.dart';

/// Shared Paynet-QR payment block — mirrors the website's QR checkout.
/// Reused by the lesson / package / Pro payment flows.
///
/// Flow: pay the exact QR amount → «Загрузить чек» (gallery) → «Отправить
/// заявку» → status «На проверке». Admin confirms (or rejects with a reason)
/// in the panel. No SMS-polling, no «Я оплатил — Продолжить».
class QrPaymentView extends StatelessWidget {
  const QrPaymentView({
    super.key,
    required this.payAmountTiyin,
    required this.status,
    required this.hasReceipt,
    required this.uploading,
    required this.submitting,
    required this.onUploadTap,
    required this.onSubmitTap,
    this.reviewNote,
    this.errorText,
  });

  /// Exact amount to pay, in tiyin (the unique sum the admin matches by).
  final int payAmountTiyin;

  /// Server-side request status: null = nothing submitted yet,
  /// 'pending' = on review, 'confirmed' = done, 'rejected' = declined.
  final String? status;

  /// A receipt file is already attached (uploaded) but not yet submitted.
  final bool hasReceipt;

  final bool uploading;
  final bool submitting;

  /// «Загрузить чек» → pick from gallery + upload.
  final VoidCallback onUploadTap;

  /// «Отправить заявку» → submit*Proof. Enabled only when a receipt is attached.
  final VoidCallback onSubmitTap;

  /// Rejection reason (review_note), shown when status == 'rejected'.
  final String? reviewNote;

  final String? errorText;

  static const _account = '8888 0128 8480 6485';
  static const _accountRaw = '8888012884806485';

  @override
  Widget build(BuildContext context) {
    final ru = Localizations.localeOf(context).languageCode == 'ru';
    final locale = Localizations.localeOf(context);
    final tokens = AppTokens.of(context);
    final amount = formatTiyin(payAmountTiyin, locale);

    // ---- on review ----
    if (status == 'pending') {
      return AppCard(
        child: Column(
          children: [
            Icon(Icons.hourglass_top_rounded, color: tokens.warning, size: 44),
            const SizedBox(height: AppTokens.s12),
            Text(
              ru ? 'Заявка на проверке' : 'Ariza tekshiruvda',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: AppTokens.s8),
            Text(
              ru
                  ? 'Мы получили ваш чек. Ждём подтверждения администратора — '
                        'обычно это занимает несколько минут.'
                  : 'Chekingizni oldik. Administrator tasdig\'ini kutyapmiz — '
                        'odatda bir necha daqiqa.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.zinc500, height: 1.4),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ---- rejected banner (re-upload allowed below) ----
        if (status == 'rejected') ...[
          Container(
            padding: const EdgeInsets.all(AppTokens.s12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(AppTokens.radiusButton),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ru ? 'Заявка отклонена' : 'Ariza rad etildi',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFFB91C1C),
                  ),
                ),
                if (reviewNote != null && reviewNote!.trim().isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    reviewNote!,
                    style: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF991B1B),
                      height: 1.4,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  ru
                      ? 'Загрузите корректный чек и отправьте заявку снова.'
                      : 'To\'g\'ri chek yuklang va arizani qayta yuboring.',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF991B1B),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTokens.s16),
        ],
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppTokens.radiusCard),
            child: Image.asset(
              'assets/images/paynet-qr.png',
              width: 200,
              height: 200,
              fit: BoxFit.contain,
            ),
          ),
        ),
        const SizedBox(height: AppTokens.s16),
        Text(
          ru ? 'Оплата через Paynet' : 'Paynet orqali to\'lov',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppTokens.s8),
        // exact amount — the unique sum the admin matches the payment by
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppTokens.s16,
            vertical: AppTokens.s12,
          ),
          decoration: BoxDecoration(
            color: AppColors.primaryTint,
            borderRadius: BorderRadius.circular(AppTokens.radiusButton),
          ),
          child: Column(
            children: [
              Text(
                ru ? 'Оплатите РОВНО' : 'AYNAN shu summani to\'lang',
                style: const TextStyle(fontSize: 12, color: AppColors.zinc500),
              ),
              const SizedBox(height: 2),
              Text(
                amount,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                ru
                    ? 'Эту сумму укажите в чеке'
                    : 'Shu summani chekda ko\'rsating',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: AppColors.zinc500),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTokens.s12),
        // recipient account
        AppCard(
          padding: const EdgeInsets.all(AppTokens.s12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      ru ? 'Получатель' : 'Qabul qiluvchi',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.zinc500,
                      ),
                    ),
                    const Text(
                      'TEMUR BASHIROV',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      ru ? 'Счёт Paynet' : 'Paynet hisob',
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppColors.zinc500,
                      ),
                    ),
                    const Text(
                      _account,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: ru ? 'Копировать счёт' : 'Hisobni nusxalash',
                icon: const Icon(Icons.copy_rounded, size: 20),
                onPressed: () {
                  Clipboard.setData(const ClipboardData(text: _accountRaw));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        ru ? 'Счёт скопирован' : 'Hisob nusxalandi',
                      ),
                      duration: const Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTokens.s16),
        // ---- attached-receipt chip ----
        if (hasReceipt) ...[
          Container(
            padding: const EdgeInsets.all(AppTokens.s12),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(AppTokens.radiusButton),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.success,
                  size: 20,
                ),
                const SizedBox(width: AppTokens.s8),
                Expanded(
                  child: Text(
                    ru ? 'Чек прикреплён' : 'Chek biriktirildi',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF047857),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppTokens.s12),
        ],
        // ---- 1) upload receipt ----
        OutlinedButton.icon(
          onPressed: uploading || submitting ? null : onUploadTap,
          icon: uploading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.receipt_long_rounded, size: 20),
          label: Text(
            hasReceipt
                ? (ru ? 'Заменить чек' : 'Chekni almashtirish')
                : (ru ? 'Загрузить чек' : 'Chek yuklash'),
          ),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
        ),
        const SizedBox(height: AppTokens.s8),
        // ---- 2) submit request (enabled only when a receipt is attached) ----
        FilledButton.icon(
          onPressed: (!hasReceipt || uploading || submitting)
              ? null
              : onSubmitTap,
          icon: submitting
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.send_rounded, size: 20),
          label: Text(ru ? 'Отправить заявку' : 'Arizani yuborish'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        ),
        if (errorText != null) ...[
          const SizedBox(height: AppTokens.s8),
          Text(
            errorText!,
            style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
          ),
        ],
        const SizedBox(height: AppTokens.s8),
        Text(
          ru
              ? 'Оплатите по QR, приложите чек и отправьте заявку — '
                    'администратор подтвердит платёж.'
              : 'QR orqali to\'lang, chekni biriktiring va arizani yuboring — '
                    'administrator tasdiqlaydi.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, color: AppColors.zinc400),
        ),
      ],
    );
  }
}
