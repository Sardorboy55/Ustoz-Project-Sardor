import 'dart:typed_data';

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'profile_repository.g.dart';

class ProfileRepository {
  ProfileRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  Future<Map<String, dynamic>?> fetchOwnProfile() async {
    return _client.from('profiles').select().eq('id', _uid).maybeSingle();
  }

  Future<void> updateProfile({
    String? fullName,
    String? locale,
    List<String>? interestCategoryIds,
    String? avatarUrl,
  }) async {
    final patch = <String, dynamic>{
      'full_name': ?fullName,
      'locale': ?locale,
      'interest_category_ids': ?interestCategoryIds,
      'avatar_url': ?avatarUrl,
    };
    if (patch.isEmpty) return;
    await _client.from('profiles').update(patch).eq('id', _uid);
  }

  Future<List<Map<String, dynamic>>> fetchCategories() async {
    return _client
        .from('categories')
        .select('id, name_uz, name_ru, icon, sort')
        .eq('is_active', true)
        .order('sort', ascending: true);
  }

  /// Creates teacher_profiles + wallets and flips is_teacher (SECURITY DEFINER).
  Future<Map<String, dynamic>> becomeTeacher() async {
    final row = await _client.rpc('become_teacher');
    return (row as Map).cast<String, dynamic>();
  }

  Future<Map<String, dynamic>?> fetchTeacherProfile() async {
    return _client
        .from('teacher_profiles')
        .select()
        .eq('user_id', _uid)
        .maybeSingle();
  }

  Future<void> updateTeacherProfile(Map<String, dynamic> patch) async {
    await _client.from('teacher_profiles').update(patch).eq('user_id', _uid);
  }

  Future<List<Map<String, dynamic>>> fetchSubjects() async {
    return _client
        .from('subjects')
        .select('id, category_id, name_uz, name_ru, slug')
        .eq('is_active', true)
        .order('name_uz', ascending: true);
  }

  Future<List<Map<String, dynamic>>> fetchOwnTeacherSubjects() async {
    return _client
        .from('teacher_subjects')
        .select('*, subjects(name_uz, name_ru)')
        .eq('teacher_id', _uid);
  }

  Future<void> upsertTeacherSubject({
    String? id,
    required String subjectId,
    int? price30,
    required int price60,
    int? price90,
    bool trialFreeEnabled = false,
  }) async {
    final row = {
      'teacher_id': _uid,
      'subject_id': subjectId,
      'price_30': price30,
      'price_60': price60,
      'price_90': price90,
      'trial_free_enabled': trialFreeEnabled,
    };
    if (id != null) {
      await _client.from('teacher_subjects').update(row).eq('id', id);
    } else {
      await _client.from('teacher_subjects').insert(row);
    }
  }

  Future<void> deleteTeacherSubject(String id) async {
    await _client.from('teacher_subjects').delete().eq('id', id);
  }

  /// Own gamification row (XP, level, streak); created on signup by trigger.
  Future<Map<String, dynamic>?> fetchGamification() async {
    return _client
        .from('gamification')
        .select('xp, level, streak_days')
        .eq('user_id', _uid)
        .maybeSingle();
  }

  /// `app_settings` rows used by gamification UI:
  /// level_names {uz:[..],ru:[..]} and level_thresholds [0,100,...].
  Future<Map<String, dynamic>> fetchLevelSettings() async {
    final rows = await _client
        .from('app_settings')
        .select('key, value')
        .inFilter('key', ['level_names', 'level_thresholds']);
    return {for (final r in rows) r['key'] as String: r['value']};
  }

  /// Support request (`support_tickets`, RLS: insert own).
  Future<void> submitSupportTicket({
    required String subject,
    required String body,
  }) async {
    await _client.from('support_tickets').insert({
      'user_id': _uid,
      'subject': subject,
      'body': body,
    });
  }

  /// Creates a one-time link token to bind this account to the Telegram
  /// notifications bot (@Ibilimuzbot). RPC is auth-only and returns the token
  /// string used in `https://t.me/Ibilimuzbot?start=<token>`.
  Future<String?> createTelegramLinkToken() async {
    final res = await _client.rpc('create_telegram_link_token');
    return res as String?;
  }

  /// Uploads into the user's folder (`<uid>/...`) per storage RLS.
  Future<String> uploadToBucket(
    String bucket,
    String path,
    List<int> bytes, {
    required String contentType,
  }) async {
    final fullPath = '$_uid/$path';
    await _client.storage
        .from(bucket)
        .uploadBinary(
          fullPath,
          Uint8List.fromList(bytes),
          fileOptions: FileOptions(contentType: contentType, upsert: true),
        );
    return _client.storage.from(bucket).getPublicUrl(fullPath);
  }
}

@Riverpod(keepAlive: true)
ProfileRepository profileRepository(Ref ref) =>
    ProfileRepository(ref.watch(supabaseClientProvider));

/// Own profile row; null while signed out.
@riverpod
Future<Map<String, dynamic>?> ownProfile(Ref ref) async {
  ref.watch(sessionControllerProvider); // refetch on auth changes
  final session = ref.read(sessionControllerProvider);
  if (session == null) return null;
  return ref.watch(profileRepositoryProvider).fetchOwnProfile();
}

@riverpod
Future<List<Map<String, dynamic>>> activeCategories(Ref ref) {
  return ref.watch(profileRepositoryProvider).fetchCategories();
}

/// XP / level / streak together with level names & thresholds.
/// Null while signed out or when the row is missing.
@riverpod
Future<Map<String, dynamic>?> gamificationInfo(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return null;
  final repo = ref.watch(profileRepositoryProvider);
  final row = await repo.fetchGamification();
  if (row == null) return null;
  final settings = await repo.fetchLevelSettings();
  return {...row, 'settings': settings};
}
