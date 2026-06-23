import 'package:image_picker/image_picker.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/providers/supabase_providers.dart';

part 'teacher_application_repository.g.dart';

/// Teacher application flow (anketa → documents → AI interview → submit), on the
/// SAME Supabase backend as the website. RPCs already exist.
class TeacherApplicationRepository {
  TeacherApplicationRepository(this._client);

  final SupabaseClient _client;
  String get _uid => _client.auth.currentUser!.id;
  static const _bucket = 'teacher-docs';

  Map<String, dynamic>? _row(dynamic d) {
    if (d is List) return d.isEmpty ? null : (d.first as Map).cast<String, dynamic>();
    if (d is Map) return d.cast<String, dynamic>();
    return null;
  }

  /// Step 1 — save the anketa; returns the application id.
  Future<String?> upsertApplication({
    required String subjectId,
    required String fullName,
    String headline = '',
    String bio = '',
    int experienceYears = 0,
  }) async {
    final res = await _client.rpc('upsert_teacher_application', params: {
      'p_subject_id': subjectId,
      'p_full_name': fullName,
      'p_headline': headline,
      'p_bio': bio,
      'p_experience_years': experienceYears,
    });
    return _row(res)?['id'] as String?;
  }

  /// Upload one document into the private `teacher-docs` bucket; returns its path.
  Future<String> uploadDoc(XFile file) async {
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

  /// Step 2 — attach the uploaded document paths to the application.
  Future<void> setDocuments(String applicationId, List<String> paths) =>
      _client.rpc('set_teacher_application_documents', params: {
        'p_application_id': applicationId,
        'p_document_urls': paths,
      });

  /// Step 3 — submit for review with the interview conversation id.
  Future<void> submit(String applicationId, String? conversationId) =>
      _client.rpc('submit_teacher_application', params: {
        'p_application_id': applicationId,
        'p_conversation_id': conversationId,
      });

  /// The latest application (to resume / show status), or null.
  Future<Map<String, dynamic>?> myApplication() => _client
      .from('teacher_applications')
      .select(
          'id, status, subject_id, full_name, headline, bio, experience_years, '
          'document_urls, review_note')
      .order('created_at', ascending: false)
      .limit(1)
      .maybeSingle();
}

@Riverpod(keepAlive: true)
TeacherApplicationRepository teacherApplicationRepository(Ref ref) =>
    TeacherApplicationRepository(ref.watch(supabaseClientProvider));
