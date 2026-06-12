import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config/env.dart';
import '../features/auth/presentation/otp_screen.dart';
import '../features/auth/presentation/phone_screen.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/onboarding/presentation/onboarding_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/profile/presentation/profile_setup_screen.dart';
import '../features/splash/presentation/splash_screen.dart';
import '../features/teacher/presentation/teacher_screen.dart';

part 'router.g.dart';

const _protectedPrefixes = ['/home', '/setup', '/profile', '/teacher'];

class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    if (Env.hasSupabase) {
      Supabase.instance.client.auth.onAuthStateChange.listen((_) {
        notifyListeners();
      });
    }
  }
}

@Riverpod(keepAlive: true)
GoRouter router(Ref ref) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: _AuthRefresh(),
    redirect: (context, state) {
      if (!Env.hasSupabase) return null; // offline demo mode (Phase 0)
      final session = Supabase.instance.client.auth.currentSession;
      final loc = state.matchedLocation;

      final isProtected = _protectedPrefixes.any(loc.startsWith);
      if (session == null && isProtected) return '/auth/phone';
      // splash decides /setup vs /home (needs an async profile lookup)
      if (session != null && loc.startsWith('/auth')) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/auth/phone',
        builder: (context, state) => const PhoneScreen(),
      ),
      GoRoute(
        path: '/auth/otp',
        builder: (context, state) => OtpScreen(phone: state.extra as String),
      ),
      GoRoute(
        path: '/setup',
        builder: (context, state) => const ProfileSetupScreen(),
      ),
      GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/teacher',
        builder: (context, state) => const TeacherScreen(),
      ),
    ],
  );
}
