import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'notifications_repository.g.dart';

/// In-app notifications (`notifications` table). RLS: own rows; the client
/// may only update `read_at`. Future-scheduled rows are hidden until due.
class NotificationsRepository {
  NotificationsRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  String get _nowIso => DateTime.now().toUtc().toIso8601String();

  Future<List<Map<String, dynamic>>> fetchAll({int limit = 50}) {
    return _client
        .from('notifications')
        .select('id, template, payload, scheduled_at, read_at')
        .eq('user_id', _uid)
        .lte('scheduled_at', _nowIso)
        .order('scheduled_at', ascending: false)
        .limit(limit)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  Future<int> unreadCount() async {
    final rows = await _client
        .from('notifications')
        .select('id')
        .eq('user_id', _uid)
        .isFilter('read_at', null)
        .lte('scheduled_at', _nowIso);
    return rows.length;
  }

  Future<void> markRead(String id) async {
    await _client
        .from('notifications')
        .update({'read_at': _nowIso})
        .eq('id', id)
        .eq('user_id', _uid);
  }

  Future<void> markAllRead() async {
    await _client
        .from('notifications')
        .update({'read_at': _nowIso})
        .eq('user_id', _uid)
        .isFilter('read_at', null);
  }
}

@Riverpod(keepAlive: true)
NotificationsRepository notificationsRepository(Ref ref) =>
    NotificationsRepository(ref.watch(supabaseClientProvider));

@riverpod
Future<List<Map<String, dynamic>>> notificationsList(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return const [];
  return ref.watch(notificationsRepositoryProvider).fetchAll();
}

/// Badge counter for the home header bell / profile menu.
@riverpod
Future<int> unreadNotificationsCount(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return 0;
  return ref.watch(notificationsRepositoryProvider).unreadCount();
}
