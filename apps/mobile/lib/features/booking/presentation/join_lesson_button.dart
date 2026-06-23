import 'dart:async';

import 'package:flutter/material.dart';
import 'package:jitsi_meet_flutter_sdk/jitsi_meet_flutter_sdk.dart';

import '../../../app/theme.dart';

/// Join window opens 10 minutes before the lesson start (matches the website).
const _joinBeforeMs = 10 * 60 * 1000;

/// Opens the in-app Jitsi room for a booking. SAME room + server as the website
/// (`meet.jit.si`, room `ustoz-{bookingId}`, no account/token), so the student
/// (mobile) and teacher (web or mobile) land in the same call.
Future<void> joinLessonRoom({
  required String bookingId,
  required String displayName,
  String? subject,
}) async {
  final options = JitsiMeetConferenceOptions(
    serverURL: 'https://meet.jit.si',
    room: 'ustoz-$bookingId',
    configOverrides: {
      'subject': subject ?? 'IBILIM',
      'startWithAudioMuted': false,
      'startWithVideoMuted': false,
    },
    featureFlags: {
      'prejoinpage.enabled': false,
      'unsaferoomwarning.enabled': false,
      'invite.enabled': false,
      'meeting-name.enabled': false,
      'calendar.enabled': false,
    },
    userInfo: JitsiMeetUserInfo(displayName: displayName),
  );
  await JitsiMeet().join(options);
}

/// "Войти в урок" — shows only inside the join window (10 min before start),
/// for both student and teacher. Self-refreshes every 30s.
class JoinLessonButton extends StatefulWidget {
  const JoinLessonButton({
    super.key,
    required this.bookingId,
    required this.startAt,
    required this.displayName,
    this.subject,
    this.expanded = false,
  });

  final String bookingId;
  final DateTime startAt;
  final String displayName;
  final String? subject;
  final bool expanded;

  @override
  State<JoinLessonButton> createState() => _JoinLessonButtonState();
}

class _JoinLessonButtonState extends State<JoinLessonButton> {
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
    final ru = Localizations.localeOf(context).languageCode == 'ru';
    final start = widget.startAt.toLocal();
    final now = DateTime.now();
    // 3-hour tail so a long-running lesson stays joinable.
    final open = now.millisecondsSinceEpoch >=
            start.millisecondsSinceEpoch - _joinBeforeMs &&
        now.isBefore(start.add(const Duration(hours: 3)));
    if (!open) return const SizedBox.shrink();

    final started = now.isAfter(start);
    final label = started
        ? (ru ? 'Урок идёт — войти' : 'Dars ketyapti — kirish')
        : (ru ? 'Войти в урок' : 'Darsga kirish');

    final btn = FilledButton.icon(
      onPressed: () => joinLessonRoom(
        bookingId: widget.bookingId,
        displayName: widget.displayName,
        subject: widget.subject,
      ),
      icon: const Icon(Icons.videocam_rounded, size: 18),
      label: Text(label),
      style: started
          ? FilledButton.styleFrom(
              backgroundColor: AppTokens.of(context).success,
              minimumSize: const Size.fromHeight(48),
            )
          : FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
    );

    return widget.expanded ? SizedBox(width: double.infinity, child: btn) : btn;
  }
}
