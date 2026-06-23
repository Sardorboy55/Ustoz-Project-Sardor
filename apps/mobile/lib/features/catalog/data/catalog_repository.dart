import 'package:flutter/foundation.dart' show ValueGetter;
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';
import '../../booking/data/booking_repository.dart';

part 'catalog_repository.g.dart';

/// Immutable filter set for the `catalog_teachers` RPC.
/// Prices are in **tiyin** (as stored in DB).
class CatalogFilters {
  const CatalogFilters({
    this.query,
    this.categoryId,
    this.subjectId,
    this.priceMinTiyin,
    this.priceMaxTiyin,
    this.trialOnly = false,
    this.ratingMin,
    this.lang,
    this.sort = 'recommended',
    this.page = 1,
    this.limit = 20,
  });

  final String? query;
  final String? categoryId;
  final String? subjectId;
  final int? priceMinTiyin;
  final int? priceMaxTiyin;
  final bool trialOnly;
  final num? ratingMin;
  final String? lang;
  final String sort;
  final int page;
  final int limit;

  bool get hasActiveFilters =>
      categoryId != null ||
      subjectId != null ||
      priceMinTiyin != null ||
      priceMaxTiyin != null ||
      trialOnly ||
      ratingMin != null ||
      lang != null;

  /// Nullable fields use [ValueGetter] so they can be explicitly cleared:
  /// `copyWith(categoryId: () => null)`.
  CatalogFilters copyWith({
    String? query,
    ValueGetter<String?>? categoryId,
    ValueGetter<String?>? subjectId,
    ValueGetter<int?>? priceMinTiyin,
    ValueGetter<int?>? priceMaxTiyin,
    bool? trialOnly,
    ValueGetter<num?>? ratingMin,
    ValueGetter<String?>? lang,
    String? sort,
    int? page,
    int? limit,
  }) {
    return CatalogFilters(
      query: query ?? this.query,
      categoryId: categoryId != null ? categoryId() : this.categoryId,
      subjectId: subjectId != null ? subjectId() : this.subjectId,
      priceMinTiyin:
          priceMinTiyin != null ? priceMinTiyin() : this.priceMinTiyin,
      priceMaxTiyin:
          priceMaxTiyin != null ? priceMaxTiyin() : this.priceMaxTiyin,
      trialOnly: trialOnly ?? this.trialOnly,
      ratingMin: ratingMin != null ? ratingMin() : this.ratingMin,
      lang: lang != null ? lang() : this.lang,
      sort: sort ?? this.sort,
      page: page ?? this.page,
      limit: limit ?? this.limit,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is CatalogFilters &&
      other.query == query &&
      other.categoryId == categoryId &&
      other.subjectId == subjectId &&
      other.priceMinTiyin == priceMinTiyin &&
      other.priceMaxTiyin == priceMaxTiyin &&
      other.trialOnly == trialOnly &&
      other.ratingMin == ratingMin &&
      other.lang == lang &&
      other.sort == sort &&
      other.page == page &&
      other.limit == limit;

  @override
  int get hashCode => Object.hash(query, categoryId, subjectId, priceMinTiyin,
      priceMaxTiyin, trialOnly, ratingMin, lang, sort, page, limit);
}

class CatalogRepository {
  CatalogRepository(this._client);

  final SupabaseClient _client;

  Future<List<Map<String, dynamic>>> fetchCards(CatalogFilters f) async {
    final rows = await _client.rpc('catalog_teachers', params: {
      'p_query': (f.query?.trim().isEmpty ?? true) ? null : f.query!.trim(),
      'p_category_id': f.categoryId,
      'p_subject_id': f.subjectId,
      'p_price_min': f.priceMinTiyin,
      'p_price_max': f.priceMaxTiyin,
      'p_rating_min': f.ratingMin,
      'p_lang': f.lang,
      'p_trial_only': f.trialOnly,
      'p_sort': f.sort,
      'p_limit': f.limit,
      'p_offset': (f.page - 1) * f.limit,
    });
    return (rows as List).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>?> fetchTeacher(String slug) async {
    return _client
        .from('teacher_profiles')
        .select('''
          user_id, slug, headline_uz, headline_ru, bio_uz, bio_ru, intro_video_url,
          experience_years, teaching_langs, is_verified, tier, rating_avg,
          rating_count, lessons_done,
          profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ),
          teacher_subjects ( id, price_30, price_60, price_90, trial_free_enabled,
                             trial_discount_pct, is_active,
                             pkg5_discount_pct, pkg10_discount_pct, pkg20_discount_pct,
                             subjects ( name_uz, name_ru ) )
        ''')
        .eq('slug', slug)
        .maybeSingle();
  }

  Future<List<Map<String, dynamic>>> fetchSubjects({String? categoryId}) {
    var q = _client
        .from('subjects')
        .select('id, category_id, name_uz, name_ru, slug')
        .eq('is_active', true);
    if (categoryId != null) q = q.eq('category_id', categoryId);
    return q
        .order('name_uz', ascending: true)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }
}

@Riverpod(keepAlive: true)
CatalogRepository catalogRepository(Ref ref) =>
    CatalogRepository(ref.watch(supabaseClientProvider));

@riverpod
Future<List<Map<String, dynamic>>> catalogCards(Ref ref, CatalogFilters filters) {
  return ref.watch(catalogRepositoryProvider).fetchCards(filters);
}

@riverpod
Future<Map<String, dynamic>?> teacherBySlug(Ref ref, String slug) {
  return ref.watch(catalogRepositoryProvider).fetchTeacher(slug);
}

/// All active subjects (for the filters sheet dropdown).
@riverpod
Future<List<Map<String, dynamic>>> activeSubjects(Ref ref) {
  return ref.watch(catalogRepositoryProvider).fetchSubjects();
}

/// Next 6 free 60-minute slots within 3 days — the availability preview on
/// the public teacher profile (get_free_slots works for anonymous users too).
@riverpod
Future<List<DateTime>> teacherSlotPreview(Ref ref, String teacherId) async {
  final now = DateTime.now();
  final slots = await ref.watch(bookingRepositoryProvider).fetchFreeSlots(
        teacherId: teacherId,
        from: now,
        to: now.add(const Duration(days: 2)),
        durationMin: 60,
      );
  return slots.where((s) => s.isAfter(now)).take(6).toList();
}
