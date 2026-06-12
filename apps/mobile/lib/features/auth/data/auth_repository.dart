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
