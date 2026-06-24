/// Build-time configuration via --dart-define (see scripts/ and .env.example).
///
/// The app must boot without a backend (Phase 0): when [supabaseUrl] is empty,
/// Supabase initialization is skipped.
abstract final class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Тестовый вход по email+паролю на экране входа.
  /// Включается ТОЛЬКО в отдельном тестовом APK через
  /// `--dart-define=TEST_LOGIN=true`. В обычной (продакшн) сборке — false,
  /// и блок email/пароля не появляется (остаются только Google + Telegram).
  static const testLogin = bool.fromEnvironment('TEST_LOGIN', defaultValue: false);

  static bool get hasSupabase => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
