import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../app/theme.dart';
import '../../../core/config/env.dart';

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
    // Полноэкранный сплэш-дизайн (картинка с логотипом IBILIM).
    return const Scaffold(
      backgroundColor: AppColors.primary,
      body: SizedBox.expand(
        child: Image(
          image: AssetImage('assets/images/splash.png'),
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
