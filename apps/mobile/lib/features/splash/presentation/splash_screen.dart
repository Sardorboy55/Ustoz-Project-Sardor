import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
    final prefs = await SharedPreferences.getInstance();
    final seenOnboarding = prefs.getBool('onboarding_seen') ?? false;
    await Future<void>.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;

    if (!seenOnboarding) {
      context.go('/onboarding');
      return;
    }
    if (!Env.hasSupabase) {
      context.go('/home'); // offline demo mode
      return;
    }
    final client = Supabase.instance.client;
    final session = client.auth.currentSession;
    if (session == null) {
      context.go('/auth/phone');
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
      if (mounted) context.go('/auth/phone');
      return;
    }
    context.go(name.isEmpty ? '/setup' : '/home');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: scheme.primary,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.school_rounded, size: 96, color: scheme.onPrimary),
            const SizedBox(height: 16),
            Text(
              l10n.appTitle,
              style: TextStyle(
                color: scheme.onPrimary,
                fontSize: 40,
                fontWeight: FontWeight.w800,
                letterSpacing: 4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.splashTagline,
              style: TextStyle(color: scheme.onPrimary.withValues(alpha: 0.8), fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
