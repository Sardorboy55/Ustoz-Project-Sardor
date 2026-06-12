import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../common/datetime.dart';
import '../../../common/widgets/app_avatar.dart';
import '../../../common/widgets/empty_state.dart';
import '../../../common/widgets/error_state.dart';
import '../../../common/widgets/skeleton.dart';
import '../../../l10n/app_localizations.dart';
import '../data/chat_repository.dart';

/// Chats tab: every conversation with its counterpart and latest message.
class ChatListScreen extends ConsumerWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final chats = ref.watch(chatListProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.chatsTitle)),
      body: chats.when(
        loading: () => ListView(
          children: [for (var i = 0; i < 6; i++) const SkeletonListTile()],
        ),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(chatListProvider)),
        data: (rows) {
          if (rows.isEmpty) {
            return EmptyState(
              icon: Icons.chat_bubble_outline_rounded,
              title: l10n.chatsEmptyTitle,
              body: l10n.chatsEmptyBody,
              actionLabel: l10n.chatsEmptyAction,
              onAction: () => context.go('/catalog'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(chatListProvider);
              await ref
                  .read(chatListProvider.future)
                  .catchError((_) => <Map<String, dynamic>>[]);
            },
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: AppTokens.s8),
              itemCount: rows.length,
              separatorBuilder: (_, _) => Divider(
                height: 1,
                indent: AppTokens.s16 + 52 + AppTokens.s12,
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              itemBuilder: (context, i) => _ChatTile(chat: rows[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ChatTile extends StatelessWidget {
  const _ChatTile({required this.chat});

  final Map<String, dynamic> chat;

  String _timeLabel(BuildContext context, String? iso) {
    if (iso == null) return '';
    final l10n = AppLocalizations.of(context)!;
    final dt = DateTime.parse(iso);
    final now = DateTime.now();
    if (isSameTkDay(dt, now)) return formatTkTime(dt);
    if (isSameTkDay(dt, now.subtract(const Duration(days: 1)))) {
      return l10n.chatYesterday;
    }
    return formatTkDayMonth(dt);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final name = chat['counterpart_name'] as String? ?? '';
    final body = chat['last_body'] as String?;
    final fileName = chat['last_file_name'] as String?;
    final isMine = chat['last_is_mine'] == true;

    final String preview;
    if (body != null && body.isNotEmpty) {
      preview = body.replaceAll('\n', ' ');
    } else if (fileName != null) {
      preview = '${l10n.chatAttachment}: $fileName';
    } else {
      preview = l10n.chatNoMessages;
    }

    return InkWell(
      onTap: () => context.push('/chats/${chat['id']}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppTokens.s16,
          vertical: AppTokens.s12,
        ),
        child: Row(
          children: [
            AppAvatar(
              imageUrl: chat['counterpart_avatar'] as String?,
              name: name,
              size: 52,
            ),
            const SizedBox(width: AppTokens.s12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    isMine ? '${l10n.chatYou}: $preview' : preview,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppTokens.s8),
            Text(
              _timeLabel(context, chat['last_at'] as String?),
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
