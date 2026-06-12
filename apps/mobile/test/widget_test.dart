import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:ustoz_mobile/app/app.dart';
import 'package:ustoz_mobile/core/providers/locale_provider.dart';

Future<(Widget, ProviderContainer)> _buildApp() async {
  SharedPreferences.setMockInitialValues({'onboarding_seen': true});
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
  );
  return (
    UncontrolledProviderScope(container: container, child: const UstozApp()),
    container,
  );
}

void main() {
  testWidgets('boots in uz by default and switches to ru', (tester) async {
    final (app, container) = await _buildApp();
    await tester.pumpWidget(app);

    // splash shows the uz tagline
    expect(find.text("O'z ustozingizni toping"), findsOneWidget);

    // switch locale → ru strings render
    container.read(localeControllerProvider.notifier).setLocale(const Locale('ru'));
    await tester.pump();
    expect(find.text('Найдите своего наставника'), findsOneWidget);

    // advance past the splash timer so it is not pending at teardown
    await tester.pump(const Duration(milliseconds: 1300));
    await tester.pumpAndSettle();
    // home in ru: AppBar title + bottom-nav tab label
    expect(find.text('Главная'), findsWidgets);

    container.dispose();
  });

  testWidgets('navigates from splash to home (onboarding seen)', (tester) async {
    final (app, container) = await _buildApp();
    await tester.pumpWidget(app);

    // let the splash timer fire and the router navigate
    await tester.pump(const Duration(milliseconds: 1300));
    await tester.pumpAndSettle();

    expect(find.text('Asosiy'), findsOneWidget); // home tab label in uz
    container.dispose();
  });
}
