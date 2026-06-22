import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../app/theme.dart';
import '../../../core/config/env.dart';
import '../../../l10n/app_localizations.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    if (!Env.hasSupabase) {
      context.go('/home'); // offline demo mode
      return;
    }
    final client = Supabase.instance.client;
    final session = client.auth.currentSession;
    if (session == null) {
      context.go('/auth');
      return;
    }
    // route to profile setup until the name is filled (docs/04 §4.1)
    String name = '';
    var profileMissing = false;
    try {
      final row = await client
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .maybeSingle();
      profileMissing = row == null;
      name = (row?['full_name'] as String? ?? '').trim();
    } catch (_) {/* network issues → home, guarded screens handle errors */}
    if (!mounted) return;
    if (profileMissing) {
      // session for a deleted account (or wiped dev DB) — sign out
      await client.auth.signOut();
      if (mounted) context.go('/auth');
      return;
    }
    context.go(name.isEmpty ? '/setup' : '/home');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.primaryDark],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(milliseconds: 700),
            curve: Curves.easeOutCubic,
            builder: (context, t, child) => Opacity(
              opacity: t,
              child: Transform.scale(scale: 0.92 + 0.08 * t, child: child),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // wordmark
                Text(
                  l10n.appTitle,
                  style: TextStyle(
                    color: scheme.onPrimary,
                    fontSize: 48,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 8,
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  width: 56,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.accent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  l10n.splashTagline,
                  style: TextStyle(
                    color: scheme.onPrimary.withValues(alpha: 0.85),
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
