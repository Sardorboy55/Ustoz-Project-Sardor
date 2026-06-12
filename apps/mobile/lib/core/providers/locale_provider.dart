import 'dart:ui';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'locale_provider.g.dart';

const supportedLocales = [Locale('uz'), Locale('ru')];
const _localeKey = 'app_locale';

/// Overridden in main() with the real instance.
@Riverpod(keepAlive: true)
SharedPreferences sharedPreferences(Ref ref) =>
    throw UnimplementedError('overridden in main()');

@Riverpod(keepAlive: true)
class LocaleController extends _$LocaleController {
  @override
  Locale build() {
    final saved = ref.watch(sharedPreferencesProvider).getString(_localeKey);
    return switch (saved) {
      'ru' => const Locale('ru'),
      _ => const Locale('uz'), // default locale per spec
    };
  }

  Future<void> setLocale(Locale locale) async {
    state = locale;
    await ref.read(sharedPreferencesProvider).setString(_localeKey, locale.languageCode);
  }

  Future<void> toggle() =>
      setLocale(state.languageCode == 'uz' ? const Locale('ru') : const Locale('uz'));
}
