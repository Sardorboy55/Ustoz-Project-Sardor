import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../l10n/app_localizations.dart';
import '../../booking/data/booking_repository.dart';

String _hhmm(int minutes) =>
    '${(minutes ~/ 60).toString().padLeft(2, '0')}:${(minutes % 60).toString().padLeft(2, '0')}';

/// Weekly availability + date exceptions (docs/04 §4.3). 30-min grid.
class AvailabilityTab extends ConsumerStatefulWidget {
  const AvailabilityTab({super.key});

  @override
  ConsumerState<AvailabilityTab> createState() => _AvailabilityTabState();
}

class _AvailabilityTabState extends ConsumerState<AvailabilityTab> {
  List<Map<String, dynamic>>? _rules;
  List<Map<String, dynamic>>? _exceptions;

  Future<void> _refresh() async {
    final repo = ref.read(bookingRepositoryProvider);
    final rules = await repo.fetchRules();
    final exceptions = await repo.fetchExceptions();
    if (mounted) {
      setState(() {
        _rules = rules;
        _exceptions = exceptions;
      });
    }
  }

  List<String> _weekdayNames(AppLocalizations l10n) => [
        l10n.weekdaySun,
        l10n.weekdayMon,
        l10n.weekdayTue,
        l10n.weekdayWed,
        l10n.weekdayThu,
        l10n.weekdayFri,
        l10n.weekdaySat,
      ];

  Future<void> _addRule() async {
    final l10n = AppLocalizations.of(context)!;
    var weekday = 1;
    var start = 540; // 09:00
    var end = 780; // 13:00
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setLocal) {
          final names = _weekdayNames(l10n);
          final steps = [for (var m = 0; m <= 1410; m += 30) m];
          return AlertDialog(
            title: Text(l10n.availabilityAdd),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  initialValue: weekday,
                  decoration: InputDecoration(labelText: l10n.availabilityDay),
                  items: [
                    for (var d = 1; d <= 6; d++)
                      DropdownMenuItem(value: d, child: Text(names[d])),
                    DropdownMenuItem(value: 0, child: Text(names[0])),
                  ],
                  onChanged: (v) => setLocal(() => weekday = v ?? 1),
                ),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        initialValue: start,
                        decoration:
                            InputDecoration(labelText: l10n.availabilityFrom),
                        items: [
                          for (final m in steps)
                            DropdownMenuItem(value: m, child: Text(_hhmm(m))),
                        ],
                        onChanged: (v) => setLocal(() => start = v ?? 540),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<int>(
                        initialValue: end,
                        decoration:
                            InputDecoration(labelText: l10n.availabilityTo),
                        items: [
                          for (final m in steps)
                            DropdownMenuItem(
                                value: m + 30, child: Text(_hhmm(m + 30))),
                        ],
                        onChanged: (v) => setLocal(() => end = v ?? 780),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: Text(l10n.commonCancel),
              ),
              FilledButton(
                onPressed: end > start ? () => Navigator.pop(context, true) : null,
                child: Text(l10n.commonSave),
              ),
            ],
          );
        },
      ),
    );
    if (saved != true) return;
    try {
      await ref.read(bookingRepositoryProvider).addRule(weekday, start, end);
      _refresh();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.commonError)),
        );
      }
    }
  }

  Future<void> _addException() async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null) return;
    await ref.read(bookingRepositoryProvider).addException(date);
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (_rules == null) {
      _refresh();
      return const Center(child: CircularProgressIndicator());
    }
    final names = _weekdayNames(l10n);
    final byDay = <int, List<Map<String, dynamic>>>{};
    for (final r in _rules!) {
      byDay.putIfAbsent(r['weekday'] as int, () => []).add(r);
    }

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: Text(l10n.availabilityAdd),
        onPressed: _addRule,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          for (final d in [1, 2, 3, 4, 5, 6, 0])
            if (byDay.containsKey(d)) ...[
              Padding(
                padding: const EdgeInsets.only(top: 8, bottom: 4),
                child: Text(names[d],
                    style: Theme.of(context).textTheme.titleSmall),
              ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final r in byDay[d]!)
                    InputChip(
                      label: Text(
                          '${_hhmm(r['start_min'] as int)}–${_hhmm(r['end_min'] as int)}'),
                      onDeleted: () async {
                        await ref
                            .read(bookingRepositoryProvider)
                            .deleteRule(r['id'] as String);
                        _refresh();
                      },
                    ),
                ],
              ),
            ],
          if (_rules!.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(child: Text(l10n.availabilityEmpty)),
            ),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.availabilityExceptions,
                  style: Theme.of(context).textTheme.titleSmall),
              TextButton.icon(
                onPressed: _addException,
                icon: const Icon(Icons.event_busy, size: 18),
                label: Text(l10n.availabilityAddException),
              ),
            ],
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final e in _exceptions ?? [])
                InputChip(
                  label: Text(e['date'] as String),
                  onDeleted: () async {
                    await ref
                        .read(bookingRepositoryProvider)
                        .deleteException(e['id'] as String);
                    _refresh();
                  },
                ),
            ],
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}
