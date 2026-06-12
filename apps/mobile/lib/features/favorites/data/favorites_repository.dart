import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'favorites_repository.g.dart';

/// Bookmarked teachers (`student_favorites`, RLS: own rows only).
class FavoritesRepository {
  FavoritesRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  Future<Set<String>> fetchIds() async {
    final rows = await _client
        .from('student_favorites')
        .select('teacher_id')
        .eq('student_id', _uid);
    return rows.map((r) => r['teacher_id'] as String).toSet();
  }

  Future<void> add(String teacherId) async {
    await _client.from('student_favorites').upsert(
      {'student_id': _uid, 'teacher_id': teacherId},
      onConflict: 'student_id,teacher_id',
      ignoreDuplicates: true,
    );
  }

  Future<void> remove(String teacherId) async {
    await _client
        .from('student_favorites')
        .delete()
        .eq('student_id', _uid)
        .eq('teacher_id', teacherId);
  }

  /// Favorite teachers as catalog-card-shaped maps
  /// (same keys the horizontal teacher cards read).
  Future<List<Map<String, dynamic>>> fetchCards({int limit = 10}) async {
    final rows = await _client
        .from('student_favorites')
        .select('''
          teacher_id, created_at,
          teacher_profiles (
            user_id, slug, headline_uz, headline_ru, rating_avg, rating_count,
            lessons_done, tier, is_verified,
            profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ),
            teacher_subjects ( price_60, is_active )
          )
        ''')
        .eq('student_id', _uid)
        .order('created_at', ascending: false)
        .limit(limit);

    final cards = <Map<String, dynamic>>[];
    for (final row in rows) {
      final t = (row['teacher_profiles'] as Map?)?.cast<String, dynamic>();
      if (t == null) continue;
      final profile = (t['profiles'] as Map?)?.cast<String, dynamic>();
      final subjects = (t['teacher_subjects'] as List? ?? [])
          .cast<Map<String, dynamic>>()
          .where((s) => s['is_active'] == true && s['price_60'] != null)
          .toList();
      num? minPrice;
      for (final s in subjects) {
        final p = s['price_60'] as num;
        if (minPrice == null || p < minPrice) minPrice = p;
      }
      cards.add({
        'user_id': t['user_id'],
        'slug': t['slug'],
        'full_name': profile?['full_name'] ?? '',
        'avatar_url': profile?['avatar_url'],
        'headline_uz': t['headline_uz'],
        'headline_ru': t['headline_ru'],
        'rating_avg': t['rating_avg'],
        'rating_count': t['rating_count'],
        'lessons_done': t['lessons_done'],
        'tier': t['tier'],
        'is_verified': t['is_verified'],
        'min_price_60': minPrice,
      });
    }
    return cards;
  }
}

@Riverpod(keepAlive: true)
FavoritesRepository favoritesRepository(Ref ref) =>
    FavoritesRepository(ref.watch(supabaseClientProvider));

/// Set of bookmarked teacher ids with optimistic [toggle].
/// Empty set for guests — heart taps must route guests to auth instead.
@Riverpod(keepAlive: true)
class FavoriteIds extends _$FavoriteIds {
  @override
  Future<Set<String>> build() async {
    final session = ref.watch(sessionControllerProvider);
    if (session == null) return <String>{};
    return ref.read(favoritesRepositoryProvider).fetchIds();
  }

  /// Optimistically flips [teacherId]; reverts on backend error.
  Future<void> toggle(String teacherId) async {
    final current = state.value ?? <String>{};
    final wasFavorite = current.contains(teacherId);
    final next = {...current};
    if (wasFavorite) {
      next.remove(teacherId);
    } else {
      next.add(teacherId);
    }
    state = AsyncData(next);
    try {
      final repo = ref.read(favoritesRepositoryProvider);
      if (wasFavorite) {
        await repo.remove(teacherId);
      } else {
        await repo.add(teacherId);
      }
      ref.invalidate(favoriteCardsProvider);
    } catch (_) {
      state = AsyncData(current); // revert
      rethrow;
    }
  }
}

/// Favorite teacher cards for the home row.
@riverpod
Future<List<Map<String, dynamic>>> favoriteCards(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return const [];
  return ref.watch(favoritesRepositoryProvider).fetchCards();
}
