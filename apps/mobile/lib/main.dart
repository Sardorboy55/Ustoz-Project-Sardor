import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/app.dart';
import 'core/config/env.dart';
import 'core/net/pinned_http_client.dart';
import 'core/providers/locale_provider.dart';

/// Прокси-host и его IP на Vercel. Пиним ИМЕННО этот host (не тот, что в
/// SUPABASE_URL): IP принадлежит Vercel, и привязывать к нему, например,
/// supabase.co нельзя — это разные серверы. Для остальных host клиент сам
/// уходит на обычный DNS. Узбекские провайдеры не резолвят ibilim.uz
/// (errno=7) — поэтому соединяемся по IP напрямую. Сменился IP — обновить:
/// `dig +short A ibilim.uz`.
const _proxyHost = 'ibilim.uz';
const _proxyIp = '216.198.79.1';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Phase 0: the app boots without a backend; Supabase wires up when
  // SUPABASE_URL / SUPABASE_ANON_KEY are passed via --dart-define.
  if (Env.hasSupabase) {
    // Обход DNS-блокировки UZ: трафик на прокси-host (ibilim.uz) идёт через
    // клиент, который соединяется с IP Vercel мимо системного resolver
    // (см. [PinnedHttpClient]). Покрывает auth / rest / functions / storage.
    // На остальные host клиент уходит обычным путём.
    final httpClient = PinnedHttpClient(host: _proxyHost, ip: _proxyIp);
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
