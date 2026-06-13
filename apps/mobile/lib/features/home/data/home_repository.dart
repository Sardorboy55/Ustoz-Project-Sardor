import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../common/datetime.dart';
import '../../../core/providers/supabase_providers.dart';

part 'home_repository.g.dart';

class HomeRepository {
  HomeRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  /// The student's nearest active booking (pending_payment / paid /
  /// in_progress), including one that already started.
  Future<Map<String, dynamic>?> fetchNextLesson() async {
    final rows = await _client
        .from('bookings')
        .select('''
          id, kind, status, start_at, duration_min, price,
          teacher_subjects ( subjects ( name_uz, name_ru ) ),
          teacher:teacher_profiles!bookings_teacher_id_fkey (
            slug, profiles!teacher_profiles_user_id_fkey ( full_name, avatar_url ) )
        ''')
        .eq('student_id', _uid)
        .inFilter('status', ['pending_payment', 'paid', 'in_progress'])
        .gte(
          'start_at',
          DateTime.now()
              .toUtc()
              .subtract(const Duration(hours: 2))
              .toIso8601String(),
        )
        .order('start_at', ascending: true)
        .limit(1);
    return rows.isEmpty ? null : rows.first;
  }

  /// How many of the teacher's lessons fall on today's Tashkent date.
  Future<int> fetchTeacherTodayCount() async {
    final nowTk = toTashkent(DateTime.now());
    final dayStartUtc = DateTime.utc(nowTk.year, nowTk.month, nowTk.day)
        .subtract(tashkentOffset);
    final dayEndUtc = dayStartUtc.add(const Duration(days: 1));
    final rows = await _client
        .from('bookings')
        .select('id')
        .eq('teacher_id', _uid)
        .inFilter('status', ['paid', 'in_progress', 'completed'])
        .gte('start_at', dayStartUtc.toIso8601String())
        .lt('start_at', dayEndUtc.toIso8601String());
    return rows.length;
  }
}

@Riverpod(keepAlive: true)
HomeRepository homeRepository(Ref ref) =>
    HomeRepository(ref.watch(supabaseClientProvider));

@riverpod
Future<Map<String, dynamic>?> nextLesson(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return null;
  return ref.watch(homeRepositoryProvider).fetchNextLesson();
}

@riverpod
Future<int> teacherTodayCount(Ref ref) async {
  final session = ref.watch(sessionControllerProvider);
  if (session == null) return 0;
  return ref.watch(homeRepositoryProvider).fetchTeacherTodayCount();
}
