import 'dart:async';

import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';

/// Live countdown to a lesson start: "До начала 2 ч 15 мин" /
/// "Boshlanishiga 2 soat 15 daq qoldi". Once started shows "Урок начался".
/// Ticks every 30 seconds while mounted.
class CountdownText extends StatefulWidget {
  const CountdownText({super.key, required this.target, this.style});

  /// Lesson start (any timezone — compared as absolute instants).
  final DateTime target;
  final TextStyle? style;

  @override
  State<CountdownText> createState() => _CountdownTextState();
}

class _CountdownTextState extends State<CountdownText> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final left = widget.target.difference(DateTime.now());

    final String text;
    if (left.isNegative) {
      text = l10n.lessonStarted;
    } else {
      final parts = <String>[];
      if (left.inDays > 0) parts.add('${left.inDays} ${l10n.unitDay}');
      final hours = left.inHours % 24;
      if (hours > 0) parts.add('$hours ${l10n.unitHour}');
      final minutes = left.inMinutes % 60;
      if (left.inDays == 0 && (minutes > 0 || parts.isEmpty)) {
        parts.add('$minutes ${l10n.unitMin}');
      }
      text = l10n.startsIn(parts.join(' '));
    }

    return Text(
      text,
      style: widget.style ??
          TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }
}
