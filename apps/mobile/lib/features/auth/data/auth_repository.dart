import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'auth_repository.g.dart';

class AuthRepository {
  AuthRepository(this._client);

  final SupabaseClient _client;

  /// Normalizes to E.164 (+998XXXXXXXXX) and requests an OTP SMS.
  Future<void> sendOtp(String phone) {
    return _client.auth.signInWithOtp(phone: normalizePhone(phone));
  }

  Future<AuthResponse> verifyOtp(String phone, String code) {
    return _client.auth.verifyOTP(
      type: OtpType.sms,
      phone: normalizePhone(phone),
      token: code,
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  /// Google OAuth via the SAME Supabase project as the website.
  /// Opens a Custom Tab and returns via the `uz.ustoz.app://login-callback`
  /// deep link, which supabase_flutter captures to finish the PKCE exchange.
  Future<bool> signInWithGoogle() {
    return _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'uz.ustoz.app://login-callback',
    );
  }

  /// Telegram login: reuses the existing `telegram-auth` edge function,
  /// then exchanges the returned OTP for a real session (same flow as web).
  Future<void> signInWithTelegram(Map<String, dynamic> tgUser) async {
    final Map<String, dynamic> data;
    try {
      final res =
          await _client.functions.invoke('telegram-auth', body: tgUser);
      data = (res.data as Map).cast<String, dynamic>();
    } on FunctionException catch (e) {
      // Функция ответила не-2xx (напр. bad signature / expired) —
      // пробрасываем статус, тело и набор отправленных полей для диагностики.
      throw 'tg-fn ${e.status}: ${e.details} keys=${tgUser.keys.join(",")}';
    }
    final email = data['email'] as String?;
    final otp = data['otp'] as String?;
    if (email == null || otp == null) {
      throw 'tg-fn no otp: $data';
    }
    // Пробуем все типы OTP, которые может выдать generateLink на сервере
    // (email / magiclink / signup для только что созданного пользователя).
    // Возвращаем ошибку ПОСЛЕДНЕЙ попытки — чтобы в диагностике была
    // реальная причина, а не «expired/invalid» от устаревшего типа.
    Object? lastErr;
    for (final type in const [
      OtpType.email,
      OtpType.magiclink,
      OtpType.signup,
    ]) {
      try {
        await _client.auth.verifyOTP(email: email, token: otp, type: type);
        return; // сессия создана — навигацию подхватит onAuthStateChange
      } catch (e) {
        lastErr = e;
      }
    }
    throw 'tg-verify: $lastErr';
  }

  static String normalizePhone(String input) {
    final digits = input.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 9) return '+998$digits';
    if (digits.startsWith('998') && digits.length == 12) return '+$digits';
    return '+$digits';
  }
}

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) =>
    AuthRepository(ref.watch(supabaseClientProvider));
