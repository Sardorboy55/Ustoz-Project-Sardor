import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ru.dart';
import 'app_localizations_uz.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ru'),
    Locale('uz'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In uz, this message translates to:
  /// **'USTOZ'**
  String get appTitle;

  /// No description provided for @splashTagline.
  ///
  /// In uz, this message translates to:
  /// **'O\'z ustozingizni toping'**
  String get splashTagline;

  /// No description provided for @onboardingTitle1.
  ///
  /// In uz, this message translates to:
  /// **'Istalgan yo\'nalishda ustoz'**
  String get onboardingTitle1;

  /// No description provided for @onboardingBody1.
  ///
  /// In uz, this message translates to:
  /// **'Tillar, maktab fanlari, IT, psixologiya va boshqalar — barchasi bitta ilovada.'**
  String get onboardingBody1;

  /// No description provided for @onboardingTitle2.
  ///
  /// In uz, this message translates to:
  /// **'Dars platforma ichida'**
  String get onboardingTitle2;

  /// No description provided for @onboardingBody2.
  ///
  /// In uz, this message translates to:
  /// **'Video, interaktiv doska, chat va uy vazifalari — hech qayerga o\'tish shart emas.'**
  String get onboardingBody2;

  /// No description provided for @onboardingTitle3.
  ///
  /// In uz, this message translates to:
  /// **'Xavfsiz to\'lov'**
  String get onboardingTitle3;

  /// No description provided for @onboardingBody3.
  ///
  /// In uz, this message translates to:
  /// **'Payme, Click yoki Uzum orqali to\'lang. Dars bo\'lmasa — pul qaytadi.'**
  String get onboardingBody3;

  /// No description provided for @onboardingNext.
  ///
  /// In uz, this message translates to:
  /// **'Keyingisi'**
  String get onboardingNext;

  /// No description provided for @onboardingStart.
  ///
  /// In uz, this message translates to:
  /// **'Boshlash'**
  String get onboardingStart;

  /// No description provided for @onboardingSkip.
  ///
  /// In uz, this message translates to:
  /// **'O\'tkazib yuborish'**
  String get onboardingSkip;

  /// No description provided for @homeTitle.
  ///
  /// In uz, this message translates to:
  /// **'Bosh sahifa'**
  String get homeTitle;

  /// No description provided for @homeGreeting.
  ///
  /// In uz, this message translates to:
  /// **'Assalomu alaykum!'**
  String get homeGreeting;

  /// No description provided for @homeSubtitle.
  ///
  /// In uz, this message translates to:
  /// **'USTOZ ilovasiga xush kelibsiz. Bu — Faza 0 skeleti: navigatsiya, mavzu va uz/ru lokalizatsiya tayyor.'**
  String get homeSubtitle;

  /// No description provided for @settingsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Sozlamalar'**
  String get settingsTitle;

  /// No description provided for @settingsLanguage.
  ///
  /// In uz, this message translates to:
  /// **'Til'**
  String get settingsLanguage;

  /// No description provided for @languageUzbek.
  ///
  /// In uz, this message translates to:
  /// **'O\'zbekcha'**
  String get languageUzbek;

  /// No description provided for @languageRussian.
  ///
  /// In uz, this message translates to:
  /// **'Ruscha'**
  String get languageRussian;

  /// No description provided for @catalogTitle.
  ///
  /// In uz, this message translates to:
  /// **'Katalog'**
  String get catalogTitle;

  /// No description provided for @lessonsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Darslarim'**
  String get lessonsTitle;

  /// No description provided for @chatsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Chatlar'**
  String get chatsTitle;

  /// No description provided for @profileTitle.
  ///
  /// In uz, this message translates to:
  /// **'Profil'**
  String get profileTitle;

  /// No description provided for @commonCancel.
  ///
  /// In uz, this message translates to:
  /// **'Bekor qilish'**
  String get commonCancel;

  /// No description provided for @commonSave.
  ///
  /// In uz, this message translates to:
  /// **'Saqlash'**
  String get commonSave;

  /// No description provided for @commonSaved.
  ///
  /// In uz, this message translates to:
  /// **'Saqlandi'**
  String get commonSaved;

  /// No description provided for @commonError.
  ///
  /// In uz, this message translates to:
  /// **'Xatolik yuz berdi. Qayta urinib ko\'ring.'**
  String get commonError;

  /// No description provided for @authPhoneTitle.
  ///
  /// In uz, this message translates to:
  /// **'Kirish'**
  String get authPhoneTitle;

  /// No description provided for @authPhoneHeadline.
  ///
  /// In uz, this message translates to:
  /// **'Telefon raqamingizni kiriting'**
  String get authPhoneHeadline;

  /// No description provided for @authPhoneHint.
  ///
  /// In uz, this message translates to:
  /// **'SMS orqali 6 xonali tasdiqlash kodini yuboramiz.'**
  String get authPhoneHint;

  /// No description provided for @authSendCode.
  ///
  /// In uz, this message translates to:
  /// **'Kod yuborish'**
  String get authSendCode;

  /// No description provided for @authRateLimited.
  ///
  /// In uz, this message translates to:
  /// **'Juda ko\'p urinish. Birozdan keyin qayta urinib ko\'ring.'**
  String get authRateLimited;

  /// No description provided for @authOtpTitle.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlash kodi'**
  String get authOtpTitle;

  /// No description provided for @authOtpHeadline.
  ///
  /// In uz, this message translates to:
  /// **'{phone} raqamiga yuborilgan 6 xonali kodni kiriting'**
  String authOtpHeadline(String phone);

  /// No description provided for @authResendIn.
  ///
  /// In uz, this message translates to:
  /// **'Qayta yuborish: {seconds} s'**
  String authResendIn(int seconds);

  /// No description provided for @authResend.
  ///
  /// In uz, this message translates to:
  /// **'Kodni qayta yuborish'**
  String get authResend;

  /// No description provided for @authVerify.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlash'**
  String get authVerify;

  /// No description provided for @authCodeWrong.
  ///
  /// In uz, this message translates to:
  /// **'Kod noto\'g\'ri yoki muddati o\'tgan'**
  String get authCodeWrong;

  /// No description provided for @setupTitle.
  ///
  /// In uz, this message translates to:
  /// **'Profilni to\'ldirish'**
  String get setupTitle;

  /// No description provided for @setupNameLabel.
  ///
  /// In uz, this message translates to:
  /// **'Ismingiz'**
  String get setupNameLabel;

  /// No description provided for @setupNameHint.
  ///
  /// In uz, this message translates to:
  /// **'Ism Familiya'**
  String get setupNameHint;

  /// No description provided for @setupInterests.
  ///
  /// In uz, this message translates to:
  /// **'Qaysi yo\'nalishlar qiziqarli?'**
  String get setupInterests;

  /// No description provided for @setupContinue.
  ///
  /// In uz, this message translates to:
  /// **'Davom etish'**
  String get setupContinue;

  /// No description provided for @teacherCabinet.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz kabineti'**
  String get teacherCabinet;

  /// No description provided for @becomeTeacherTitle.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz bo\'ling'**
  String get becomeTeacherTitle;

  /// No description provided for @becomeTeacherBody.
  ///
  /// In uz, this message translates to:
  /// **'Profil yarating, fanlar va narxlarni belgilang — o\'quvchilar sizni topadi.'**
  String get becomeTeacherBody;

  /// No description provided for @becomeTeacherCta.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz bo\'lish'**
  String get becomeTeacherCta;

  /// No description provided for @signOut.
  ///
  /// In uz, this message translates to:
  /// **'Chiqish'**
  String get signOut;

  /// No description provided for @teacherTabProfile.
  ///
  /// In uz, this message translates to:
  /// **'Anketa'**
  String get teacherTabProfile;

  /// No description provided for @teacherTabSubjects.
  ///
  /// In uz, this message translates to:
  /// **'Fanlar va narxlar'**
  String get teacherTabSubjects;

  /// No description provided for @teacherUploadPhoto.
  ///
  /// In uz, this message translates to:
  /// **'Foto yuklash'**
  String get teacherUploadPhoto;

  /// No description provided for @teacherUploadVideo.
  ///
  /// In uz, this message translates to:
  /// **'Video (90 s)'**
  String get teacherUploadVideo;

  /// No description provided for @teacherHeadlineUz.
  ///
  /// In uz, this message translates to:
  /// **'Sarlavha (uz)'**
  String get teacherHeadlineUz;

  /// No description provided for @teacherHeadlineRu.
  ///
  /// In uz, this message translates to:
  /// **'Sarlavha (ru)'**
  String get teacherHeadlineRu;

  /// No description provided for @teacherBioUz.
  ///
  /// In uz, this message translates to:
  /// **'O\'zingiz haqida (uz)'**
  String get teacherBioUz;

  /// No description provided for @teacherBioRu.
  ///
  /// In uz, this message translates to:
  /// **'O\'zingiz haqida (ru)'**
  String get teacherBioRu;

  /// No description provided for @teacherExperience.
  ///
  /// In uz, this message translates to:
  /// **'Tajriba (yil)'**
  String get teacherExperience;

  /// No description provided for @teacherLangs.
  ///
  /// In uz, this message translates to:
  /// **'Dars tillari'**
  String get teacherLangs;

  /// No description provided for @teacherAddSubject.
  ///
  /// In uz, this message translates to:
  /// **'Fan qo\'shish'**
  String get teacherAddSubject;

  /// No description provided for @teacherNoSubjects.
  ///
  /// In uz, this message translates to:
  /// **'Hozircha fanlar yo\'q. Birinchisini qo\'shing!'**
  String get teacherNoSubjects;

  /// No description provided for @teacherSubject.
  ///
  /// In uz, this message translates to:
  /// **'Fan'**
  String get teacherSubject;

  /// No description provided for @teacherTrialToggle.
  ///
  /// In uz, this message translates to:
  /// **'Bepul 20 daqiqalik sinov darsi'**
  String get teacherTrialToggle;

  /// No description provided for @teacherTrialOn.
  ///
  /// In uz, this message translates to:
  /// **'sinov darsi bor'**
  String get teacherTrialOn;

  /// No description provided for @teacherSubjectLimit.
  ///
  /// In uz, this message translates to:
  /// **'FREE tarifda faqat 1 ta fan. PRO — 5 tagacha.'**
  String get teacherSubjectLimit;

  /// No description provided for @minutes.
  ///
  /// In uz, this message translates to:
  /// **'daq'**
  String get minutes;

  /// No description provided for @catalogSearchHint.
  ///
  /// In uz, this message translates to:
  /// **'Ism, fan yoki yo\'nalish...'**
  String get catalogSearchHint;

  /// No description provided for @catalogAll.
  ///
  /// In uz, this message translates to:
  /// **'Hammasi'**
  String get catalogAll;

  /// No description provided for @sortRecommended.
  ///
  /// In uz, this message translates to:
  /// **'Tavsiya'**
  String get sortRecommended;

  /// No description provided for @sortCheap.
  ///
  /// In uz, this message translates to:
  /// **'Arzon'**
  String get sortCheap;

  /// No description provided for @sortRating.
  ///
  /// In uz, this message translates to:
  /// **'Reyting'**
  String get sortRating;

  /// No description provided for @catalogTrialChip.
  ///
  /// In uz, this message translates to:
  /// **'Bepul sinov'**
  String get catalogTrialChip;

  /// No description provided for @catalogEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Hech narsa topilmadi'**
  String get catalogEmpty;

  /// No description provided for @catalogFrom.
  ///
  /// In uz, this message translates to:
  /// **'dan'**
  String get catalogFrom;

  /// No description provided for @catalogTrialBadge.
  ///
  /// In uz, this message translates to:
  /// **'Bepul sinov darsi'**
  String get catalogTrialBadge;

  /// No description provided for @teacherProfileTitle.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz profili'**
  String get teacherProfileTitle;

  /// No description provided for @teacherAbout.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz haqida'**
  String get teacherAbout;

  /// No description provided for @minutesLessons.
  ///
  /// In uz, this message translates to:
  /// **'dars'**
  String get minutesLessons;

  /// No description provided for @years.
  ///
  /// In uz, this message translates to:
  /// **'yil'**
  String get years;

  /// No description provided for @minShort.
  ///
  /// In uz, this message translates to:
  /// **' daq'**
  String get minShort;

  /// No description provided for @bookComingSoon.
  ///
  /// In uz, this message translates to:
  /// **'Band qilish — Faza 3 da'**
  String get bookComingSoon;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ru', 'uz'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ru':
      return AppLocalizationsRu();
    case 'uz':
      return AppLocalizationsUz();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
