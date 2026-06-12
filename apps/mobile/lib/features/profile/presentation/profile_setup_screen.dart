import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers/locale_provider.dart';
import '../../../l10n/app_localizations.dart';
import '../data/profile_repository.dart';

/// First-login onboarding: name + interest categories (docs/04 §4.1).
class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final _nameController = TextEditingController();
  final _selected = <String>{};
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    if (_nameController.text.trim().length < 2) return;
    setState(() => _saving = true);
    try {
      await ref.read(profileRepositoryProvider).updateProfile(
            fullName: _nameController.text.trim(),
            interestCategoryIds: _selected.toList(),
          );
      ref.invalidate(ownProfileProvider);
      if (mounted) context.go('/home');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.commonError)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final locale = ref.watch(localeControllerProvider).languageCode;
    final categories = ref.watch(activeCategoriesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.setupTitle), automaticallyImplyLeading: false),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: l10n.setupNameLabel,
                  hintText: l10n.setupNameHint,
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 24),
              Text(
                l10n.setupInterests,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Expanded(
                child: categories.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Center(child: Text(l10n.commonError)),
                  data: (rows) => SingleChildScrollView(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final c in rows)
                          FilterChip(
                            label: Text(
                              locale == 'ru'
                                  ? c['name_ru'] as String
                                  : c['name_uz'] as String,
                            ),
                            selected: _selected.contains(c['id']),
                            onSelected: (sel) => setState(() {
                              sel
                                  ? _selected.add(c['id'] as String)
                                  : _selected.remove(c['id']);
                            }),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              FilledButton(
                onPressed:
                    _nameController.text.trim().length >= 2 && !_saving ? _save : null,
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    : Text(l10n.setupContinue),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
