import 'package:flutter/foundation.dart';
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

  /// Выход из аккаунта. Сбрасываем ТОЛЬКО локальную сессию
  /// (`SignOutScope.local`) — это происходит мгновенно, без сетевого запроса
  /// `POST /auth/v1/logout` к серверу. Глобальный logout идёт через прокси
  /// `ibilim.uz/supa` и может падать/висеть; раньше из-за этого исключение
  /// прерывало выход, локальная сессия оставалась живой и роутер кидал юзера
  /// обратно на главную. Любую ошибку гасим: главное — снять локальную сессию.
  Future<void> signOut() async {
    try {
      await _client.auth.signOut(scope: SignOutScope.local);
    } catch (e) {
      debugPrint('signOut local error (ignored): $e');
    }
  }

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

  /// ТОЛЬКО для тестового APK (флаг Env.testLogin). Обычный вход по
  /// email+паролю через тот же Supabase (`/auth/v1/token?grant_type=password`),
  /// идёт через прокси ibilim.uz/supa, как и весь остальной auth-трафик.
  /// Бросает дружелюбный текст; технические детали — в debugPrint.
  Future<void> signInWithEmailPassword(String email, String password) async {
    try {
      await _client.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
    } on AuthException catch (e) {
      debugPrint('signInWithEmailPassword AuthException: ${e.statusCode} ${e.message}');
      throw _friendlyAuthError(e);
    } catch (e) {
      debugPrint('signInWithEmailPassword error: $e');
      throw 'Не удалось войти. Проверьте соединение и попробуйте снова.';
    }
  }

  /// ТОЛЬКО для тестового APK. Регистрация тестового аккаунта по email+паролю.
  /// Если в Supabase включено подтверждение почты — сессии сразу не будет;
  /// возвращает [needsConfirmation] = true, чтобы экран показал подсказку.
  Future<bool> signUpWithEmailPassword(String email, String password) async {
    try {
      final res = await _client.auth.signUp(
        email: email.trim(),
        password: password,
      );
      // session == null → требуется подтверждение почты (нет авто-входа).
      return res.session == null;
    } on AuthException catch (e) {
      debugPrint('signUpWithEmailPassword AuthException: ${e.statusCode} ${e.message}');
      throw _friendlyAuthError(e);
    } catch (e) {
      debugPrint('signUpWithEmailPassword error: $e');
      throw 'Не удалось зарегистрироваться. Проверьте соединение и попробуйте снова.';
    }
  }

  String _friendlyAuthError(AuthException e) {
    final msg = e.message.toLowerCase();
    if (msg.contains('invalid login') || msg.contains('invalid credentials')) {
      return 'Неверный email или пароль';
    }
    if (msg.contains('not confirmed') || msg.contains('confirm')) {
      return 'Проверьте почту для подтверждения аккаунта';
    }
    if (msg.contains('already registered') || msg.contains('already exists')) {
      return 'Такой email уже зарегистрирован — войдите';
    }
    if (msg.contains('password') && msg.contains('least')) {
      return 'Пароль слишком короткий (минимум 6 символов)';
    }
    if (msg.contains('valid email') || msg.contains('invalid email')) {
      return 'Неверный формат email';
    }
    return 'Ошибка входа: ${e.message}';
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
