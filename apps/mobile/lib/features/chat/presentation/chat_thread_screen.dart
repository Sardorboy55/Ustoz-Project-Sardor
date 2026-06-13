import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../l10n/app_localizations.dart';
import '../data/chat_repository.dart';

const _pageSize = 50;

/// One conversation: day-grouped bubbles, realtime updates, composer.
/// Contact info in messages is masked server-side (`body_was_masked`).
class ChatThreadScreen extends ConsumerStatefulWidget {
  const ChatThreadScreen({super.key, required this.chatId});

  final String chatId;

  @override
  ConsumerState<ChatThreadScreen> createState() => _ChatThreadScreenState();
}

class _ChatThreadScreenState extends ConsumerState<ChatThreadScreen> {
  /// Newest first (rendered with a reversed ListView).
  final List<Map<String, dynamic>> _messages = [];
  final _scroll = ScrollController();
  final _input = TextEditingController();

  bool _loading = true;
  bool _error = false;
  bool _hasMore = false;
  bool _loadingMore = false;
  bool _sending = false;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _loadInitial();
    _channel = ref
        .read(chatRepositoryProvider)
        .subscribeToMessages(widget.chatId, _onRealtimeInsert);
    _scroll.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    final channel = _channel;
    if (channel != null) {
      ref.read(chatRepositoryProvider).unsubscribe(channel);
    }
    _scroll.dispose();
    _input.dispose();
    super.dispose();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final rows =
          await ref.read(chatRepositoryProvider).fetchMessages(widget.chatId);
      if (!mounted) return;
      setState(() {
        _messages
          ..clear()
          ..addAll(rows);
        _hasMore = rows.length == _pageSize;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = true;
        });
      }
    }
  }

  void _maybeLoadMore() {
    if (!_hasMore || _loadingMore || _messages.isEmpty) return;
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 240) {
      _loadMore();
    }
  }

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);
    try {
      final rows = await ref.read(chatRepositoryProvider).fetchMessages(
            widget.chatId,
            before: _messages.last['created_at'] as String,
          );
      if (!mounted) return;
      setState(() {
        _messages.addAll(rows);
        _hasMore = rows.length == _pageSize;
        _loadingMore = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _onRealtimeInsert(Map<String, dynamic> row) {
    if (!mounted) return;
    if (_messages.any((m) => m['id'] == row['id'])) return;
    setState(() => _messages.insert(0, row));
    ref.invalidate(chatListProvider);
    _scrollToBottom();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    final l10n = AppLocalizations.of(context)!;
    setState(() => _sending = true);
    try {
      final row = await ref
          .read(chatRepositoryProvider)
          .sendMessage(widget.chatId, text);
      if (!mounted) return;
      setState(() {
        if (!_messages.any((m) => m['id'] == row['id'])) {
          _messages.insert(0, row);
        }
        _sending = false;
      });
      _input.clear();
      ref.invalidate(chatListProvider);
      _scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonError)));
    }
  }

  void _scrollToBottom() {
    if (!_scroll.hasClients) return;
    _scroll.animateTo(
      0,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  String _dayLabel(BuildContext context, DateTime dt) {
    final l10n = AppLocalizations.of(context)!;
    final now = DateTime.now();
    if (isSameTkDay(dt, now)) return l10n.todayLabel;
    if (isSameTkDay(dt, now.subtract(const Duration(days: 1)))) {
      return l10n.chatYesterday;
    }
    final locale = Localizations.localeOf(context).languageCode;
    return DateFormat('d MMMM', locale).format(toTashkent(dt));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final myId = Supabase.instance.client.auth.currentUser?.id;
    final info = ref.watch(chatInfoProvider(widget.chatId));

    return Scaffold(
      appBar: AppBar(
        centerTitle: false,
        titleSpacing: 0,
        title: info.when(
          loading: () => const SkeletonPulse(
            child: Row(children: [
              SkeletonBox.circle(size: 36),
              SizedBox(width: AppTokens.s12),
              SkeletonBox(width: 120, height: 16),
            ]),
          ),
          error: (e, _) => Text(l10n.chatsTitle),
          data: (chat) => Row(
            children: [
              AppAvatar(
                imageUrl: chat['counterpart_avatar'] as String?,
                name: chat['counterpart_name'] as String? ?? '',
                size: 36,
              ),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Text(
                  chat['counterpart_name'] as String? ?? '',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style:
                      const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          _SafetyBanner(text: l10n.chatSafetyNote),
          Expanded(child: _buildMessages(myId)),
          _Composer(
            controller: _input,
            sending: _sending,
            onSend: _send,
            hint: l10n.chatInputHint,
          ),
        ],
      ),
    );
  }

  Widget _buildMessages(String? myId) {
    final l10n = AppLocalizations.of(context)!;
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error) {
      return ErrorState(onRetry: _loadInitial);
    }
    if (_messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppTokens.s32),
          child: Text(
            l10n.chatNoMessages,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    return ListView.builder(
      controller: _scroll,
      reverse: true,
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.s16,
        vertical: AppTokens.s12,
      ),
      itemCount: _messages.length + (_loadingMore ? 1 : 0),
      itemBuilder: (context, i) {
        if (i >= _messages.length) {
          return const Padding(
            padding: EdgeInsets.all(AppTokens.s12),
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2.4),
              ),
            ),
          );
        }
        final msg = _messages[i];
        final created = DateTime.parse(msg['created_at'] as String);
        final isMine = msg['sender_id'] == myId;

        // day chip above the oldest message of each Tashkent day
        Widget? dayChip;
        final isOldestLoaded = i == _messages.length - 1;
        if (isOldestLoaded && !_hasMore) {
          dayChip = _DayChip(label: _dayLabel(context, created));
        } else if (!isOldestLoaded) {
          final older =
              DateTime.parse(_messages[i + 1]['created_at'] as String);
          if (!isSameTkDay(created, older)) {
            dayChip = _DayChip(label: _dayLabel(context, created));
          }
        }

        // tighter spacing between consecutive bubbles of one author
        final newerSameAuthor = i > 0 &&
            _messages[i - 1]['sender_id'] == msg['sender_id'] &&
            isSameTkDay(
                created, DateTime.parse(_messages[i - 1]['created_at'] as String));

        return Column(
          crossAxisAlignment:
              isMine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            ?dayChip,
            Padding(
              padding:
                  EdgeInsets.only(bottom: newerSameAuthor ? AppTokens.s4 : AppTokens.s12),
              child: _MessageBubble(message: msg, isMine: isMine),
            ),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

class _SafetyBanner extends StatelessWidget {
  const _SafetyBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      width: double.infinity,
      color: isLight ? AppColors.primaryTint : scheme.primaryContainer,
      padding: const EdgeInsets.symmetric(
        horizontal: AppTokens.s16,
        vertical: AppTokens.s8,
      ),
      child: Row(
        children: [
          Icon(Icons.shield_outlined, size: 16, color: scheme.primary),
          const SizedBox(width: AppTokens.s8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 12,
                height: 1.3,
                color: isLight
                    ? AppColors.primaryDark
                    : scheme.onPrimaryContainer,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Align(
      alignment: Alignment.center,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppTokens.s12, top: AppTokens.s4),
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.s12,
          vertical: AppTokens.s4,
        ),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppTokens.radiusChip),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: scheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMine});

  final Map<String, dynamic> message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final isLight = Theme.of(context).brightness == Brightness.light;
    final body = message['body'] as String?;
    final fileName = message['file_name'] as String?;
    final masked = message['body_was_masked'] == true;
    final time =
        formatTkTime(DateTime.parse(message['created_at'] as String));

    final bg = isMine
        ? scheme.primary
        : (isLight ? AppColors.zinc100 : scheme.surfaceContainerHighest);
    final fg = isMine ? scheme.onPrimary : scheme.onSurface;
    final fgMuted =
        isMine ? scheme.onPrimary.withValues(alpha: 0.7) : scheme.onSurfaceVariant;

    return ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: MediaQuery.sizeOf(context).width * 0.78,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(
          AppTokens.s12,
          AppTokens.s8,
          AppTokens.s12,
          AppTokens.s8,
        ),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(AppTokens.radiusCard),
            topRight: const Radius.circular(AppTokens.radiusCard),
            bottomLeft: Radius.circular(isMine ? AppTokens.radiusCard : 4),
            bottomRight: Radius.circular(isMine ? 4 : AppTokens.radiusCard),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (body != null && body.isNotEmpty)
              Text(body, style: TextStyle(color: fg, fontSize: 15, height: 1.35))
            else if (fileName != null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.attach_file_rounded, size: 16, color: fgMuted),
                  const SizedBox(width: AppTokens.s4),
                  Flexible(
                    child: Text(
                      fileName,
                      style: TextStyle(color: fg, fontSize: 14),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 3),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (masked) ...[
                  Icon(Icons.shield_outlined, size: 11, color: fgMuted),
                  const SizedBox(width: 3),
                  Flexible(
                    child: Text(
                      l10n.chatMaskedNote,
                      style: TextStyle(
                        fontSize: 10,
                        fontStyle: FontStyle.italic,
                        color: fgMuted,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppTokens.s8),
                ],
                Text(time, style: TextStyle(fontSize: 10, color: fgMuted)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.hint,
  });

  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      padding: EdgeInsets.only(
        left: AppTokens.s12,
        right: AppTokens.s12,
        top: AppTokens.s8,
        bottom: MediaQuery.paddingOf(context).bottom + AppTokens.s8,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (context, value, _) => TextField(
                controller: controller,
                enabled: !sending,
                minLines: 1,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: hint,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppTokens.s16,
                    vertical: AppTokens.s12,
                  ),
                ),
                onSubmitted: (_) => onSend(),
              ),
            ),
          ),
          const SizedBox(width: AppTokens.s8),
          ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (context, value, _) {
              final canSend = value.text.trim().isNotEmpty && !sending;
              return SizedBox(
                width: 46,
                height: 46,
                child: IconButton.filled(
                  onPressed: canSend ? onSend : null,
                  icon: sending
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            color: scheme.onPrimary,
                          ),
                        )
                      : const Icon(Icons.send_rounded, size: 20),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
