import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';

/// Глобальный обработчик Android App Links вида `https://ibilim.uz/...`.
///
/// Живёт на уровне корня приложения (оборачивает [MaterialApp.router]), а не на
/// экране входа, поэтому работает в любом состоянии приложения. Кастомную схему
/// входа (`uz.ustoz.app://login-callback` и `tg-callback`) НЕ трогает — ею
/// по-прежнему занимается AuthScreen. Здесь обрабатываются ТОЛЬКО https-ссылки
/// на ibilim.uz, которые мы заявили в манифесте (App Links):
///   /become-teacher  → /become-teacher
///   /lessons         → /lessons
///   `/t/<slug>`      → `/t/<slug>`  (страница преподавателя)
///
/// Учитываются оба сценария: «холодный старт» (приложение запущено по ссылке —
/// [AppLinks.getInitialLink]) и «горячий» (ссылка пришла в работающее
/// приложение — [AppLinks.uriLinkStream]).
class DeepLinkHandler extends ConsumerStatefulWidget {
  const DeepLinkHandler({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<DeepLinkHandler> createState() => _DeepLinkHandlerState();
}

class _DeepLinkHandlerState extends ConsumerState<DeepLinkHandler> {
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = _appLinks.uriLinkStream.listen(_handleUri);
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) _handleUri(uri);
    });
  }

  void _handleUri(Uri uri) {
    // Только наши https App Links на ibilim.uz. Кастомная схема входа
    // (uz.ustoz.app://...) — не наша забота, её ловит AuthScreen.
    if (uri.scheme != 'https' || uri.host != 'ibilim.uz') return;

    final target = _mapPath(uri);
    if (target == null) return;

    // Защищённые маршруты (например /become-teacher, /lessons) сам redirect
    // GoRouter уведёт на /auth, если нет сессии — здесь это не дублируем.
    final router = ref.read(routerProvider);
    router.go(target);
  }

  /// Переводит путь входящей ссылки в маршрут GoRouter. Учитывает возможный
  /// префикс локали из next-intl (`/uz/...`, `/ru/...`). Возвращает null, если
  /// путь не из заявленных префиксов.
  String? _mapPath(Uri uri) {
    final segments = [...uri.pathSegments];
    // снять префикс локали, если он есть (uz / ru)
    if (segments.isNotEmpty &&
        (segments.first == 'uz' || segments.first == 'ru')) {
      segments.removeAt(0);
    }
    if (segments.isEmpty) return null;

    final head = segments.first;
    switch (head) {
      case 'become-teacher':
        return '/become-teacher';
      case 'lessons':
        return '/lessons';
      case 't':
        // /t/<slug> — страница преподавателя
        if (segments.length >= 2 && segments[1].isNotEmpty) {
          return '/t/${segments[1]}';
        }
        return null;
      default:
        return null;
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
