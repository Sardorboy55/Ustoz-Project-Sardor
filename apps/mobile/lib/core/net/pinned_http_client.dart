import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// HTTP-клиент для обхода DNS-блокировки Узбекистана.
///
/// Проблема: узбекские провайдеры НЕ резолвят host прокси (ibilim.uz) и
/// supabase.co через системный DNS (`Failed host lookup … errno=7`), хотя
/// браузер открывает их через DoH. Нативное приложение использует системный
/// DNS → весь бэкенд недоступен.
///
/// Решение: для нашего host соединяемся напрямую с IP Vercel (минуя resolver)
/// и сами делаем TLS:
///   • SNI = host (ibilim.uz) → Vercel отдаёт валидный сертификат и наш сайт;
///   • ALPN жёстко `http/1.1` → иначе Vercel согласует h2, а dart:io говорит
///     по http/1.1, и edge уводит в редирект-петлю 308.
/// Стандартный `HttpClient.connectionFactory` так не умеет (не даёт управлять
/// ALPN), поэтому держим сокет и парсинг ответа сами.
///
/// Прокидывается в `Supabase.initialize(httpClient: …)` → покрывает
/// auth / rest / functions / storage. Realtime (websockets) идёт мимо.
class PinnedHttpClient extends http.BaseClient {
  PinnedHttpClient({required this.host, required this.ip});

  /// host, который не резолвится (например `ibilim.uz`).
  final String host;

  /// IP, на который указывает [host] (Vercel anycast). Если Vercel сменит —
  /// обновить (`dig +short A <host>`).
  final String ip;

  final IOClient _fallback = IOClient();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final uri = request.url;
    // Чужой host — обычный клиент через системный DNS.
    if (uri.host != host || uri.scheme != 'https') {
      return _fallback.send(request);
    }

    final bodyBytes = await request.finalize().toBytes();
    final port = uri.port == 0 ? 443 : uri.port;

    final raw =
        await Socket.connect(ip, port, timeout: const Duration(seconds: 20));
    SecureSocket sock;
    try {
      sock = await SecureSocket.secure(
        raw,
        host: host,
        supportedProtocols: const ['http/1.1'],
      );
    } catch (_) {
      raw.destroy();
      rethrow;
    }

    final pathQ = (uri.path.isEmpty ? '/' : uri.path) +
        (uri.hasQuery ? '?${uri.query}' : '');
    final head = StringBuffer()
      ..write('${request.method} $pathQ HTTP/1.1\r\n')
      ..write('Host: $host\r\n');
    request.headers.forEach((k, v) {
      final lk = k.toLowerCase();
      // эти заголовки выставляем сами / несовместимы с Connection: close
      if (lk == 'host' ||
          lk == 'content-length' ||
          lk == 'connection' ||
          lk == 'transfer-encoding' ||
          lk == 'accept-encoding') {
        return;
      }
      head.write('$k: $v\r\n');
    });
    head
      ..write('Accept-Encoding: identity\r\n')
      ..write('Content-Length: ${bodyBytes.length}\r\n')
      ..write('Connection: close\r\n\r\n');

    sock.add(ascii.encode(head.toString()));
    if (bodyBytes.isNotEmpty) sock.add(bodyBytes);
    await sock.flush();

    final all = <int>[];
    await for (final chunk in sock.timeout(const Duration(seconds: 60))) {
      all.addAll(chunk);
    }

    return _parse(Uint8List.fromList(all), request);
  }

  http.StreamedResponse _parse(Uint8List all, http.BaseRequest request) {
    final sep = _indexOf(all, const [13, 10, 13, 10], 0); // \r\n\r\n
    final headEnd = sep < 0 ? all.length : sep;
    final headText = latin1.decode(all.sublist(0, headEnd));
    final lines = headText.split('\r\n');

    final statusLine = lines.isEmpty ? 'HTTP/1.1 502' : lines.first;
    final sp1 = statusLine.indexOf(' ');
    final sp2 = sp1 < 0 ? -1 : statusLine.indexOf(' ', sp1 + 1);
    final statusCode = int.tryParse(
            statusLine.substring(sp1 + 1, sp2 < 0 ? statusLine.length : sp2)) ??
        502;
    final reason = sp2 < 0 ? '' : statusLine.substring(sp2 + 1);

    final headers = <String, String>{};
    for (var i = 1; i < lines.length; i++) {
      final c = lines[i].indexOf(':');
      if (c < 0) continue;
      final name = lines[i].substring(0, c).trim().toLowerCase();
      final value = lines[i].substring(c + 1).trim();
      headers[name] =
          headers.containsKey(name) ? '${headers[name]}, $value' : value;
    }

    var body = sep < 0 ? Uint8List(0) : all.sublist(sep + 4);
    if ((headers['transfer-encoding'] ?? '').toLowerCase().contains('chunked')) {
      body = _dechunk(body);
      headers.remove('transfer-encoding');
    }
    if ((headers['content-encoding'] ?? '').toLowerCase().contains('gzip')) {
      body = Uint8List.fromList(gzip.decode(body));
      headers.remove('content-encoding');
    }
    headers.remove('content-length');

    return http.StreamedResponse(
      Stream.value(body),
      statusCode,
      contentLength: body.length,
      request: request,
      headers: headers,
      reasonPhrase: reason,
      isRedirect: const [301, 302, 303, 307, 308].contains(statusCode),
    );
  }

  static int _indexOf(List<int> hay, List<int> needle, int from) {
    for (var i = from; i <= hay.length - needle.length; i++) {
      var ok = true;
      for (var j = 0; j < needle.length; j++) {
        if (hay[i + j] != needle[j]) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
    return -1;
  }

  static Uint8List _dechunk(Uint8List b) {
    final out = <int>[];
    var i = 0;
    while (i < b.length) {
      final nl = _indexOf(b, const [13, 10], i);
      if (nl < 0) break;
      var sizeStr = latin1.decode(b.sublist(i, nl)).trim();
      final semi = sizeStr.indexOf(';'); // chunk-extensions
      if (semi >= 0) sizeStr = sizeStr.substring(0, semi);
      final size = int.tryParse(sizeStr, radix: 16) ?? 0;
      i = nl + 2;
      if (size == 0) break;
      if (i + size > b.length) break;
      out.addAll(b.sublist(i, i + size));
      i += size + 2; // данные + завершающий \r\n
    }
    return Uint8List.fromList(out);
  }

  @override
  void close() {
    _fallback.close();
    super.close();
  }
}
