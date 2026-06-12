import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'catalog_repository.g.dart';

class CatalogFilters {
  const CatalogFilters({
    this.query,
    this.categoryId,
    this.subjectId,
    this.trialOnly = false,
    this.ratingMin,
    this.lang,
    this.sort = 'recommended',
    this.page = 1,
  });

  final String? query;
  final String? categoryId;
  final String? subjectId;
  final bool trialOnly;
  final num? ratingMin;
  final String? lang;
  final String sort;
  final int page;

  CatalogFilters copyWith({
    String? query,
    String? Function()? categoryId,
    bool? trialOnly,
    String? sort,
    int? page,
  }) {
    return CatalogFilters(
      query: query ?? this.query,
      categoryId: categoryId != null ? categoryId() : this.categoryId,
      subjectId: subjectId,
      trialOnly: trialOnly ?? this.trialOnly,
      ratingMin: ratingMin,
      lang: lang,
      sort: sort ?? this.sort,
      page: page ?? this.page,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is CatalogFilters &&
      other.query == query &&
      other.categoryId == categoryId &&
      other.subjectId == subjectId &&
      other.trialOnly == trialOnly &&
      other.ratingMin == ratingMin &&
      other.lang == lang &&
      other.sort == sort &&
      other.page == page;

  @override
  int get hashCode =>
      Object.hash(query, categoryId, subjectId, trialOnly, ratingMin, lang, sort, page);
}

class CatalogRepository {
  CatalogRepository(this._client);

  final SupabaseClient _client;

  Future<List<Map<String, dynamic>>> fetchCards(CatalogFilters f) async {
    final rows = await _client.rpc('catalog_teachers', params: {
      'p_query': (f.query?.trim().isEmpty ?? true) ? null : f.query!.trim(),
      'p_category_id': f.categoryId,
      'p_subject_id': f.subjectId,
      'p_rating_min': f.ratingMin,
      'p_lang': f.lang,
      'p_trial_only': f.trialOnly,
      'p_sort': f.sort,
      'p_limit': 20,
      'p_offset': (f.page - 1) * 20,
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
          profiles ( full_name, avatar_url ),
          teacher_subjects ( id, price_30, price_60, price_90, trial_free_enabled,
                             trial_discount_pct, is_active,
                             subjects ( name_uz, name_ru ) )
        ''')
        .eq('slug', slug)
        .maybeSingle();
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
