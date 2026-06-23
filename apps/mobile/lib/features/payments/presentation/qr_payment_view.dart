import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_card.dart';

/// Shared Paynet-QR payment block — mirrors the website's QR checkout.
/// Reused by the lesson / package / Pro payment flows.
class QrPaymentView extends StatelessWidget {
  const QrPaymentView({
    super.key,
    required this.payAmountTiyin,
    required this.sent,
    required this.uploading,
    required this.onUploadTap,
    this.errorText,
    this.sentNote,
    this.sentAction,
  });

  /// Exact amount to pay, in tiyin (unique sum the SMS matcher recognizes).
  final int payAmountTiyin;

  /// Receipt already uploaded → show the "on review" state.
  final bool sent;
  final bool uploading;
  final VoidCallback onUploadTap;
  final String? errorText;
  final String? sentNote;
  final Widget? sentAction;

  static const _account = '8888 0128 8480 6485';
  static const _accountRaw = '8888012884806485';

  @override
  Widget build(BuildContext context) {
    final ru = Localizations.localeOf(context).languageCode == 'ru';
    final locale = Localizations.localeOf(context);
    final tokens = AppTokens.of(context);
    final amount = formatTiyin(payAmountTiyin, locale);

    if (sent) {
      return AppCard(
        child: Column(
          children: [
            Icon(Icons.hourglass_top_rounded, color: tokens.warning, size: 40),
            const SizedBox(height: AppTokens.s12),
            Text(
              ru ? 'Оплата на проверке' : 'To\'lov tekshiruvda',
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
            ),
            if (sentNote != null) ...[
              const SizedBox(height: AppTokens.s8),
              Text(sentNote!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.zinc500, height: 1.4)),
            ],
            if (sentAction != null) ...[
              const SizedBox(height: AppTokens.s16),
              sentAction!,
            ],
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppTokens.radiusCard),
            child: Image.asset('assets/images/paynet-qr.png',
                width: 200, height: 200, fit: BoxFit.contain),
          ),
        ),
        const SizedBox(height: AppTokens.s16),
        Text(
          ru ? 'Оплата через Paynet' : 'Paynet orqali to\'lov',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: AppTokens.s8),
        // exact amount — the unique sum the system matches the payment by
        Container(
          padding: const EdgeInsets.symmetric(
              horizontal: AppTokens.s16, vertical: AppTokens.s12),
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
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                ru
                    ? 'По этой сумме мы найдём ваш платёж'
                    : 'Shu summa bo\'yicha to\'lovingizni topamiz',
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
                    Text(ru ? 'Получатель' : 'Qabul qiluvchi',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.zinc500)),
                    const Text('TEMUR BASHIROV',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 6),
                    Text(ru ? 'Счёт Paynet' : 'Paynet hisob',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.zinc500)),
                    const Text(_account,
                        style: TextStyle(
                            fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                  ],
                ),
              ),
              IconButton(
                tooltip: ru ? 'Копировать счёт' : 'Hisobni nusxalash',
                icon: const Icon(Icons.copy_rounded, size: 20),
                onPressed: () {
                  Clipboard.setData(const ClipboardData(text: _accountRaw));
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text(ru ? 'Счёт скопирован' : 'Hisob nusxalandi'),
                    duration: const Duration(seconds: 2),
                  ));
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTokens.s16),
        FilledButton.icon(
          onPressed: uploading ? null : onUploadTap,
          icon: uploading
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.receipt_long_rounded, size: 20),
          label: Text(ru ? 'Я оплатил — загрузить чек' : 'To\'ladim — chek yuklash'),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        ),
        if (errorText != null) ...[
          const SizedBox(height: AppTokens.s8),
          Text(errorText!,
              style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13)),
        ],
        const SizedBox(height: AppTokens.s8),
        Text(
          ru ? 'Картой (Click/Payme/Uzum) — скоро' : 'Karta orqali — tez orada',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, color: AppColors.zinc400),
        ),
      ],
    );
  }
}
