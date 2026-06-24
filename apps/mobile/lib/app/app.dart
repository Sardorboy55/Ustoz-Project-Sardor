import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/providers/locale_provider.dart';
import '../l10n/app_localizations.dart';
import 'deep_link_handler.dart';
import 'router.dart';
import 'theme.dart';

class UstozApp extends ConsumerWidget {
  const UstozApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeControllerProvider);
    return MaterialApp.router(
      title: 'USTOZ',
      debugShowCheckedModeBanner: false,
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: ref.watch(routerProvider),
      // Глобально слушаем App Links (https://ibilim.uz/...) над всем навигатором,
      // не мешая логике входа в AuthScreen.
      builder: (context, child) =>
          DeepLinkHandler(child: child ?? const SizedBox.shrink()),
    );
  }
}
