import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/theme.dart';
import '../../../common/widgets/app_avatar.dart';
import '../data/profile_repository.dart';

/// Edit own profile: first/last name (stored as `full_name`) + avatar.
class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key, required this.fullName, this.avatarUrl});

  final String fullName;
  final String? avatarUrl;

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late final TextEditingController _first;
  late final TextEditingController _last;
  late final String _initialFull;
  String? _avatarUrl;
  bool _saving = false;
  bool _uploadingAvatar = false;

  bool get _ru => Localizations.localeOf(context).languageCode == 'ru';

  /// «Saqlash» активна только когда имя реально изменилось (аватар сохраняется
  /// отдельно сразу при выборе, поэтому в dirty не входит).
  bool get _dirty {
    final current = '${_first.text.trim()} ${_last.text.trim()}'.trim();
    return current.isNotEmpty && current != _initialFull;
  }

  @override
  void initState() {
    super.initState();
    _initialFull = widget.fullName.trim();
    final parts = _initialFull.split(RegExp(r'\s+')).where((s) => s.isNotEmpty);
    final list = parts.toList();
    _first = TextEditingController(text: list.isEmpty ? '' : list.first);
    _last = TextEditingController(
      text: list.length > 1 ? list.sublist(1).join(' ') : '',
    );
    _avatarUrl = widget.avatarUrl;
    // Перерисовываем кнопку при правке полей (dirty-tracking).
    _first.addListener(_onChanged);
    _last.addListener(_onChanged);
  }

  void _onChanged() => setState(() {});

  @override
  void dispose() {
    _first.removeListener(_onChanged);
    _last.removeListener(_onChanged);
    _first.dispose();
    _last.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final file = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1024,
      imageQuality: 85,
    );
    if (file == null || !mounted) return;
    setState(() => _uploadingAvatar = true);
    try {
      final bytes = await File(file.path).readAsBytes();
      final repo = ref.read(profileRepositoryProvider);
      final url = await repo.uploadToBucket(
        'avatars',
        'avatar.jpg',
        bytes,
        contentType: 'image/jpeg',
      );
      await repo.updateProfile(avatarUrl: url);
      ref.invalidate(ownProfileProvider);
      if (mounted) setState(() => _avatarUrl = url);
    } catch (_) {
      _toast(_ru ? 'Не удалось загрузить фото' : 'Rasmni yuklab bo\'lmadi');
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _save() async {
    final full = '${_first.text.trim()} ${_last.text.trim()}'.trim();
    if (full.isEmpty) {
      _toast(_ru ? 'Введите имя' : 'Ismni kiriting');
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(profileRepositoryProvider).updateProfile(fullName: full);
      ref.invalidate(ownProfileProvider);
      if (!mounted) return;
      _toast(_ru ? 'Сохранено' : 'Saqlandi');
      Navigator.of(context).pop();
    } catch (_) {
      _toast(_ru ? 'Не удалось сохранить' : 'Saqlab bo\'lmadi');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toast(String msg) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    final scheme = Theme.of(context).colorScheme;
    final preview = '${_first.text} ${_last.text}'.trim();

    return Scaffold(
      appBar: AppBar(
        title: Text(ru ? 'Редактировать профиль' : 'Profilni tahrirlash'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppTokens.s16),
        children: [
          Center(
            child: GestureDetector(
              onTap: _uploadingAvatar ? null : _pickAvatar,
              child: Stack(
                children: [
                  AppAvatar(imageUrl: _avatarUrl, name: preview, size: 96),
                  if (_uploadingAvatar)
                    const Positioned.fill(
                      child: ColoredBox(
                        color: Colors.black38,
                        child: Center(
                          child: SizedBox(
                            width: 26,
                            height: 26,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  Positioned(
                    right: 2,
                    bottom: 2,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: scheme.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: scheme.surface, width: 2),
                      ),
                      child: const Icon(
                        Icons.photo_camera_rounded,
                        size: 15,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: AppTokens.s8),
          Center(
            child: Text(
              ru
                  ? 'Нажмите, чтобы сменить фото'
                  : 'Rasmni o\'zgartirish uchun bosing',
              style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
            ),
          ),
          const SizedBox(height: AppTokens.s24),
          _Label(ru ? 'Имя' : 'Ism'),
          const SizedBox(height: 6),
          TextField(
            controller: _first,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(hintText: ru ? 'Имя' : 'Ism'),
          ),
          const SizedBox(height: AppTokens.s16),
          _Label(ru ? 'Фамилия' : 'Familiya'),
          const SizedBox(height: 6),
          TextField(
            controller: _last,
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _save(),
            decoration: InputDecoration(hintText: ru ? 'Фамилия' : 'Familiya'),
          ),
          const SizedBox(height: AppTokens.s24),
          FilledButton(
            onPressed: (_saving || !_dirty) ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(ru ? 'Сохранить' : 'Saqlash'),
          ),
        ],
      ),
    );
  }
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}
