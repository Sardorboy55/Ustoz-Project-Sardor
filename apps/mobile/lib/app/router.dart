import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/config/env.dart';
import '../features/auth/presentation/otp_screen.dart';
import '../features/auth/presentation/phone_screen.dart';
import '../features/booking/presentation/booking_success_screen.dart';
import '../features/booking/presentation/lessons_screen.dart';
import '../features/catalog/presentation/catalog_screen.dart';
import '../features/catalog/presentation/teacher_profile_screen.dart';
import '../features/chat/presentation/chat_list_screen.dart';
import '../features/chat/presentation/chat_thread_screen.dart';
import '../features/favorites/presentation/favorites_screen.dart';
import '../features/home/presentation/home_screen.dart';
import '../features/notifications/presentation/notifications_screen.dart';
import '../features/onboarding/presentation/onboarding_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/profile/presentation/profile_setup_screen.dart';
import '../features/profile/presentation/support_screen.dart';
import '../features/splash/presentation/splash_screen.dart';
import '../features/teacher/presentation/teacher_screen.dart';
import 'app_shell.dart';

part 'router.g.dart';

const _protectedPrefixes = [
  '/home',
  '/setup',
  '/profile',
  '/teacher',
  '/lessons',
  '/chats',
  '/booking-success',
  '/notifications',
  '/favorites',
  '/support',
];

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
      // ---- outside the shell (no bottom bar) ----
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
      GoRoute(
        path: '/teacher',
        builder: (context, state) => const TeacherScreen(),
      ),
      GoRoute(
        path: '/t/:slug',
        builder: (context, state) =>
            TeacherProfileScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/booking-success',
        builder: (context, state) => BookingSuccessScreen(
          args: state.extra is BookingSuccessArgs
              ? state.extra as BookingSuccessArgs
              : null,
        ),
      ),
      GoRoute(
        path: '/chats/:id',
        builder: (context, state) =>
            ChatThreadScreen(chatId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/favorites',
        builder: (context, state) => const FavoritesScreen(),
      ),
      GoRoute(
        path: '/support',
        builder: (context, state) => const SupportScreen(),
      ),

      // ---- main shell: 5 tabs with persistent bottom navigation ----
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(shell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/home',
              builder: (context, state) => const HomeScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/catalog',
              // home deep-links: ?category=<id>, ?trial=1, ?focus=1
              builder: (context, state) => CatalogScreen(
                initialCategoryId: state.uri.queryParameters['category'],
                initialTrialOnly: state.uri.queryParameters['trial'] == '1',
                autofocusSearch: state.uri.queryParameters['focus'] == '1',
              ),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/lessons',
              builder: (context, state) => const LessonsScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/chats',
              builder: (context, state) => const ChatListScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/profile',
              builder: (context, state) => const ProfileScreen(),
            ),
          ]),
        ],
      ),
    ],
  );
}
