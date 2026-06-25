import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../../app/theme.dart';

/// Hosts the ElevenLabs voice agent (public agent) in a WebView and returns the
/// captured `conversationId` via Navigator.pop. The hosted page
/// (apps/web/public/interview-agent.html) talks back over the `IBILIM` channel.
class InterviewWebviewScreen extends StatefulWidget {
  const InterviewWebviewScreen({
    super.key,
    required this.subject,
    required this.lang,
  });

  final String subject;
  final String lang;

  @override
  State<InterviewWebviewScreen> createState() => _InterviewWebviewScreenState();
}

class _InterviewWebviewScreenState extends State<InterviewWebviewScreen> {
  WebViewController? _controller;
  String? _conversationId;
  bool _micDenied = false;

  bool get _ru => widget.lang == 'ru';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      if (mounted) setState(() => _micDenied = true);
      return;
    }
    final url = 'https://ibilim.uz/interview-agent.html'
        '?subject=${Uri.encodeQueryComponent(widget.subject)}&lang=${widget.lang}';
    // Grant in-page getUserMedia (mic) requests automatically — we already
    // hold the OS RECORD_AUDIO permission by this point.
    final c = WebViewController(
      onPermissionRequest: (req) => req.grant(),
    )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel('IBILIM', onMessageReceived: _onMessage)
      ..loadRequest(Uri.parse(url));
    // Android: разрешить аудио агента воспроизводиться без отдельного жеста —
    // иначе поток озвучки ElevenLabs может троттлиться/обрываться.
    if (c.platform is AndroidWebViewController) {
      (c.platform as AndroidWebViewController)
          .setMediaPlaybackRequiresUserGesture(false);
    }
    if (mounted) setState(() => _controller = c);
  }

  void _onMessage(JavaScriptMessage msg) {
    try {
      final data = jsonDecode(msg.message) as Map<String, dynamic>;
      if (data['type'] == 'connected') {
        _conversationId = data['conversationId'] as String?;
      }
    } catch (_) {/* ignore malformed bridge messages */}
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    return Scaffold(
      appBar: AppBar(title: Text(ru ? 'Собеседование' : 'Suhbat')),
      body: _micDenied
          ? Padding(
              padding: const EdgeInsets.all(AppTokens.s24),
              child: Center(
                child: Text(
                  ru
                      ? 'Нужен доступ к микрофону. Разрешите его в настройках и вернитесь.'
                      : 'Mikrofonga ruxsat kerak. Sozlamalarda yoqing va qayting.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.zinc500),
                ),
              ),
            )
          : _controller == null
              ? const Center(child: CircularProgressIndicator())
              : Column(
                  children: [
                    Expanded(child: WebViewWidget(controller: _controller!)),
                    SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.all(AppTokens.s16),
                        child: SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () =>
                                Navigator.of(context).pop(_conversationId),
                            child: Text(ru
                                ? 'Я завершил собеседование'
                                : 'Suhbatni yakunladim'),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}
