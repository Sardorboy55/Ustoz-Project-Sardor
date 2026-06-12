// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Uzbek (`uz`).
class AppLocalizationsUz extends AppLocalizations {
  AppLocalizationsUz([String locale = 'uz']) : super(locale);

  @override
  String get appTitle => 'USTOZ';

  @override
  String get splashTagline => 'O\'z ustozingizni toping';

  @override
  String get onboardingTitle1 => 'Istalgan yo\'nalishda ustoz';

  @override
  String get onboardingBody1 =>
      'Tillar, maktab fanlari, IT, psixologiya va boshqalar — barchasi bitta ilovada.';

  @override
  String get onboardingTitle2 => 'Dars platforma ichida';

  @override
  String get onboardingBody2 =>
      'Video, interaktiv doska, chat va uy vazifalari — hech qayerga o\'tish shart emas.';

  @override
  String get onboardingTitle3 => 'Xavfsiz to\'lov';

  @override
  String get onboardingBody3 =>
      'Payme, Click yoki Uzum orqali to\'lang. Dars bo\'lmasa — pul qaytadi.';

  @override
  String get onboardingNext => 'Keyingisi';

  @override
  String get onboardingStart => 'Boshlash';

  @override
  String get onboardingSkip => 'O\'tkazib yuborish';

  @override
  String get homeTitle => 'Bosh sahifa';

  @override
  String get homeGreeting => 'Assalomu alaykum!';

  @override
  String get homeSubtitle =>
      'USTOZ ilovasiga xush kelibsiz. Bu — Faza 0 skeleti: navigatsiya, mavzu va uz/ru lokalizatsiya tayyor.';

  @override
  String get settingsTitle => 'Sozlamalar';

  @override
  String get settingsLanguage => 'Til';

  @override
  String get languageUzbek => 'O\'zbekcha';

  @override
  String get languageRussian => 'Ruscha';

  @override
  String get catalogTitle => 'Katalog';

  @override
  String get lessonsTitle => 'Darslarim';

  @override
  String get chatsTitle => 'Chatlar';

  @override
  String get profileTitle => 'Profil';

  @override
  String get commonCancel => 'Bekor qilish';

  @override
  String get commonSave => 'Saqlash';

  @override
  String get commonSaved => 'Saqlandi';

  @override
  String get commonError => 'Xatolik yuz berdi. Qayta urinib ko\'ring.';

  @override
  String get authPhoneTitle => 'Kirish';

  @override
  String get authPhoneHeadline => 'Telefon raqamingizni kiriting';

  @override
  String get authPhoneHint =>
      'SMS orqali 6 xonali tasdiqlash kodini yuboramiz.';

  @override
  String get authSendCode => 'Kod yuborish';

  @override
  String get authRateLimited =>
      'Juda ko\'p urinish. Birozdan keyin qayta urinib ko\'ring.';

  @override
  String get authOtpTitle => 'Tasdiqlash kodi';

  @override
  String authOtpHeadline(String phone) {
    return '$phone raqamiga yuborilgan 6 xonali kodni kiriting';
  }

  @override
  String authResendIn(int seconds) {
    return 'Qayta yuborish: $seconds s';
  }

  @override
  String get authResend => 'Kodni qayta yuborish';

  @override
  String get authVerify => 'Tasdiqlash';

  @override
  String get authCodeWrong => 'Kod noto\'g\'ri yoki muddati o\'tgan';

  @override
  String get setupTitle => 'Profilni to\'ldirish';

  @override
  String get setupNameLabel => 'Ismingiz';

  @override
  String get setupNameHint => 'Ism Familiya';

  @override
  String get setupInterests => 'Qaysi yo\'nalishlar qiziqarli?';

  @override
  String get setupContinue => 'Davom etish';

  @override
  String get teacherCabinet => 'Ustoz kabineti';

  @override
  String get becomeTeacherTitle => 'Ustoz bo\'ling';

  @override
  String get becomeTeacherBody =>
      'Profil yarating, fanlar va narxlarni belgilang — o\'quvchilar sizni topadi.';

  @override
  String get becomeTeacherCta => 'Ustoz bo\'lish';

  @override
  String get signOut => 'Chiqish';

  @override
  String get teacherTabProfile => 'Anketa';

  @override
  String get teacherTabSubjects => 'Fanlar va narxlar';

  @override
  String get teacherUploadPhoto => 'Foto yuklash';

  @override
  String get teacherUploadVideo => 'Video (90 s)';

  @override
  String get teacherHeadlineUz => 'Sarlavha (uz)';

  @override
  String get teacherHeadlineRu => 'Sarlavha (ru)';

  @override
  String get teacherBioUz => 'O\'zingiz haqida (uz)';

  @override
  String get teacherBioRu => 'O\'zingiz haqida (ru)';

  @override
  String get teacherExperience => 'Tajriba (yil)';

  @override
  String get teacherLangs => 'Dars tillari';

  @override
  String get teacherAddSubject => 'Fan qo\'shish';

  @override
  String get teacherNoSubjects =>
      'Hozircha fanlar yo\'q. Birinchisini qo\'shing!';

  @override
  String get teacherSubject => 'Fan';

  @override
  String get teacherTrialToggle => 'Bepul 20 daqiqalik sinov darsi';

  @override
  String get teacherTrialOn => 'sinov darsi bor';

  @override
  String get teacherSubjectLimit =>
      'FREE tarifda faqat 1 ta fan. PRO — 5 tagacha.';

  @override
  String get minutes => 'daq';

  @override
  String get catalogSearchHint => 'Ism, fan yoki yo\'nalish...';

  @override
  String get catalogAll => 'Hammasi';

  @override
  String get sortRecommended => 'Tavsiya';

  @override
  String get sortCheap => 'Arzon';

  @override
  String get sortRating => 'Reyting';

  @override
  String get catalogTrialChip => 'Bepul sinov';

  @override
  String get catalogEmpty => 'Hech narsa topilmadi';

  @override
  String get catalogFrom => 'dan';

  @override
  String get catalogTrialBadge => 'Bepul sinov darsi';

  @override
  String get teacherProfileTitle => 'Ustoz profili';

  @override
  String get teacherAbout => 'Ustoz haqida';

  @override
  String get minutesLessons => 'dars';

  @override
  String get years => 'yil';

  @override
  String get minShort => ' daq';

  @override
  String get bookComingSoon => 'Band qilish — Faza 3 da';
}
