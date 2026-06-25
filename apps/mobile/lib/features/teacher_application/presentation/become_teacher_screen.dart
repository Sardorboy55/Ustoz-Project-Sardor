import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/teacher_application_repository.dart';
import 'interview_webview_screen.dart';

/// Native "become a teacher" flow on the SAME backend as the website:
/// anketa → documents → AI voice interview (WebView) → submit for review.
class BecomeTeacherScreen extends ConsumerStatefulWidget {
  const BecomeTeacherScreen({super.key});

  @override
  ConsumerState<BecomeTeacherScreen> createState() =>
      _BecomeTeacherScreenState();
}

enum _Stage { anketa, documents, interview, submitted }

class _UploadedDoc {
  const _UploadedDoc(this.path, this.name);
  final String path;
  final String name;
}

class _BecomeTeacherScreenState extends ConsumerState<BecomeTeacherScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _headline = TextEditingController();
  final _bio = TextEditingController();
  final _experience = TextEditingController(text: '0');

  String? _subjectId;
  String _subjectName = '';
  String? _appId;
  final _docs = <_UploadedDoc>[];
  String? _conversationId;
  String? _existingStatus;
  String? _reviewNote;

  _Stage _stage = _Stage.anketa;
  bool _busy = false;
  bool _loading = true;

  bool get _ru => Localizations.localeOf(context).languageCode == 'ru';

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _fullName.dispose();
    _headline.dispose();
    _bio.dispose();
    _experience.dispose();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    try {
      final repo = ref.read(teacherApplicationRepositoryProvider);
      final app = await repo.myApplication();
      if (app != null) {
        _appId = app['id'] as String?;
        _fullName.text = (app['full_name'] as String?) ?? '';
        _headline.text = (app['headline'] as String?) ?? '';
        _bio.text = (app['bio'] as String?) ?? '';
        _experience.text = '${app['experience_years'] ?? 0}';
        _subjectId = app['subject_id'] as String?;
        final status = (app['status'] as String?) ?? 'interviewing';
        _existingStatus = status;
        _reviewNote = app['review_note'] as String?;
        _conversationId = app['conversation_id'] as String?;
        // 'interviewing' = открытый черновик (анкета сохранена, заявка ещё НЕ
        // отправлена) → продолжаем флоу с документов, а НЕ показываем «на
        // рассмотрении». Только реально отправленные статусы
        // (pending_review/approved/rejected) дают submitted-вид.
        if (status == 'interviewing') {
          _stage = _appId != null ? _Stage.documents : _Stage.anketa;
        } else {
          _stage = _Stage.submitted;
        }
      }
    } catch (_) {
      /* offline / first time — start clean */
    }
    if (mounted) setState(() => _loading = false);
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _saveAnketa() async {
    if (!_formKey.currentState!.validate()) return;
    if (_subjectId == null) {
      _snack(_ru ? 'Выберите предмет' : 'Fan tanlang');
      return;
    }
    setState(() => _busy = true);
    try {
      final repo = ref.read(teacherApplicationRepositoryProvider);
      final id = await repo.upsertApplication(
        subjectId: _subjectId!,
        fullName: _fullName.text.trim(),
        headline: _headline.text.trim(),
        bio: _bio.text.trim(),
        experienceYears: int.tryParse(_experience.text.trim()) ?? 0,
      );
      if (id != null) _appId = id;
      if (_appId == null) throw Exception('no application id');
      setState(() => _stage = _Stage.documents);
    } catch (e) {
      _snack(
        _ru
            ? 'Не удалось сохранить. Попробуйте снова.'
            : 'Saqlanmadi. Qayta urinib koʻring.',
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickDocs() async {
    final picker = ImagePicker();
    final files = await picker.pickMultiImage(imageQuality: 80);
    if (files.isEmpty) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(teacherApplicationRepositoryProvider);
      for (final f in files) {
        final path = await repo.uploadDoc(f);
        _docs.add(_UploadedDoc(path, f.name));
      }
    } catch (e) {
      _snack(_ru ? 'Не удалось загрузить файл.' : 'Fayl yuklanmadi.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _saveDocs() async {
    setState(() => _busy = true);
    try {
      final repo = ref.read(teacherApplicationRepositoryProvider);
      await repo.setDocuments(_appId!, _docs.map((d) => d.path).toList());
      setState(() => _stage = _Stage.interview);
    } catch (e) {
      _snack(_ru ? 'Не удалось сохранить документы.' : 'Hujjatlar saqlanmadi.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _startInterview() async {
    final lang = Localizations.localeOf(context).languageCode;
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => InterviewWebviewScreen(
          subject: _subjectName.isEmpty ? '—' : _subjectName,
          lang: lang == 'ru' ? 'ru' : 'uz',
        ),
      ),
    );
    if (id != null && id.isNotEmpty) {
      setState(() => _conversationId = id);
    }
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      final repo = ref.read(teacherApplicationRepositoryProvider);
      await repo.submit(_appId!, _conversationId);
      setState(() {
        _existingStatus = 'pending_review';
        _stage = _Stage.submitted;
      });
    } catch (e) {
      _snack(_ru ? 'Не удалось отправить заявку.' : 'Ariza yuborilmadi.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    return Scaffold(
      appBar: AppBar(
        title: Text(ru ? 'Стать преподавателем' : 'Oʻqituvchi boʻlish'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppTokens.s16),
                child: switch (_stage) {
                  _Stage.anketa => _anketaForm(ru),
                  _Stage.documents => _documentsStep(ru),
                  _Stage.interview => _interviewStep(ru),
                  _Stage.submitted => _submittedView(ru),
                },
              ),
            ),
    );
  }

  // ---- step indicator ------------------------------------------------------
  Widget _steps(int active) {
    Widget dot(int i, String label) {
      final on = i <= active;
      return Expanded(
        child: Column(
          children: [
            CircleAvatar(
              radius: 14,
              backgroundColor: on ? AppColors.primary : AppColors.zinc200,
              child: Text(
                '${i + 1}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: on ? Colors.white : AppColors.zinc500,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: on ? AppColors.zinc900 : AppColors.zinc400,
              ),
            ),
          ],
        ),
      );
    }

    final ru = _ru;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppTokens.s24),
      child: Row(
        children: [
          dot(0, ru ? 'Анкета' : 'Anketa'),
          dot(1, ru ? 'Документы' : 'Hujjatlar'),
          dot(2, ru ? 'Собеседование' : 'Suhbat'),
        ],
      ),
    );
  }

  // ---- step 1: anketa ------------------------------------------------------
  Widget _anketaForm(bool ru) {
    final subjects = ref.watch(activeSubjectsProvider);
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _steps(0),
          Text(
            ru ? 'Расскажите о себе' : 'Oʻzingiz haqingizda',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.s16),
          TextFormField(
            controller: _fullName,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: ru ? 'Имя и фамилия' : 'Ism familiya',
            ),
            validator: (v) => (v == null || v.trim().length < 2)
                ? (ru ? 'Укажите имя' : 'Ismni kiriting')
                : null,
          ),
          const SizedBox(height: AppTokens.s12),
          subjects.when(
            loading: () => const LinearProgressIndicator(),
            error: (_, _) => Text(
              ru ? 'Не удалось загрузить предметы' : 'Fanlar yuklanmadi',
            ),
            data: (list) => DropdownButtonFormField<String>(
              initialValue: _subjectId,
              isExpanded: true,
              decoration: InputDecoration(labelText: ru ? 'Предмет' : 'Fan'),
              items: [
                for (final s in list)
                  DropdownMenuItem(
                    value: s['id'] as String,
                    child: Text(
                      ((ru ? s['name_ru'] : s['name_uz']) as String?) ??
                          (s['name_uz'] as String?) ??
                          '',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
              onChanged: (v) {
                final s = list.firstWhere(
                  (e) => e['id'] == v,
                  orElse: () => const {},
                );
                setState(() {
                  _subjectId = v;
                  _subjectName =
                      ((ru ? s['name_ru'] : s['name_uz']) as String?) ??
                      (s['name_uz'] as String?) ??
                      '';
                });
              },
            ),
          ),
          const SizedBox(height: AppTokens.s12),
          TextFormField(
            controller: _headline,
            decoration: InputDecoration(
              labelText: ru ? 'Кратко (заголовок)' : 'Qisqacha (sarlavha)',
              hintText: ru
                  ? 'Напр.: Преподаватель английского, 5 лет'
                  : 'Mas.: Ingliz tili oʻqituvchisi, 5 yil',
            ),
          ),
          const SizedBox(height: AppTokens.s12),
          TextFormField(
            controller: _bio,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: ru ? 'О себе' : 'Tavsif',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppTokens.s12),
          TextFormField(
            controller: _experience,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: ru ? 'Опыт (лет)' : 'Tajriba (yil)',
            ),
          ),
          const SizedBox(height: AppTokens.s24),
          FilledButton(
            onPressed: _busy ? null : _saveAnketa,
            child: _busy
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(ru ? 'Продолжить' : 'Davom etish'),
          ),
        ],
      ),
    );
  }

  // ---- step 2: documents ---------------------------------------------------
  Widget _documentsStep(bool ru) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _steps(1),
        Text(
          ru ? 'Документы и дипломы' : 'Hujjat va diplomlar',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppTokens.s8),
        Text(
          ru
              ? 'Загрузите фото дипломов, сертификатов или удостоверения. Можно несколько.'
              : 'Diplom, sertifikat yoki guvohnoma rasmlarini yuklang. Bir nechta boʻlishi mumkin.',
          style: const TextStyle(color: AppColors.zinc500, fontSize: 14),
        ),
        const SizedBox(height: AppTokens.s16),
        for (final d in _docs)
          Card(
            margin: const EdgeInsets.only(bottom: AppTokens.s8),
            child: ListTile(
              leading: const Icon(Icons.description_outlined),
              title: Text(d.name, overflow: TextOverflow.ellipsis),
              trailing: IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: _busy ? null : () => setState(() => _docs.remove(d)),
              ),
            ),
          ),
        OutlinedButton.icon(
          onPressed: _busy ? null : _pickDocs,
          icon: const Icon(Icons.upload_file),
          label: Text(ru ? 'Добавить файлы' : 'Fayl qoʻshish'),
        ),
        const SizedBox(height: AppTokens.s24),
        FilledButton(
          onPressed: _busy ? null : _saveDocs,
          child: _busy
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(ru ? 'Продолжить' : 'Davom etish'),
        ),
        const SizedBox(height: AppTokens.s8),
        Center(
          child: TextButton(
            onPressed: _busy
                ? null
                : () => setState(() => _stage = _Stage.anketa),
            child: Text(ru ? 'Назад' : 'Orqaga'),
          ),
        ),
      ],
    );
  }

  // ---- step 3: interview ---------------------------------------------------
  Widget _interviewStep(bool ru) {
    final done = _conversationId != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _steps(2),
        Text(
          ru ? 'Голосовое собеседование' : 'Ovozli suhbat',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: AppTokens.s8),
        Text(
          ru
              ? 'Короткий разговор с ИИ-агентом голосом. Разрешите доступ к микрофону и отвечайте вслух. Это часть заявки.'
              : 'AI-agent bilan qisqa ovozli suhbat. Mikrofonga ruxsat bering va ovoz bilan javob bering. Bu ariza qismi.',
          style: const TextStyle(color: AppColors.zinc500, fontSize: 14),
        ),
        const SizedBox(height: AppTokens.s16),
        Container(
          padding: const EdgeInsets.all(AppTokens.s16),
          decoration: BoxDecoration(
            color: done ? AppColors.primaryTint : AppColors.zinc100,
            borderRadius: BorderRadius.circular(AppTokens.radiusCard),
          ),
          child: Row(
            children: [
              Icon(
                done ? Icons.check_circle : Icons.mic_none,
                color: done ? AppColors.primary : AppColors.zinc500,
              ),
              const SizedBox(width: AppTokens.s12),
              Expanded(
                child: Text(
                  done
                      ? (ru ? 'Собеседование пройдено' : 'Suhbat oʻtildi')
                      : (ru
                            ? 'Собеседование не пройдено'
                            : 'Suhbat oʻtilmagan'),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppTokens.s16),
        OutlinedButton.icon(
          onPressed: _busy ? null : _startInterview,
          icon: const Icon(Icons.record_voice_over),
          label: Text(
            done
                ? (ru ? 'Пройти заново' : 'Qayta oʻtish')
                : (ru ? 'Начать собеседование' : 'Suhbatni boshlash'),
          ),
        ),
        const SizedBox(height: AppTokens.s24),
        FilledButton(
          // Собеседование обязательно: отправка только после захвата
          // conversation_id (его возвращает экран WebView-собеседования).
          onPressed: (_busy || !done) ? null : _submit,
          child: _busy
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(ru ? 'Отправить заявку' : 'Arizani yuborish'),
        ),
        if (!done) ...[
          const SizedBox(height: AppTokens.s8),
          Text(
            ru ? 'Сначала пройдите собеседование' : 'Avval suhbatdan oʻting',
            style: const TextStyle(color: AppColors.zinc500, fontSize: 13),
          ),
        ],
        const SizedBox(height: AppTokens.s8),
        Center(
          child: TextButton(
            onPressed: _busy
                ? null
                : () => setState(() => _stage = _Stage.documents),
            child: Text(ru ? 'Назад' : 'Orqaga'),
          ),
        ),
      ],
    );
  }

  // ---- submitted / status --------------------------------------------------
  Widget _submittedView(bool ru) {
    final status = _existingStatus ?? 'submitted';
    final approved = status == 'approved';
    final rejected = status == 'rejected';
    final (IconData icon, Color color, String title, String body) = approved
        ? (
            Icons.verified,
            AppColors.success,
            ru ? 'Заявка одобрена' : 'Ariza tasdiqlandi',
            ru
                ? 'Поздравляем! Вы можете настроить профиль преподавателя.'
                : 'Tabriklaymiz! Oʻqituvchi profilini sozlashingiz mumkin.',
          )
        : rejected
        ? (
            Icons.cancel,
            AppColors.danger,
            ru ? 'Заявка отклонена' : 'Ariza rad etildi',
            _reviewNote?.isNotEmpty == true
                ? _reviewNote!
                : (ru
                      ? 'К сожалению, заявка отклонена. Вы можете подать новую.'
                      : 'Afsuski, ariza rad etildi. Yangi ariza yuborishingiz mumkin.'),
          )
        : (
            Icons.hourglass_top,
            AppColors.primary,
            ru ? 'Заявка на рассмотрении' : 'Ariza koʻrib chiqilmoqda',
            ru
                ? 'Мы получили вашу заявку и собеседование. Ответ придёт в уведомлениях.'
                : 'Arizangiz va suhbat qabul qilindi. Javob bildirishnomalarda keladi.',
          );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppTokens.s32),
      child: Column(
        children: [
          CircleAvatar(
            radius: 36,
            backgroundColor: color.withValues(alpha: 0.12),
            child: Icon(icon, color: color, size: 38),
          ),
          const SizedBox(height: AppTokens.s16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppTokens.s8),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.zinc500),
          ),
          const SizedBox(height: AppTokens.s24),
          if (rejected)
            FilledButton(
              onPressed: () => setState(() => _stage = _Stage.anketa),
              child: Text(ru ? 'Подать заново' : 'Qayta yuborish'),
            )
          else
            FilledButton(
              onPressed: () => Navigator.of(context).maybePop(),
              child: Text(ru ? 'Готово' : 'Tayyor'),
            ),
        ],
      ),
    );
  }
}
