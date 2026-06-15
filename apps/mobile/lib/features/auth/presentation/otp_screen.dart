import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../l10n/app_localizations.dart';
import '../data/auth_repository.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.phone});

  final String phone;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _controller = TextEditingController();
  bool _verifying = false;
  int _resendIn = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _resendIn = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendIn <= 1) {
        t.cancel();
        setState(() => _resendIn = 0);
      } else {
        setState(() => _resendIn--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final l10n = AppLocalizations.of(context)!;
    if (_controller.text.length != 6) return;
    setState(() => _verifying = true);
    try {
      await ref
          .read(authRepositoryProvider)
          .verifyOtp(widget.phone, _controller.text);
      // splash decides /setup vs /home; the router redirect also lands there
      if (mounted) context.go('/');
    } on AuthException catch (e) {
      if (!mounted) return;
      final msg = e.statusCode == '429' ? l10n.authRateLimited : l10n.authCodeWrong;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      _controller.clear();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonError)));
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  Future<void> _resend() async {
    final l10n = AppLocalizations.of(context)!;
    try {
      await ref.read(authRepositoryProvider).sendOtp(widget.phone);
      _startTimer();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.authRateLimited)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.authOtpTitle)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.authOtpHeadline(widget.phone),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _controller,
                keyboardType: TextInputType.number,
                autofocus: true,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(fontSize: 28, letterSpacing: 12),
                textAlign: TextAlign.center,
                decoration: const InputDecoration(counterText: ''),
                onChanged: (v) {
                  // Rebuild so the Verify button's enabled state tracks the
                  // live input length, not just the next unrelated setState.
                  setState(() {});
                  if (v.length == 6 && !_verifying) _verify();
                },
              ),
              const SizedBox(height: 16),
              Center(
                child: _resendIn > 0
                    ? Text(
                        l10n.authResendIn(_resendIn),
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      )
                    : TextButton(
                        onPressed: _resend,
                        child: Text(l10n.authResend),
                      ),
              ),
              const Spacer(),
              FilledButton(
                onPressed:
                    _controller.text.length == 6 && !_verifying ? _verify : null,
                child: _verifying
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : Text(l10n.authVerify),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
