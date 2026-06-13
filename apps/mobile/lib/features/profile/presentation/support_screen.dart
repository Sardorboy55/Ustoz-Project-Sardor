import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../common/widgets/loading_button.dart';
import '../../../l10n/app_localizations.dart';
import '../data/profile_repository.dart';

/// Support request form → `support_tickets` insert + success state.
class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _sending = false;
  bool _sent = false;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  bool get _canSend =>
      _subject.text.trim().isNotEmpty && _message.text.trim().isNotEmpty;

  Future<void> _send() async {
    final l10n = AppLocalizations.of(context)!;
    if (!_canSend || _sending) return;
    setState(() => _sending = true);
    try {
      await ref.read(profileRepositoryProvider).submitSupportTicket(
            subject: _subject.text.trim(),
            body: _message.text.trim(),
          );
      if (mounted) setState(() => _sent = true);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.commonError)));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.menuSupport)),
      body: _sent ? _success(l10n) : _form(l10n),
    );
  }

  Widget _success(AppLocalizations l10n) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppTokens.s32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppTokens.of(context).success.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.check_rounded,
                size: 44,
                color: AppTokens.of(context).success,
              ),
            ),
            const SizedBox(height: AppTokens.s16),
            Text(
              l10n.supportSuccessTitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: AppTokens.s8),
            Text(
              l10n.supportSuccessBody,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppTokens.s24),
            FilledButton(
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 48),
                padding:
                    const EdgeInsets.symmetric(horizontal: AppTokens.s24),
              ),
              onPressed: () => Navigator.of(context).pop(),
              child: Text(l10n.commonClose),
            ),
          ],
        ),
      ),
    );
  }

  Widget _form(AppLocalizations l10n) {
    return ListView(
      padding: const EdgeInsets.all(AppTokens.s16),
      children: [
        TextField(
          controller: _subject,
          maxLength: 120,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(labelText: l10n.supportSubject),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: AppTokens.s8),
        TextField(
          controller: _message,
          maxLines: 6,
          maxLength: 2000,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            labelText: l10n.supportMessage,
            alignLabelWithHint: true,
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: AppTokens.s16),
        LoadingButton(
          loading: _sending,
          onPressed: _canSend ? _send : null,
          child: Text(l10n.supportSend),
        ),
      ],
    );
  }
}
