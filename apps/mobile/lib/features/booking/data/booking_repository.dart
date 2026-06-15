import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../common/datetime.dart';
import '../../../core/providers/supabase_providers.dart';

part 'booking_repository.g.dart';

class BookingRepository {
  BookingRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  Future<List<DateTime>> fetchFreeSlots({
    required String teacherId,
    required DateTime from,
    required DateTime to,
    required int durationMin,
  }) async {
    // Date keys must be in Tashkent (the TZ the RPC buckets slots by), not the
    // device's local/UTC date — otherwise a device west of UTC+5 shifts the
    // window a day and hides availability.
    final rows = await _client.rpc('get_free_slots', params: {
      'p_teacher_id': teacherId,
      'p_from': tashkentDateKey(from),
      'p_to': tashkentDateKey(to),
      'p_duration_min': durationMin,
    });
    return (rows as List)
        .map((r) => DateTime.parse(
            (r as Map<String, dynamic>)['slot_start'] as String))
        .toList();
  }

  /// Throws [BookingException] with a code on business errors.
  Future<Map<String, dynamic>> createBooking({
    required String teacherSubjectId,
    required DateTime startAt,
    required int durationMin,
    String kind = 'regular',
  }) async {
    try {
      final res = await _client.functions.invoke('booking-create', body: {
        'teacherSubjectId': teacherSubjectId,
        'startAt': startAt.toUtc().toIso8601String(),
        'durationMin': durationMin,
        'kind': kind,
      });
      final data = res.data as Map<String, dynamic>?;
      return (data?['booking'] as Map).cast<String, dynamic>();
    } on FunctionException catch (e) {
      throw _toBookingException(e);
    }
  }

  Future<Map<String, dynamic>> cancelBooking(String bookingId,
      {String? reason}) async {
    try {
      final res = await _client.functions.invoke('booking-cancel', body: {
        'bookingId': bookingId,
        'reason': ?reason,
      });
      return (res.data as Map).cast<String, dynamic>();
    } on FunctionException catch (e) {
      throw _toBookingException(e);
    }
  }

  // invoke throws FunctionException on non-2xx; unwrap our {error:{code,message}}
  static BookingException _toBookingException(FunctionException e) {
    final details = e.details;
    if (details is Map && details['error'] is Map) {
      final err = (details['error'] as Map).cast<String, dynamic>();
      return BookingException(
        err['code'] as String? ?? 'UNKNOWN',
        err['message'] as String? ?? '',
      );
    }
    if (e.status == 401) return BookingException('UNAUTHENTICATED', '');
    return BookingException('UNKNOWN', e.reasonPhrase ?? 'status ${e.status}');
  }

  Future<List<Map<String, dynamic>>> fetchMyLessons({required bool asTeacher}) {
    return _client
        .from('bookings')
        .select('''
          id, kind, status, start_at, duration_min, price,
          teacher_id, student_id,
          teacher_subjects ( subjects ( name_uz, name_ru ) ),
          student:profiles!bookings_student_id_fkey ( full_name, avatar_url ),
          teacher:teacher_profiles!bookings_teacher_id_fkey (
            slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) ),
          review:reviews ( stars )
        ''')
        .eq(asTeacher ? 'teacher_id' : 'student_id', _uid)
        .order('start_at', ascending: false)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  // ---- availability (teacher) ----

  Future<List<Map<String, dynamic>>> fetchRules() {
    return _client
        .from('availability_rules')
        .select()
        .eq('teacher_id', _uid)
        .order('weekday', ascending: true)
        .order('start_min', ascending: true)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  Future<void> addRule(int weekday, int startMin, int endMin) async {
    await _client.from('availability_rules').insert({
      'teacher_id': _uid,
      'weekday': weekday,
      'start_min': startMin,
      'end_min': endMin,
    });
  }

  Future<void> deleteRule(String id) async {
    await _client.from('availability_rules').delete().eq('id', id);
  }

  Future<List<Map<String, dynamic>>> fetchExceptions() {
    return _client
        .from('availability_exceptions')
        .select()
        .eq('teacher_id', _uid)
        .gte('date', DateTime.now().toIso8601String().substring(0, 10))
        .order('date', ascending: true)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  Future<void> addException(DateTime date) async {
    await _client.from('availability_exceptions').insert({
      'teacher_id': _uid,
      'date': date.toIso8601String().substring(0, 10),
    });
  }

  Future<void> deleteException(String id) async {
    await _client.from('availability_exceptions').delete().eq('id', id);
  }
}

class BookingException implements Exception {
  BookingException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => 'BookingException($code): $message';
}

@Riverpod(keepAlive: true)
BookingRepository bookingRepository(Ref ref) =>
    BookingRepository(ref.watch(supabaseClientProvider));

@riverpod
Future<List<Map<String, dynamic>>> myLessons(Ref ref, {required bool asTeacher}) {
  return ref.watch(bookingRepositoryProvider).fetchMyLessons(asTeacher: asTeacher);
}
