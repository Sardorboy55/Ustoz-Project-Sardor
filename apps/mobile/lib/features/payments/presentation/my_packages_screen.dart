import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../common/widgets/app_card.dart';
import '../../../common/widgets/empty_state.dart';
import '../../../common/widgets/error_state.dart';
import '../data/payment_repository.dart';

/// "Мои пакеты" — purchased lesson packages (student_packages).
class MyPackagesScreen extends ConsumerStatefulWidget {
  const MyPackagesScreen({super.key});

  @override
  ConsumerState<MyPackagesScreen> createState() => _MyPackagesScreenState();
}

class _MyPackagesScreenState extends ConsumerState<MyPackagesScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  bool get _ru => Localizations.localeOf(context).languageCode == 'ru';

  @override
  void initState() {
    super.initState();
    _future = ref.read(paymentRepositoryProvider).myPackages();
  }

  void _refresh() {
    setState(() {
      _future = ref.read(paymentRepositoryProvider).myPackages();
    });
  }

  @override
  Widget build(BuildContext context) {
    final ru = _ru;
    final locale = Localizations.localeOf(context);
    return Scaffold(
      appBar: AppBar(title: Text(ru ? 'Мои пакеты' : 'Mening paketlarim')),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) return ErrorState(onRetry: _refresh);
          final items = snap.data ?? const [];
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.inventory_2_outlined,
              title: ru ? 'Пакетов пока нет' : 'Hozircha paketlar yo\'q',
              body: ru
                  ? 'Купите пакет уроков у преподавателя — при брони спишется 1 урок.'
                  : 'O\'qituvchidan paket oling — bron qilinganda 1 dars yechiladi.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppTokens.s16),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppTokens.s12),
              itemBuilder: (context, i) => _card(items[i], ru, locale),
            ),
          );
        },
      ),
    );
  }

  Widget _card(Map<String, dynamic> p, bool ru, Locale locale) {
    final subj =
        ((p['teacher_subjects'] as Map?)?['subjects'] as Map?)
            ?.cast<String, dynamic>() ??
        const {};
    final name = (ru ? subj['name_ru'] : subj['name_uz']) as String? ?? '';
    final left = (p['lessons_left'] as num?)?.toInt() ?? 0;
    final total = (p['lessons_total'] as num?)?.toInt() ?? 0;
    final dur = (p['duration_min'] as num?)?.toInt() ?? 0;
    final expires = (p['expires_at'] as String?) ?? '';
    final expDate = expires.length >= 10 ? expires.substring(0, 10) : expires;
    final expired = left <= 0;

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  name.isEmpty
                      ? (ru ? 'Пакет уроков' : 'Darslar paketi')
                      : name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                '$dur ${ru ? "мин" : "min"}',
                style: const TextStyle(color: AppColors.zinc500),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.s8),
          Row(
            children: [
              Text(
                '$left',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: expired ? AppColors.zinc400 : AppColors.primary,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '/ $total ${ru ? "уроков осталось" : "darsdan qoldi"}',
                style: const TextStyle(color: AppColors.zinc500),
              ),
            ],
          ),
          const SizedBox(height: AppTokens.s4),
          Text(
            ru ? 'Действует до $expDate' : '$expDate gacha amal qiladi',
            style: const TextStyle(fontSize: 12, color: AppColors.zinc400),
          ),
        ],
      ),
    );
  }
}
