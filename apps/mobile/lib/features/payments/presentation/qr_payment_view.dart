import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../app/theme.dart';
import '../../../common/format.dart';
import '../../../common/widgets/app_card.dart';

/// Shared Paynet-QR payment block — mirrors the website's QR checkout.
/// Reused by the lesson / package / Pro payment flows.
///
/// Flow: pay the exact QR amount → tap "Я оплатил — Продолжить" → the parent
/// polls the backend (SMS forwarder auto-confirms by the unique amount). No
/// receipt upload, no admin step.
class QrPaymentView extends StatelessWidget {
  const QrPaymentView({
    super.key,
    required this.payAmountTiyin,
    required this.checking,
    required this.notFound,
    required this.onContinue,
  });

  /// Exact amount to pay, in tiyin (unique sum the SMS matcher recognizes).
  final int payAmountTiyin;

  /// Polling for the auto-confirmation is in progress.
  final bool checking;

  /// Last check found no payment yet → show the "не найдено" hint.
  final bool notFound;

  /// Tapped "Я оплатил — Продолжить".
  final VoidCallback onContinue;

  static const _account = '8888 0128 8480 6485';
  static const _accountRaw = '8888012884806485';

  @override
  Widget build(BuildContext context) {
    final ru = Localizations.localeOf(context).languageCode == 'ru';
    final locale = Localizations.localeOf(context);
    final amount = formatTiyin(payAmountTiyin, locale);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
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
        // exact amount — the unique sum the system matches the payment by
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
        FilledButton.icon(
          onPressed: checking ? null : onContinue,
          icon: checking
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.check_circle_outline_rounded, size: 20),
          label: Text(
            checking
                ? (ru ? 'Проверяем платёж…' : 'To\'lov tekshirilmoqda…')
                : (ru ? 'Я оплатил — Продолжить' : 'To\'ladim — Davom etish'),
          ),
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
        ),
        if (notFound) ...[
          const SizedBox(height: AppTokens.s12),
          Container(
            padding: const EdgeInsets.all(AppTokens.s12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(AppTokens.radiusButton),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  ru ? 'Платёж пока не найден' : 'To\'lov hali topilmadi',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF92400E),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  ru
                      ? 'Если вы только что оплатили — SMS от банка может прийти '
                            'с задержкой. Подождите минуту и нажмите «Продолжить» '
                            'ещё раз. Проверьте, что отправили ровно $amount.'
                      : 'Agar hozir to\'lagan bo\'lsangiz — bankdan SMS biroz '
                            'kechikishi mumkin. Bir daqiqa kuting va «Davom etish» '
                            'tugmasini yana bosing. Aynan $amount yuborganingizni '
                            'tekshiring.',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFB45309),
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppTokens.s8),
        Text(
          ru
              ? 'После оплаты нажмите «Продолжить» — найдём платёж по сумме и откроем доступ.'
              : 'To\'lovdan keyin «Davom etish»ni bosing — summa bo\'yicha topamiz.',
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 11, color: AppColors.zinc400),
        ),
      ],
    );
  }
}
