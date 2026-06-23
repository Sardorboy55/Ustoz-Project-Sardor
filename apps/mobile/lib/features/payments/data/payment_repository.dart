import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'payment_repository.g.dart';

/// All manual Paynet-QR payment flows (lesson / package / Pro), on the SAME
/// Supabase backend as the website. The backend RPCs + the `payment-receipts`
/// bucket already exist — this only calls them.
class PaymentRepository {
  PaymentRepository(this._client);

  final SupabaseClient _client;
  String get _uid => _client.auth.currentUser!.id;

  static const _bucket = 'payment-receipts';

  // RPCs may return a single row map OR a 1-element list (PostgREST) — normalize.
  Map<String, dynamic>? _row(dynamic data) {
    if (data is List) {
      return data.isEmpty ? null : (data.first as Map).cast<String, dynamic>();
    }
    if (data is Map) return data.cast<String, dynamic>();
    return null;
  }

  // ---- LESSON ----
  Future<Map<String, dynamic>?> ensureLessonPayment(String bookingId) async =>
      _row(await _client
          .rpc('ensure_lesson_payment', params: {'p_booking_id': bookingId}));

  Future<void> submitLessonProof(String bookingId, String receiptPath) =>
      _client.rpc('submit_payment_proof',
          params: {'p_booking_id': bookingId, 'p_receipt_path': receiptPath});

  Future<Map<String, dynamic>?> payWithPackage(String bookingId) async =>
      _row(await _client
          .rpc('booking_pay_with_package', params: {'p_booking_id': bookingId}));

  // ---- PACKAGE ----
  Future<Map<String, dynamic>?> ensurePackagePayment({
    required String teacherSubjectId,
    required int lessons,
    required int durationMin,
  }) async =>
      _row(await _client.rpc('ensure_package_payment', params: {
        'p_teacher_subject_id': teacherSubjectId,
        'p_lessons': lessons,
        'p_duration_min': durationMin,
      }));

  Future<void> submitPackageProof(String receiptPath) =>
      _client.rpc('submit_package_payment',
          params: {'p_receipt_path': receiptPath});

  // ---- PRO ----
  Future<Map<String, dynamic>?> ensureProPayment() async =>
      _row(await _client.rpc('ensure_pro_payment'));

  Future<void> submitProProof(String receiptPath) =>
      _client.rpc('submit_pro_payment', params: {'p_receipt_path': receiptPath});

  // ---- receipt upload (private bucket; path must start with the uid) ----
  Future<String> uploadReceipt(XFile file) async {
    final safe = file.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]+'), '_');
    final path = '$_uid/${DateTime.now().microsecondsSinceEpoch}_$safe';
    final bytes = await file.readAsBytes();
    await _client.storage.from(_bucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(upsert: false, contentType: file.mimeType),
        );
    return path;
  }

  // ---- my packages (for the "Мои пакеты" list & pay-with-package hint) ----
  Future<List<Map<String, dynamic>>> myPackages() => _client
      .from('student_packages')
      .select(
          'id, lessons_total, lessons_left, duration_min, price_paid, expires_at, '
          'teacher_subjects ( subjects ( name_uz, name_ru ) )')
      .eq('student_id', _uid)
      .order('created_at', ascending: false)
      .then((r) => r.cast<Map<String, dynamic>>());

  /// Credits left on a non-expired package matching this subject+duration, or null.
  Future<int?> matchingPackageLeft({
    required String teacherSubjectId,
    required int durationMin,
  }) async {
    final r = await _client
        .from('student_packages')
        .select('lessons_left')
        .eq('teacher_subject_id', teacherSubjectId)
        .eq('duration_min', durationMin)
        .gt('lessons_left', 0)
        .gt('expires_at', DateTime.now().toUtc().toIso8601String())
        .order('expires_at', ascending: true)
        .limit(1)
        .maybeSingle();
    return r == null ? null : (r['lessons_left'] as num).toInt();
  }
}

@Riverpod(keepAlive: true)
PaymentRepository paymentRepository(Ref ref) =>
    PaymentRepository(ref.watch(supabaseClientProvider));
