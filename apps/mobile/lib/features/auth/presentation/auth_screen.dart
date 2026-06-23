import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme.dart';
import '../../../common/widgets/app_card.dart';
import '../data/auth_repository.dart';

/// Login screen matching the website (apps/web auth-form): Google + Telegram,
/// on the SAME Supabase backend. Replaces the old phone/OTP flow.
///
/// Telegram: opens a small web page hosting the official Telegram Login Widget
/// (apps/web/public/tg-login.html); on success it redirects back to the app via
/// `uz.ustoz.app://tg-callback?...`, which we capture here and exchange for a
/// session through the existing `telegram-auth` edge function.
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  static const _tgLoginUrl = 'https://ibilim.uz/tg-login.html';

  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;
  Timer? _authTimer;
  bool _busy = false;
  String? _error;

  bool get _ru => Localizations.localeOf(context).languageCode == 'ru';

  @override
  void initState() {
    super.initState();
    // Ловим deep-link возврат входа — и через поток (тёплый возврат из браузера),
    // и через начальную ссылку (холодный старт, когда ОС убила приложение).
    _sub = _appLinks.uriLinkStream.listen(_handleUri);
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) _handleUri(uri);
    });
  }

  Future<void> _handleUri(Uri uri) async {
    if (uri.host == 'login-callback') {
      // Google: явно меняем OAuth-код на сессию. Сначала прямой
      // exchangeCodeForSession(code) (PKCE), затем getSessionFromUrl как фолбэк.
      try {
        final err = uri.queryParameters['error_description'] ??
            uri.queryParameters['error'];
        if (err != null) throw err;
        final code = uri.queryParameters['code'];
        if (code != null && code.isNotEmpty) {
          await Supabase.instance.client.auth.exchangeCodeForSession(code);
        } else {
          await Supabase.instance.client.auth.getSessionFromUrl(uri);
        }
      } catch (e) {
        // supabase мог уже обменять код сам — ошибку показываем только если
        // сессии всё ещё нет. Текст ошибки выводим для диагностики.
        if (mounted &&
            Supabase.instance.client.auth.currentSession == null) {
          setState(() {
            _busy = false;
            _error = 'Google: $e';
          });
        }
      }
    } else if (uri.host == 'tg-callback') {
      _completeTelegram(uri.queryParameters);
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    _authTimer?.cancel();
    super.dispose();
  }

  Future<void> _google() async {
    _authTimer?.cancel();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).signInWithGoogle();
      // Sign-in completes asynchronously via the deep-link redirect →
      // onAuthStateChange → router redirect. Keep the spinner until then,
      // with a safety timeout so the user is never stuck on a dead spinner.
      _authTimer = Timer(const Duration(seconds: 60), () {
        if (mounted &&
            Supabase.instance.client.auth.currentSession == null) {
          setState(() {
            _busy = false;
            _error = _ru
                ? 'Похоже, вход не завершился. Попробуйте снова.'
                : 'Kirish yakunlanmadi. Qaytadan urinib ko\'ring.';
          });
        }
      });
    } catch (_) {
      _authTimer?.cancel();
      if (mounted) {
        setState(() {
          _busy = false;
          _error = _ru
              ? 'Не удалось войти через Google'
              : 'Google orqali kirib bo\'lmadi';
        });
      }
    }
  }

  Future<void> _telegram() async {
    setState(() => _error = null);
    try {
      final ok = await launchUrl(
        Uri.parse(_tgLoginUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && mounted) {
        setState(() => _error = _ru
            ? 'Не удалось открыть Telegram-вход'
            : 'Telegram kirishni ochib bo\'lmadi');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = _ru
            ? 'Не удалось открыть Telegram-вход'
            : 'Telegram kirishni ochib bo\'lmadi');
      }
    }
  }

  Future<void> _completeTelegram(Map<String, String> params) async {
    if (params['hash'] == null || params['id'] == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).signInWithTelegram(params);
      // session → router redirect handles navigation to '/'.
    } catch (e) {
      // Текст ошибки выводим для диагностики (как у Google).
      if (mounted) setState(() => _error = 'Telegram: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 448),
            child: AppCard(
              padding:
                  const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SvgPicture.asset('assets/logo/logo.svg', height: 30),
                  const SizedBox(height: 20),
                  Text(
                    ru ? 'Добро пожаловать' : 'Xush kelibsiz',
                    style: const TextStyle(
                        fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    ru ? 'Войдите, чтобы продолжить' : 'Davom etish uchun kiring',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.zinc500),
                  ),
                  const SizedBox(height: 24),
                  if (_error != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                            color: Color(0xFFB91C1C), fontSize: 13),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _busy ? null : _google,
                      icon: _busy
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2))
                          : SvgPicture.asset('assets/icons/google.svg',
                              width: 20, height: 20),
                      label: Text(ru
                          ? 'Продолжить через Google'
                          : 'Google bilan davom etish'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.zinc900,
                        side: const BorderSide(color: AppColors.zinc300),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _busy ? null : _telegram,
                      icon: const Icon(Icons.send_rounded, size: 20),
                      label: Text(ru
                          ? 'Войти через Telegram'
                          : 'Telegram bilan kirish'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        backgroundColor: const Color(0xFF229ED9),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
