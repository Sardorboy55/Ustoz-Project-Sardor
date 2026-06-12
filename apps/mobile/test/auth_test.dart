import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:ustoz_mobile/features/auth/data/auth_repository.dart';
import 'package:ustoz_mobile/features/auth/presentation/phone_screen.dart';
import 'package:ustoz_mobile/l10n/app_localizations.dart';

class _FakeAuthRepository implements AuthRepository {
  String? sentPhone;

  @override
  Future<void> sendOtp(String phone) async {
    sentPhone = AuthRepository.normalizePhone(phone);
  }

  @override
  Future<AuthResponse> verifyOtp(String phone, String code) {
    throw UnimplementedError();
  }

  @override
  Future<void> signOut() async {}
}

void main() {
  group('normalizePhone', () {
    test('9 local digits get +998 prefix', () {
      expect(AuthRepository.normalizePhone('90 123 45 67'), '+998901234567');
    });
    test('full 998 number gets +', () {
      expect(AuthRepository.normalizePhone('998901234567'), '+998901234567');
    });
    test('already E.164 stays intact', () {
      expect(AuthRepository.normalizePhone('+998901234567'), '+998901234567');
    });
  });

  testWidgets('phone screen enables button after 9 digits and sends OTP',
      (tester) async {
    final fake = _FakeAuthRepository();
    var pushedOtp = false;

    final router = GoRouter(
      initialLocation: '/auth/phone',
      routes: [
        GoRoute(path: '/auth/phone', builder: (_, __) => const PhoneScreen()),
        GoRoute(
          path: '/auth/otp',
          builder: (_, state) {
            pushedOtp = true;
            return Text('otp:${state.extra}');
          },
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [authRepositoryProvider.overrideWithValue(fake)],
        child: MaterialApp.router(
          routerConfig: router,
          locale: const Locale('uz'),
          supportedLocales: const [Locale('uz'), Locale('ru')],
          localizationsDelegates: const [
            AppLocalizations.delegate,
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
        ),
      ),
    );

    final button = find.byType(FilledButton);
    expect(tester.widget<FilledButton>(button).onPressed, isNull); // disabled

    await tester.enterText(find.byType(TextField), '901234567');
    await tester.pump();
    expect(tester.widget<FilledButton>(button).onPressed, isNotNull);

    await tester.tap(button);
    await tester.pumpAndSettle();

    expect(fake.sentPhone, '+998901234567');
    expect(pushedOtp, isTrue);
  });
}
