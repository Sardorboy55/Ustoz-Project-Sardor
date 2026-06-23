import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/config/env.dart';
import 'core/net/pinned_http_client.dart';
import 'core/providers/locale_provider.dart';

/// IP Vercel, на который указывает host прокси (ibilim.uz). Узбекские провайдеры
/// НЕ резолвят его через системный DNS (errno=7) — соединяемся с IP напрямую.
/// Если Vercel сменит адрес — обновить: `dig +short A ibilim.uz`.
const _pinnedIp = '216.198.79.1';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Phase 0: the app boots without a backend; Supabase wires up when
  // SUPABASE_URL / SUPABASE_ANON_KEY are passed via --dart-define.
  if (Env.hasSupabase) {
    // Обход DNS-блокировки UZ: весь трафик Supabase идёт через клиент, который
    // для host прокси соединяется с IP Vercel мимо системного resolver
    // (см. [PinnedHttpClient]). Покрывает auth / rest / functions / storage.
    final host = Uri.parse(Env.supabaseUrl).host;
    final httpClient =
        host.isEmpty ? null : PinnedHttpClient(host: host, ip: _pinnedIp);
    // legacy anon keys are accepted here too (local Supabase CLI issues them)
    await Supabase.initialize(
      url: Env.supabaseUrl,
      publishableKey: Env.supabaseAnonKey,
      httpClient: httpClient,
    );
  }

  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const UstozApp(),
    ),
  );
}
