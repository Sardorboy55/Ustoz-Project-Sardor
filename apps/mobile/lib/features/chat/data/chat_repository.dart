import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'chat_repository.g.dart';

const _chatSelect = '''
  id, student_id, teacher_id, last_message_at,
  student:profiles!chats_student_id_fkey ( id, full_name, avatar_url ),
  teacher:teacher_profiles!chats_teacher_id_fkey (
    user_id, slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) )
''';

/// Chats (`chats` table). RLS: participants read; ONLY the student may create
/// a chat (insert {student_id: uid, teacher_id}). Message bodies are stored
/// already masked by the `mask_contacts` trigger (`body_was_masked` flag).
class ChatRepository {
  ChatRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  /// Returns the chat id between the current student and [teacherId],
  /// creating it when missing.
  Future<String> ensureChatWithTeacher(String teacherId) async {
    final existing = await _client
        .from('chats')
        .select('id')
        .eq('student_id', _uid)
        .eq('teacher_id', teacherId)
        .maybeSingle();
    if (existing != null) return existing['id'] as String;

    try {
      final row = await _client
          .from('chats')
          .insert({'student_id': _uid, 'teacher_id': teacherId})
          .select('id')
          .single();
      return row['id'] as String;
    } on PostgrestException catch (e) {
      if (e.code == '23505') {
        // created concurrently — fetch it
        final row = await _client
            .from('chats')
            .select('id')
            .eq('student_id', _uid)
            .eq('teacher_id', teacherId)
            .single();
        return row['id'] as String;
      }
      rethrow;
    }
  }

  /// Existing chat with [studentId] when the current user is the teacher.
  /// Teachers cannot create chats — returns null when none exists yet.
  Future<String?> findChatWithStudent(String studentId) async {
    final row = await _client
        .from('chats')
        .select('id')
        .eq('teacher_id', _uid)
        .eq('student_id', studentId)
        .maybeSingle();
    return row?['id'] as String?;
  }

  /// All chats of the current user (either role) with the counterpart and the
  /// latest message, newest activity first. Normalized map keys:
  /// id, counterpart_name, counterpart_avatar, last_body, last_file_name,
  /// last_at (String?), last_is_mine (bool).
  Future<List<Map<String, dynamic>>> fetchChats() async {
    final rows = await _client
        .from('chats')
        .select('$_chatSelect, messages ( body, file_name, sender_id, created_at )')
        .order('last_message_at', ascending: false, nullsFirst: false)
        .order('created_at', ascending: false, referencedTable: 'messages')
        .limit(1, referencedTable: 'messages');

    return rows.map((row) {
      final normalized = _normalizeChat(row);
      final messages =
          (row['messages'] as List? ?? const []).cast<Map<String, dynamic>>();
      final last = messages.isEmpty ? null : messages.first;
      normalized['last_body'] = last?['body'];
      normalized['last_file_name'] = last?['file_name'];
      normalized['last_at'] = last?['created_at'] ?? row['last_message_at'];
      normalized['last_is_mine'] = last != null && last['sender_id'] == _uid;
      return normalized;
    }).toList();
  }

  /// Single chat header info for the thread screen.
  Future<Map<String, dynamic>> fetchChatById(String chatId) async {
    final row =
        await _client.from('chats').select(_chatSelect).eq('id', chatId).single();
    return _normalizeChat(row);
  }

  Map<String, dynamic> _normalizeChat(Map<String, dynamic> row) {
    final iAmStudent = row['student_id'] == _uid;
    final Map<String, dynamic>? counterpart;
    if (iAmStudent) {
      final teacher = (row['teacher'] as Map?)?.cast<String, dynamic>();
      counterpart = (teacher?['profiles'] as Map?)?.cast<String, dynamic>();
    } else {
      counterpart = (row['student'] as Map?)?.cast<String, dynamic>();
    }
    return {
      'id': row['id'],
      'student_id': row['student_id'],
      'teacher_id': row['teacher_id'],
      'i_am_student': iAmStudent,
      'counterpart_name': counterpart?['full_name'] ?? '',
      'counterpart_avatar': counterpart?['avatar_url'],
    };
  }

  /// One page of messages, newest first. Pass the oldest loaded `created_at`
  /// as [before] to fetch the previous page.
  Future<List<Map<String, dynamic>>> fetchMessages(
    String chatId, {
    int limit = 50,
    String? before,
  }) async {
    var query = _client
        .from('messages')
        .select('id, body, body_was_masked, file_url, file_name, sender_id, created_at')
        .eq('chat_id', chatId);
    if (before != null) query = query.lt('created_at', before);
    final rows =
        await query.order('created_at', ascending: false).limit(limit);
    return rows.cast<Map<String, dynamic>>();
  }

  /// Inserts a message and returns the stored row (body comes back already
  /// masked by the server trigger when it contained contacts).
  Future<Map<String, dynamic>> sendMessage(String chatId, String body) async {
    final row = await _client
        .from('messages')
        .insert({'chat_id': chatId, 'sender_id': _uid, 'body': body.trim()})
        .select('id, body, body_was_masked, file_url, file_name, sender_id, created_at')
        .single();
    return row;
  }

  /// Realtime INSERT stream for one chat. Remember to [unsubscribe].
  RealtimeChannel subscribeToMessages(
    String chatId,
    void Function(Map<String, dynamic> message) onInsert,
  ) {
    final channel = _client.channel('messages-$chatId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'messages',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'chat_id',
          value: chatId,
        ),
        callback: (payload) =>
            onInsert(Map<String, dynamic>.from(payload.newRecord)),
      )
      ..subscribe();
    return channel;
  }

  Future<void> unsubscribe(RealtimeChannel channel) =>
      _client.removeChannel(channel);
}

@Riverpod(keepAlive: true)
ChatRepository chatRepository(Ref ref) =>
    ChatRepository(ref.watch(supabaseClientProvider));

/// Chat list for the Chats tab; empty for guests.
@riverpod
Future<List<Map<String, dynamic>>> chatList(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return const [];
  return ref.watch(chatRepositoryProvider).fetchChats();
}

/// Thread header info (counterpart name/avatar).
@riverpod
Future<Map<String, dynamic>> chatInfo(Ref ref, String chatId) {
  return ref.watch(chatRepositoryProvider).fetchChatById(chatId);
}
