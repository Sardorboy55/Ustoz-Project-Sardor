import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../common/datetime.dart';
import '../../../core/providers/supabase_providers.dart';

part 'teacher_repository.g.dart';

/// Thrown by [TeacherRepository.requestPayout] with a stable [code]:
/// MIN_AMOUNT | INSUFFICIENT | INVALID_CARD | UNKNOWN.
class PayoutException implements Exception {
  PayoutException(this.code);

  final String code;

  @override
  String toString() => 'PayoutException($code)';
}

/// Teacher cabinet data: upcoming lessons, income, wallet, payouts.
class TeacherRepository {
  TeacherRepository(this._client);

  final SupabaseClient _client;

  String get _uid => _client.auth.currentUser!.id;

  /// Next lessons taught by the current user.
  Future<List<Map<String, dynamic>>> fetchUpcomingLessons({int limit = 3}) {
    return _client
        .from('bookings')
        .select('''
          id, kind, status, start_at, duration_min, price,
          teacher_subjects ( subjects ( name_uz, name_ru ) ),
          student:profiles!bookings_student_id_fkey ( full_name, avatar_url )
        ''')
        .eq('teacher_id', _uid)
        .inFilter('status', ['pending_payment', 'paid', 'in_progress'])
        .gte('start_at', DateTime.now().toUtc().toIso8601String())
        .order('start_at', ascending: true)
        .limit(limit)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  /// Sum of `lesson_income` transactions for the current Tashkent month (tiyin).
  Future<int> fetchMonthIncome() async {
    final nowTk = toTashkent(DateTime.now());
    final monthStartUtc =
        DateTime.utc(nowTk.year, nowTk.month, 1).subtract(tashkentOffset);
    final rows = await _client
        .from('wallet_transactions')
        .select('amount')
        .eq('teacher_id', _uid)
        .eq('type', 'lesson_income')
        .gte('created_at', monthStartUtc.toIso8601String());
    var sum = 0;
    for (final r in rows) {
      sum += (r['amount'] as num).toInt();
    }
    return sum;
  }

  Future<int> fetchLessonsDone() async {
    final row = await _client
        .from('teacher_profiles')
        .select('lessons_done')
        .eq('user_id', _uid)
        .maybeSingle();
    return (row?['lessons_done'] as num?)?.toInt() ?? 0;
  }

  /// {balance, frozen} in tiyin; zeros when the wallet row is missing.
  Future<Map<String, int>> fetchWallet() async {
    final row = await _client
        .from('wallets')
        .select('balance, frozen')
        .eq('teacher_id', _uid)
        .maybeSingle();
    return {
      'balance': (row?['balance'] as num?)?.toInt() ?? 0,
      'frozen': (row?['frozen'] as num?)?.toInt() ?? 0,
    };
  }

  Future<List<Map<String, dynamic>>> fetchRecentTransactions(
      {int limit = 10}) {
    return _client
        .from('wallet_transactions')
        .select('id, type, amount, created_at')
        .eq('teacher_id', _uid)
        .order('created_at', ascending: false)
        .limit(limit)
        .then((rows) => rows.cast<Map<String, dynamic>>());
  }

  /// Freezes [amountTiyin] and files a payout request
  /// (rpc `wallet_request_payout`). Maps server errors to [PayoutException].
  Future<void> requestPayout({
    required int amountTiyin,
    required String cardNumber,
  }) async {
    try {
      await _client.rpc('wallet_request_payout', params: {
        'p_amount': amountTiyin,
        'p_card_number': cardNumber,
      });
    } on PostgrestException catch (e) {
      final msg = e.message;
      if (msg.contains('PAYOUT_BELOW_MIN')) throw PayoutException('MIN_AMOUNT');
      if (msg.contains('INSUFFICIENT_BALANCE')) {
        throw PayoutException('INSUFFICIENT');
      }
      if (msg.contains('INVALID_CARD_NUMBER')) {
        throw PayoutException('INVALID_CARD');
      }
      throw PayoutException('UNKNOWN');
    }
  }
}

@Riverpod(keepAlive: true)
TeacherRepository teacherRepository(Ref ref) =>
    TeacherRepository(ref.watch(supabaseClientProvider));

@riverpod
Future<List<Map<String, dynamic>>> teacherUpcomingLessons(Ref ref) {
  return ref.watch(teacherRepositoryProvider).fetchUpcomingLessons();
}

@riverpod
Future<int> teacherMonthIncome(Ref ref) {
  return ref.watch(teacherRepositoryProvider).fetchMonthIncome();
}

@riverpod
Future<int> teacherLessonsDone(Ref ref) {
  return ref.watch(teacherRepositoryProvider).fetchLessonsDone();
}

@riverpod
Future<Map<String, int>> teacherWallet(Ref ref) {
  return ref.watch(teacherRepositoryProvider).fetchWallet();
}

@riverpod
Future<List<Map<String, dynamic>>> teacherWalletTransactions(Ref ref) {
  return ref.watch(teacherRepositoryProvider).fetchRecentTransactions();
}
