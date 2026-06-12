import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';

part 'supabase_providers.g.dart';

@Riverpod(keepAlive: true)
SupabaseClient supabaseClient(Ref ref) {
  assert(Env.hasSupabase, 'Supabase is not configured (--dart-define)');
  return Supabase.instance.client;
}

/// Re-emits on sign-in / sign-out / token refresh.
@Riverpod(keepAlive: true)
Stream<AuthState> authState(Ref ref) {
  if (!Env.hasSupabase) return const Stream.empty();
  return ref.watch(supabaseClientProvider).auth.onAuthStateChange;
}

@Riverpod(keepAlive: true)
class SessionController extends _$SessionController {
  @override
  Session? build() {
    if (!Env.hasSupabase) return null;
    ref.listen(authStateProvider, (_, next) {
      next.whenData((s) => state = s.session);
    });
    return ref.read(supabaseClientProvider).auth.currentSession;
  }
}
