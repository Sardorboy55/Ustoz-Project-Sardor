import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'reviews_repository.g.dart';

/// Thrown when the student already left a review for this booking
/// (PK = booking_id, unique violation 23505).
class DuplicateReviewException implements Exception {}

class ReviewsRepository {
  ReviewsRepository(this._client);

  final SupabaseClient _client;

  /// Public reviews of a teacher, newest first.
  /// Author names are NOT readable under RLS — render them anonymously.
  Future<List<Map<String, dynamic>>> fetchTeacherReviews(
    String teacherId, {
    required int limit,
    required int offset,
  }) {
    return _client
        .from('reviews')
        .select('booking_id, stars, body, created_at')
        .eq('teacher_id', teacherId)
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  /// INSERT is allowed only for the student's own completed booking (RLS).
  Future<void> submitReview({
    required String bookingId,
    required String teacherId,
    required int stars,
    String? body,
  }) async {
    try {
      await _client.from('reviews').insert({
        'booking_id': bookingId,
        'student_id': _client.auth.currentUser!.id,
        'teacher_id': teacherId,
        'stars': stars,
        'body': (body == null || body.trim().isEmpty) ? null : body.trim(),
      });
    } on PostgrestException catch (e) {
      if (e.code == '23505') throw DuplicateReviewException();
      rethrow;
    }
  }
}

@Riverpod(keepAlive: true)
ReviewsRepository reviewsRepository(Ref ref) =>
    ReviewsRepository(ref.watch(supabaseClientProvider));
