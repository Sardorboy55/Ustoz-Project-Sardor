import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/theme.dart';
import '../../../common/widgets/app_card.dart';
import '../../../core/config/env.dart';
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

class _AuthScreenState extends ConsumerState<AuthScreen>
    with WidgetsBindingObserver {
  static const _tgLoginUrl = 'https://ibilim.uz/tg-login.html';

  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;
  Timer? _authTimer;
  Timer? _cancelTimer;
  bool _busy = false;
  String? _error;
  String? _info;
  // Поля тестового входа (используются только при Env.testLogin == true).
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  // один и тот же deep-link может прийти дважды (поток + начальная ссылка) —
  // обрабатываем каждый ровно один раз.
  final Set<String> _handledUris = {};

  bool get _ru => Localizations.localeOf(context).languageCode == 'ru';

  @override
  void initState() {
    super.initState();
    // Ловим deep-link возврат входа — и через поток (тёплый возврат из браузера),
    // и через начальную ссылку (холодный старт, когда ОС убила приложение).
    WidgetsBinding.instance.addObserver(this);
    _sub = _appLinks.uriLinkStream.listen(_handleUri);
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) _handleUri(uri);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Returning from the OAuth browser without finishing (e.g. Back pressed)
    // → drop the spinner quickly instead of waiting for the long timeout.
    if (state == AppLifecycleState.resumed && _busy) {
      _cancelTimer?.cancel();
      _cancelTimer = Timer(const Duration(milliseconds: 1200), () {
        if (mounted &&
            _busy &&
            Supabase.instance.client.auth.currentSession == null) {
          _authTimer?.cancel();
          setState(() => _busy = false);
        }
      });
    }
  }

  Future<void> _handleUri(Uri uri) async {
    // Нас интересуют ТОЛЬКО наши auth-коллбеки. Прочее (https App Links и т.п.)
    // ловит глобальный DeepLinkHandler — здесь игнорируем.
    final isLogin = uri.host == 'login-callback';
    final isTg = uri.host == 'tg-callback';
    if (!isLogin && !isTg) return;

    // Идемпотентность + защита от стрэй-коллбеков в уже авторизованной сессии.
    // Если сессия УЖЕ есть — это посторонний/повторный коллбек: НЕ меняем код
    // на сессию, НЕ открываем браузер, просто молча игнорируем. Иначе невалидный
    // `code` приводил к unhandled AuthException («Code verifier could not be
    // found…»), а лишний tg-callback мог заново поднять внешний логин-флоу.
    if (Supabase.instance.client.auth.currentSession != null) {
      debugPrint(
        'Auth callback ignored — session already present: ${uri.host}',
      );
      return;
    }
    if (!_handledUris.add(uri.toString())) return; // уже обработали этот линк

    if (isLogin) {
      // Google: явно меняем OAuth-код на сессию. Сначала прямой
      // exchangeCodeForSession(code) (PKCE), затем getSessionFromUrl как фолбэк.
      try {
        final err =
            uri.queryParameters['error_description'] ??
            uri.queryParameters['error'];
        if (err != null) throw err;
        final code = uri.queryParameters['code'];
        if (code != null && code.isNotEmpty) {
          await Supabase.instance.client.auth.exchangeCodeForSession(code);
        } else {
          await Supabase.instance.client.auth.getSessionFromUrl(uri);
        }
      } catch (e) {
        debugPrint('Google login callback error: $e');
        // supabase may have already exchanged the code itself — only surface an
        // error if there is still no session.
        if (mounted && Supabase.instance.client.auth.currentSession == null) {
          setState(() {
            _busy = false;
            _error =
                (_ru
                    ? 'Не удалось завершить вход. Попробуйте снова.'
                    : 'Kirishni yakunlab bo\'lmadi. Qaytadan urinib ko\'ring.') +
                '\n[$e]';
          });
        }
      }
    } else if (isTg) {
      _completeTelegram(uri.queryParameters);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sub?.cancel();
    _authTimer?.cancel();
    _cancelTimer?.cancel();
    _emailCtrl.dispose();
    _passCtrl.dispose();
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
      _authTimer = Timer(const Duration(seconds: 30), () {
        if (mounted &&
            _busy &&
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
      final lang = Localizations.localeOf(context).languageCode;
      final ok = await launchUrl(
        Uri.parse('$_tgLoginUrl?lang=$lang'),
        mode: LaunchMode.externalApplication,
      );
      if (!ok && mounted) {
        setState(
          () => _error = _ru
              ? 'Не удалось открыть Telegram-вход'
              : 'Telegram kirishni ochib bo\'lmadi',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = _ru
              ? 'Не удалось открыть Telegram-вход'
              : 'Telegram kirishni ochib bo\'lmadi',
        );
      }
    }
  }

  Future<void> _completeTelegram(Map<String, String> params) async {
    // Битый/неполный tg-callback (нет подписи) — молча игнорируем. Браузер
    // здесь НЕ открываем: внешний Telegram-логин стартует ТОЛЬКО по явному
    // нажатию кнопки «Войти через Telegram» (_telegram), а не на входящий
    // коллбек, иначе стрэй-callback поднимал Chrome с логин-страницей.
    if (params['hash'] == null || params['id'] == null) {
      debugPrint('Telegram callback ignored — missing hash/id: ${params.keys}');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).signInWithTelegram(params);
      // session → router redirect handles navigation to '/'.
    } catch (e) {
      debugPrint('Telegram login error: $e');
      if (mounted) {
        setState(
          () => _error =
              (_ru
                  ? 'Не удалось войти через Telegram. Попробуйте снова.'
                  : 'Telegram orqali kirib bo\'lmadi. Qaytadan urinib ko\'ring.') +
              '\n[$e]',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  // ---- ТЕСТОВЫЙ вход по email+паролю (только при Env.testLogin) ----

  bool _validTestInput() {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text;
    if (email.isEmpty || !email.contains('@') || pass.isEmpty) {
      setState(() {
        _info = null;
        _error = _ru ? 'Введите email и пароль' : 'Email va parolni kiriting';
      });
      return false;
    }
    return true;
  }

  Future<void> _emailSignIn() async {
    if (!_validTestInput()) return;
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      await ref
          .read(authRepositoryProvider)
          .signInWithEmailPassword(_emailCtrl.text, _passCtrl.text);
      // Сессия создана → onAuthStateChange → роутер сам редиректит с /auth.
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e.toString();
        });
      }
    }
  }

  Future<void> _emailSignUp() async {
    if (!_validTestInput()) return;
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      final needsConfirmation = await ref
          .read(authRepositoryProvider)
          .signUpWithEmailPassword(_emailCtrl.text, _passCtrl.text);
      if (mounted) {
        setState(() {
          _busy = false;
          if (needsConfirmation) {
            _info = _ru
                ? 'Аккаунт создан. Проверьте почту для подтверждения, затем войдите.'
                : 'Hisob yaratildi. Tasdiqlash uchun pochtangizni tekshiring, keyin kiring.';
          }
          // Если подтверждение не требуется — сессия уже есть, роутер редиректит.
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e.toString();
        });
      }
    }
  }

  List<Widget> _testLoginBlock(bool ru) {
    return [
      const SizedBox(height: 20),
      Row(
        children: [
          const Expanded(child: Divider(color: AppColors.zinc300)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              ru ? 'или для теста' : 'test login',
              style: const TextStyle(color: AppColors.zinc500, fontSize: 12),
            ),
          ),
          const Expanded(child: Divider(color: AppColors.zinc300)),
        ],
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _emailCtrl,
        enabled: !_busy,
        keyboardType: TextInputType.emailAddress,
        autocorrect: false,
        textInputAction: TextInputAction.next,
        decoration: InputDecoration(
          labelText: 'Email',
          border: const OutlineInputBorder(),
          isDense: true,
        ),
      ),
      const SizedBox(height: 12),
      TextField(
        controller: _passCtrl,
        enabled: !_busy,
        obscureText: true,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) => _busy ? null : _emailSignIn(),
        decoration: InputDecoration(
          labelText: ru ? 'Пароль' : 'Parol',
          border: const OutlineInputBorder(),
          isDense: true,
        ),
      ),
      const SizedBox(height: 12),
      SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: _busy ? null : _emailSignIn,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
          child: Text(ru ? 'Войти' : 'Kirish'),
        ),
      ),
      TextButton(
        onPressed: _busy ? null : _emailSignUp,
        child: Text(ru ? 'Регистрация' : 'Ro\'yxatdan o\'tish'),
      ),
    ];
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
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SvgPicture.asset('assets/logo/logo.svg', height: 30),
                  const SizedBox(height: 20),
                  Text(
                    ru ? 'Добро пожаловать' : 'Xush kelibsiz',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    ru
                        ? 'Войдите, чтобы продолжить'
                        : 'Davom etish uchun kiring',
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
                          color: Color(0xFFB91C1C),
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_info != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _info!,
                        style: const TextStyle(
                          color: Color(0xFF047857),
                          fontSize: 13,
                        ),
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
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : SvgPicture.asset(
                              'assets/icons/google.svg',
                              width: 20,
                              height: 20,
                            ),
                      label: Text(
                        ru
                            ? 'Продолжить через Google'
                            : 'Google bilan davom etish',
                      ),
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
                      label: Text(
                        ru ? 'Войти через Telegram' : 'Telegram bilan kirish',
                      ),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                        backgroundColor: const Color(0xFF229ED9),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  if (Env.testLogin) ..._testLoginBlock(ru),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
