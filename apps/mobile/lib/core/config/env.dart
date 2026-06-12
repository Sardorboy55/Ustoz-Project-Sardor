/// Build-time configuration via --dart-define (see scripts/ and .env.example).
///
/// The app must boot without a backend (Phase 0): when [supabaseUrl] is empty,
/// Supabase initialization is skipped.
abstract final class Env {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get hasSupabase => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
