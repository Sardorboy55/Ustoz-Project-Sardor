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
  /// **'IBILIM'**
  String get appTitle;

  /// No description provided for @splashTagline.
  ///
  /// In uz, this message translates to:
  /// **'O\'z ustozingizni toping'**
  String get splashTagline;

  /// No description provided for @onboardingTitle1.
  ///
  /// In uz, this message translates to:
  /// **'O\'zingizga mos ustozni toping'**
  String get onboardingTitle1;

  /// No description provided for @onboardingBody1.
  ///
  /// In uz, this message translates to:
  /// **'Tillar, maktab fanlari, IT, psixologiya va boshqa yo\'nalishlar — tajribali ustozlar bitta ilovada.'**
  String get onboardingBody1;

  /// No description provided for @onboardingTitle2.
  ///
  /// In uz, this message translates to:
  /// **'Qulay vaqtni band qiling'**
  String get onboardingTitle2;

  /// No description provided for @onboardingBody2.
  ///
  /// In uz, this message translates to:
  /// **'Ustozning bo\'sh vaqtlarini ko\'ring va o\'zingizga qulay paytni tanlang — bir necha soniyada.'**
  String get onboardingBody2;

  /// No description provided for @onboardingTitle3.
  ///
  /// In uz, this message translates to:
  /// **'Onlayn o\'qing, o\'sishni kuzating'**
  String get onboardingTitle3;

  /// No description provided for @onboardingBody3.
  ///
  /// In uz, this message translates to:
  /// **'Darslar platforma ichida o\'tadi: video, doska va chat. Natijalaringiz har doim ko\'z oldingizda.'**
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
  /// **'IBILIM ilovasiga xush kelibsiz. Bu — Faza 0 skeleti: navigatsiya, mavzu va uz/ru lokalizatsiya tayyor.'**
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

  /// No description provided for @commonRetry.
  ///
  /// In uz, this message translates to:
  /// **'Qayta urinish'**
  String get commonRetry;

  /// No description provided for @sectionAll.
  ///
  /// In uz, this message translates to:
  /// **'Barchasi'**
  String get sectionAll;

  /// No description provided for @tabHome.
  ///
  /// In uz, this message translates to:
  /// **'Asosiy'**
  String get tabHome;

  /// No description provided for @tabCatalog.
  ///
  /// In uz, this message translates to:
  /// **'Katalog'**
  String get tabCatalog;

  /// No description provided for @tabLessons.
  ///
  /// In uz, this message translates to:
  /// **'Darslar'**
  String get tabLessons;

  /// No description provided for @tabChats.
  ///
  /// In uz, this message translates to:
  /// **'Chatlar'**
  String get tabChats;

  /// No description provided for @tabProfile.
  ///
  /// In uz, this message translates to:
  /// **'Profil'**
  String get tabProfile;

  /// No description provided for @chatsEmptyTitle.
  ///
  /// In uz, this message translates to:
  /// **'Xabarlar hozircha yo\'q'**
  String get chatsEmptyTitle;

  /// No description provided for @chatsEmptyBody.
  ///
  /// In uz, this message translates to:
  /// **'Ustozga uning profilidan yozing — barcha xabarlar shu yerda saqlanadi.'**
  String get chatsEmptyBody;

  /// No description provided for @chatsEmptyAction.
  ///
  /// In uz, this message translates to:
  /// **'Katalogga o\'tish'**
  String get chatsEmptyAction;

  /// No description provided for @verifiedBadge.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlangan'**
  String get verifiedBadge;

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

  /// No description provided for @bookingCta.
  ///
  /// In uz, this message translates to:
  /// **'Band qilish'**
  String get bookingCta;

  /// No description provided for @bookingTitle.
  ///
  /// In uz, this message translates to:
  /// **'Darsni band qilish'**
  String get bookingTitle;

  /// No description provided for @bookingTrialChoice.
  ///
  /// In uz, this message translates to:
  /// **'Bepul sinov (20 daq)'**
  String get bookingTrialChoice;

  /// No description provided for @bookingNoSlots.
  ///
  /// In uz, this message translates to:
  /// **'Bu kunda bo\'sh vaqt yo\'q'**
  String get bookingNoSlots;

  /// No description provided for @bookingFreeTrialLabel.
  ///
  /// In uz, this message translates to:
  /// **'Bepul sinov darsi'**
  String get bookingFreeTrialLabel;

  /// No description provided for @bookingTotal.
  ///
  /// In uz, this message translates to:
  /// **'Jami'**
  String get bookingTotal;

  /// No description provided for @bookingConfirm.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlash'**
  String get bookingConfirm;

  /// No description provided for @bookingCreated.
  ///
  /// In uz, this message translates to:
  /// **'Dars band qilindi!'**
  String get bookingCreated;

  /// No description provided for @bookingSlotTaken.
  ///
  /// In uz, this message translates to:
  /// **'Bu vaqt endi band. Boshqasini tanlang.'**
  String get bookingSlotTaken;

  /// No description provided for @bookingTrialUsed.
  ///
  /// In uz, this message translates to:
  /// **'Bepul sinov darsidan allaqachon foydalangansiz.'**
  String get bookingTrialUsed;

  /// No description provided for @lessonsUpcoming.
  ///
  /// In uz, this message translates to:
  /// **'Kelgusi'**
  String get lessonsUpcoming;

  /// No description provided for @lessonsPast.
  ///
  /// In uz, this message translates to:
  /// **'O\'tgan'**
  String get lessonsPast;

  /// No description provided for @lessonsEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Hozircha darslar yo\'q'**
  String get lessonsEmpty;

  /// No description provided for @roleStudent.
  ///
  /// In uz, this message translates to:
  /// **'O\'quvchi'**
  String get roleStudent;

  /// No description provided for @roleTeacher.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz'**
  String get roleTeacher;

  /// No description provided for @statusPendingPayment.
  ///
  /// In uz, this message translates to:
  /// **'To\'lov kutilmoqda'**
  String get statusPendingPayment;

  /// No description provided for @statusPaid.
  ///
  /// In uz, this message translates to:
  /// **'To\'langan'**
  String get statusPaid;

  /// No description provided for @statusInProgress.
  ///
  /// In uz, this message translates to:
  /// **'Davom etmoqda'**
  String get statusInProgress;

  /// No description provided for @statusCompleted.
  ///
  /// In uz, this message translates to:
  /// **'O\'tkazildi'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In uz, this message translates to:
  /// **'Bekor qilindi'**
  String get statusCancelled;

  /// No description provided for @statusCancelledByStudent.
  ///
  /// In uz, this message translates to:
  /// **'O\'quvchi bekor qildi'**
  String get statusCancelledByStudent;

  /// No description provided for @statusCancelledByTeacher.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz bekor qildi'**
  String get statusCancelledByTeacher;

  /// No description provided for @statusNoShowStudent.
  ///
  /// In uz, this message translates to:
  /// **'O\'quvchi kelmadi'**
  String get statusNoShowStudent;

  /// No description provided for @statusNoShowTeacher.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz kelmadi'**
  String get statusNoShowTeacher;

  /// No description provided for @statusExpired.
  ///
  /// In uz, this message translates to:
  /// **'Muddati o\'tdi'**
  String get statusExpired;

  /// No description provided for @cancelLessonTitle.
  ///
  /// In uz, this message translates to:
  /// **'Darsni bekor qilish?'**
  String get cancelLessonTitle;

  /// No description provided for @cancelLessonBody.
  ///
  /// In uz, this message translates to:
  /// **'12 soatdan oldin bekor qilinsa — to\'lov balansga qaytadi, keyin — qaytmaydi.'**
  String get cancelLessonBody;

  /// No description provided for @cancelLessonConfirm.
  ///
  /// In uz, this message translates to:
  /// **'Bekor qilish'**
  String get cancelLessonConfirm;

  /// No description provided for @weekdaySun.
  ///
  /// In uz, this message translates to:
  /// **'Yakshanba'**
  String get weekdaySun;

  /// No description provided for @weekdayMon.
  ///
  /// In uz, this message translates to:
  /// **'Dushanba'**
  String get weekdayMon;

  /// No description provided for @weekdayTue.
  ///
  /// In uz, this message translates to:
  /// **'Seshanba'**
  String get weekdayTue;

  /// No description provided for @weekdayWed.
  ///
  /// In uz, this message translates to:
  /// **'Chorshanba'**
  String get weekdayWed;

  /// No description provided for @weekdayThu.
  ///
  /// In uz, this message translates to:
  /// **'Payshanba'**
  String get weekdayThu;

  /// No description provided for @weekdayFri.
  ///
  /// In uz, this message translates to:
  /// **'Juma'**
  String get weekdayFri;

  /// No description provided for @weekdaySat.
  ///
  /// In uz, this message translates to:
  /// **'Shanba'**
  String get weekdaySat;

  /// No description provided for @teacherTabSchedule.
  ///
  /// In uz, this message translates to:
  /// **'Jadval'**
  String get teacherTabSchedule;

  /// No description provided for @availabilityAdd.
  ///
  /// In uz, this message translates to:
  /// **'Vaqt qo\'shish'**
  String get availabilityAdd;

  /// No description provided for @availabilityDay.
  ///
  /// In uz, this message translates to:
  /// **'Kun'**
  String get availabilityDay;

  /// No description provided for @availabilityFrom.
  ///
  /// In uz, this message translates to:
  /// **'Boshlanishi'**
  String get availabilityFrom;

  /// No description provided for @availabilityTo.
  ///
  /// In uz, this message translates to:
  /// **'Tugashi'**
  String get availabilityTo;

  /// No description provided for @availabilityEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Jadval bo\'sh. Dars vaqtlaringizni qo\'shing!'**
  String get availabilityEmpty;

  /// No description provided for @availabilityExceptions.
  ///
  /// In uz, this message translates to:
  /// **'Istisno kunlar (ta\'til)'**
  String get availabilityExceptions;

  /// No description provided for @availabilityAddException.
  ///
  /// In uz, this message translates to:
  /// **'Kun yopish'**
  String get availabilityAddException;

  /// No description provided for @homeGreetingMorning.
  ///
  /// In uz, this message translates to:
  /// **'Xayrli tong'**
  String get homeGreetingMorning;

  /// No description provided for @homeGreetingDay.
  ///
  /// In uz, this message translates to:
  /// **'Xayrli kun'**
  String get homeGreetingDay;

  /// No description provided for @homeGreetingEvening.
  ///
  /// In uz, this message translates to:
  /// **'Xayrli oqshom'**
  String get homeGreetingEvening;

  /// No description provided for @homeGreetingNight.
  ///
  /// In uz, this message translates to:
  /// **'Xayrli tun'**
  String get homeGreetingNight;

  /// No description provided for @homeSearchHint.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz, fan yoki yo\'nalish qidiring...'**
  String get homeSearchHint;

  /// No description provided for @homeNextLesson.
  ///
  /// In uz, this message translates to:
  /// **'Yaqinlashayotgan dars'**
  String get homeNextLesson;

  /// No description provided for @homeCategories.
  ///
  /// In uz, this message translates to:
  /// **'Yo\'nalishlar'**
  String get homeCategories;

  /// No description provided for @homePopular.
  ///
  /// In uz, this message translates to:
  /// **'Mashhur ustozlar'**
  String get homePopular;

  /// No description provided for @homeTrialSection.
  ///
  /// In uz, this message translates to:
  /// **'Bepul sinov darsi bilan'**
  String get homeTrialSection;

  /// No description provided for @homeFavorites.
  ///
  /// In uz, this message translates to:
  /// **'Sevimli ustozlar'**
  String get homeFavorites;

  /// No description provided for @homeTeacherToday.
  ///
  /// In uz, this message translates to:
  /// **'Bugungi darslar: {count}'**
  String homeTeacherToday(int count);

  /// No description provided for @homeTeacherPanelCta.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz kabinetiga o\'tish'**
  String get homeTeacherPanelCta;

  /// No description provided for @startsIn.
  ///
  /// In uz, this message translates to:
  /// **'Boshlanishiga {time} qoldi'**
  String startsIn(String time);

  /// No description provided for @lessonStarted.
  ///
  /// In uz, this message translates to:
  /// **'Dars boshlandi'**
  String get lessonStarted;

  /// No description provided for @unitDay.
  ///
  /// In uz, this message translates to:
  /// **'kun'**
  String get unitDay;

  /// No description provided for @unitHour.
  ///
  /// In uz, this message translates to:
  /// **'soat'**
  String get unitHour;

  /// No description provided for @unitMin.
  ///
  /// In uz, this message translates to:
  /// **'daq'**
  String get unitMin;

  /// No description provided for @todayLabel.
  ///
  /// In uz, this message translates to:
  /// **'Bugun'**
  String get todayLabel;

  /// No description provided for @tomorrowLabel.
  ///
  /// In uz, this message translates to:
  /// **'Ertaga'**
  String get tomorrowLabel;

  /// No description provided for @catalogFilters.
  ///
  /// In uz, this message translates to:
  /// **'Filtrlar'**
  String get catalogFilters;

  /// No description provided for @catalogSortTitle.
  ///
  /// In uz, this message translates to:
  /// **'Saralash'**
  String get catalogSortTitle;

  /// No description provided for @sortPriceAsc.
  ///
  /// In uz, this message translates to:
  /// **'Avval arzonlari'**
  String get sortPriceAsc;

  /// No description provided for @sortPriceDesc.
  ///
  /// In uz, this message translates to:
  /// **'Avval qimmatlari'**
  String get sortPriceDesc;

  /// No description provided for @filterCategory.
  ///
  /// In uz, this message translates to:
  /// **'Yo\'nalish'**
  String get filterCategory;

  /// No description provided for @filterSubject.
  ///
  /// In uz, this message translates to:
  /// **'Fan'**
  String get filterSubject;

  /// No description provided for @filterAnySubject.
  ///
  /// In uz, this message translates to:
  /// **'Barcha fanlar'**
  String get filterAnySubject;

  /// No description provided for @filterPrice.
  ///
  /// In uz, this message translates to:
  /// **'Narx (60 daqiqa uchun)'**
  String get filterPrice;

  /// No description provided for @filterRatingMin.
  ///
  /// In uz, this message translates to:
  /// **'Reyting 4 dan yuqori'**
  String get filterRatingMin;

  /// No description provided for @filterLang.
  ///
  /// In uz, this message translates to:
  /// **'Dars tili'**
  String get filterLang;

  /// No description provided for @filterTrialOnly.
  ///
  /// In uz, this message translates to:
  /// **'Faqat bepul sinov darsi bilan'**
  String get filterTrialOnly;

  /// No description provided for @filterReset.
  ///
  /// In uz, this message translates to:
  /// **'Tozalash'**
  String get filterReset;

  /// No description provided for @filterShow.
  ///
  /// In uz, this message translates to:
  /// **'Ko\'rsatish'**
  String get filterShow;

  /// No description provided for @languageEnglish.
  ///
  /// In uz, this message translates to:
  /// **'Inglizcha'**
  String get languageEnglish;

  /// No description provided for @catalogEmptyBody.
  ///
  /// In uz, this message translates to:
  /// **'Qidiruv yoki filtrlarni o\'zgartirib ko\'ring.'**
  String get catalogEmptyBody;

  /// No description provided for @catalogResetFilters.
  ///
  /// In uz, this message translates to:
  /// **'Filtrlarni tozalash'**
  String get catalogResetFilters;

  /// No description provided for @cardLessonsCount.
  ///
  /// In uz, this message translates to:
  /// **'{count} ta dars'**
  String cardLessonsCount(int count);

  /// No description provided for @teacherVideoIntro.
  ///
  /// In uz, this message translates to:
  /// **'Video taqdimot'**
  String get teacherVideoIntro;

  /// No description provided for @teacherServices.
  ///
  /// In uz, this message translates to:
  /// **'Xizmatlar va narxlar'**
  String get teacherServices;

  /// No description provided for @teacherFreeSlots.
  ///
  /// In uz, this message translates to:
  /// **'Bo\'sh vaqtlar'**
  String get teacherFreeSlots;

  /// No description provided for @teacherSlotsHint.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin 3 kun · 60 daqiqalik dars'**
  String get teacherSlotsHint;

  /// No description provided for @teacherNoUpcomingSlots.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin kunlarda bo\'sh vaqt yo\'q'**
  String get teacherNoUpcomingSlots;

  /// No description provided for @teacherReviewsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Sharhlar'**
  String get teacherReviewsTitle;

  /// No description provided for @reviewsCountLabel.
  ///
  /// In uz, this message translates to:
  /// **'{count} ta sharh'**
  String reviewsCountLabel(int count);

  /// No description provided for @teacherReviewsEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Sharhlar hozircha yo\'q'**
  String get teacherReviewsEmpty;

  /// No description provided for @showMore.
  ///
  /// In uz, this message translates to:
  /// **'Yana ko\'rsatish'**
  String get showMore;

  /// No description provided for @readMore.
  ///
  /// In uz, this message translates to:
  /// **'To\'liq o\'qish'**
  String get readMore;

  /// No description provided for @readLess.
  ///
  /// In uz, this message translates to:
  /// **'Yig\'ish'**
  String get readLess;

  /// No description provided for @reviewAnonymous.
  ///
  /// In uz, this message translates to:
  /// **'O\'quvchi'**
  String get reviewAnonymous;

  /// No description provided for @teacherWrite.
  ///
  /// In uz, this message translates to:
  /// **'Yozish'**
  String get teacherWrite;

  /// No description provided for @bookingStepSubject.
  ///
  /// In uz, this message translates to:
  /// **'Fan'**
  String get bookingStepSubject;

  /// No description provided for @bookingStepTime.
  ///
  /// In uz, this message translates to:
  /// **'Vaqt'**
  String get bookingStepTime;

  /// No description provided for @bookingStepConfirm.
  ///
  /// In uz, this message translates to:
  /// **'Tasdiqlash'**
  String get bookingStepConfirm;

  /// No description provided for @bookingDateTime.
  ///
  /// In uz, this message translates to:
  /// **'Sana va vaqt'**
  String get bookingDateTime;

  /// No description provided for @bookingDuration.
  ///
  /// In uz, this message translates to:
  /// **'Davomiyligi'**
  String get bookingDuration;

  /// No description provided for @bookingPolicyFree.
  ///
  /// In uz, this message translates to:
  /// **'12 soatdan oldin bekor qilish — bepul'**
  String get bookingPolicyFree;

  /// No description provided for @bookingSuccessTitle.
  ///
  /// In uz, this message translates to:
  /// **'Band qilindi!'**
  String get bookingSuccessTitle;

  /// No description provided for @bookingSuccessPaidNote.
  ///
  /// In uz, this message translates to:
  /// **'Dars tasdiqlandi. Uni \"Darslarim\" bo\'limida topasiz.'**
  String get bookingSuccessPaidNote;

  /// No description provided for @bookingPendingNote.
  ///
  /// In uz, this message translates to:
  /// **'To\'lov kutilmoqda: onlayn to\'lov loyiha egasi tomonidan ulanmoqda. Tanlangan vaqt siz uchun 15 daqiqa band qilib turiladi.'**
  String get bookingPendingNote;

  /// No description provided for @bookingGoLessons.
  ///
  /// In uz, this message translates to:
  /// **'Darslarim'**
  String get bookingGoLessons;

  /// No description provided for @bookingWriteTeacher.
  ///
  /// In uz, this message translates to:
  /// **'Ustozga yozish'**
  String get bookingWriteTeacher;

  /// No description provided for @bookingGoHome.
  ///
  /// In uz, this message translates to:
  /// **'Bosh sahifaga'**
  String get bookingGoHome;

  /// No description provided for @lessonsEmptyUpcomingTitle.
  ///
  /// In uz, this message translates to:
  /// **'Kelgusi darslar yo\'q'**
  String get lessonsEmptyUpcomingTitle;

  /// No description provided for @lessonsEmptyUpcomingBody.
  ///
  /// In uz, this message translates to:
  /// **'O\'zingizga mos ustozni tanlab, birinchi darsni band qiling.'**
  String get lessonsEmptyUpcomingBody;

  /// No description provided for @lessonsFindTeacher.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz topish'**
  String get lessonsFindTeacher;

  /// No description provided for @lessonsEmptyPastTitle.
  ///
  /// In uz, this message translates to:
  /// **'O\'tgan darslar hali yo\'q'**
  String get lessonsEmptyPastTitle;

  /// No description provided for @cancelLessonLate.
  ///
  /// In uz, this message translates to:
  /// **'Diqqat: dars boshlanishiga 12 soatdan kam qoldi — to\'lov qaytarilmaydi.'**
  String get cancelLessonLate;

  /// No description provided for @lessonCancelled.
  ///
  /// In uz, this message translates to:
  /// **'Dars bekor qilindi'**
  String get lessonCancelled;

  /// No description provided for @refundToBalance.
  ///
  /// In uz, this message translates to:
  /// **'To\'lov balansingizga qaytarildi'**
  String get refundToBalance;

  /// No description provided for @leaveReview.
  ///
  /// In uz, this message translates to:
  /// **'Sharh qoldirish'**
  String get leaveReview;

  /// No description provided for @reviewTitle.
  ///
  /// In uz, this message translates to:
  /// **'Dars qanday o\'tdi?'**
  String get reviewTitle;

  /// No description provided for @reviewHint.
  ///
  /// In uz, this message translates to:
  /// **'Fikringizni yozing (ixtiyoriy)'**
  String get reviewHint;

  /// No description provided for @reviewSend.
  ///
  /// In uz, this message translates to:
  /// **'Yuborish'**
  String get reviewSend;

  /// No description provided for @reviewThanks.
  ///
  /// In uz, this message translates to:
  /// **'Rahmat! Sharhingiz qabul qilindi.'**
  String get reviewThanks;

  /// No description provided for @reviewAlready.
  ///
  /// In uz, this message translates to:
  /// **'Bu dars uchun sharh allaqachon qoldirilgan.'**
  String get reviewAlready;

  /// No description provided for @yourRating.
  ///
  /// In uz, this message translates to:
  /// **'Sizning bahoyingiz'**
  String get yourRating;

  /// No description provided for @tagPunctual.
  ///
  /// In uz, this message translates to:
  /// **'Punktual'**
  String get tagPunctual;

  /// No description provided for @tagClear.
  ///
  /// In uz, this message translates to:
  /// **'Tushunarli tushuntiradi'**
  String get tagClear;

  /// No description provided for @tagPolite.
  ///
  /// In uz, this message translates to:
  /// **'Xushmuomala'**
  String get tagPolite;

  /// No description provided for @tagRecommend.
  ///
  /// In uz, this message translates to:
  /// **'Tavsiya qilaman'**
  String get tagRecommend;

  /// No description provided for @chatYou.
  ///
  /// In uz, this message translates to:
  /// **'Siz'**
  String get chatYou;

  /// No description provided for @chatNoMessages.
  ///
  /// In uz, this message translates to:
  /// **'Xabarlar hali yo\'q'**
  String get chatNoMessages;

  /// No description provided for @chatAttachment.
  ///
  /// In uz, this message translates to:
  /// **'Fayl'**
  String get chatAttachment;

  /// No description provided for @chatInputHint.
  ///
  /// In uz, this message translates to:
  /// **'Xabar yozing...'**
  String get chatInputHint;

  /// No description provided for @chatSafetyNote.
  ///
  /// In uz, this message translates to:
  /// **'Xavfsizligingiz uchun telefon raqamlari va boshqa kontaktlar avtomatik yashiriladi.'**
  String get chatSafetyNote;

  /// No description provided for @chatMaskedNote.
  ///
  /// In uz, this message translates to:
  /// **'tizim tomonidan o\'zgartirildi'**
  String get chatMaskedNote;

  /// No description provided for @chatYesterday.
  ///
  /// In uz, this message translates to:
  /// **'Kecha'**
  String get chatYesterday;

  /// No description provided for @chatTeacherNoChat.
  ///
  /// In uz, this message translates to:
  /// **'O\'quvchi sizga hali yozmagan. Chat o\'quvchi birinchi xabar yuborganida ochiladi.'**
  String get chatTeacherNoChat;

  /// No description provided for @notificationsTitle.
  ///
  /// In uz, this message translates to:
  /// **'Bildirishnomalar'**
  String get notificationsTitle;

  /// No description provided for @notificationsEmptyTitle.
  ///
  /// In uz, this message translates to:
  /// **'Bildirishnomalar yo\'q'**
  String get notificationsEmptyTitle;

  /// No description provided for @notificationsEmptyBody.
  ///
  /// In uz, this message translates to:
  /// **'Dars eslatmalari va muhim yangiliklar shu yerda ko\'rinadi.'**
  String get notificationsEmptyBody;

  /// No description provided for @notificationsMarkAll.
  ///
  /// In uz, this message translates to:
  /// **'Barchasini o\'qish'**
  String get notificationsMarkAll;

  /// No description provided for @notifReminder24Title.
  ///
  /// In uz, this message translates to:
  /// **'Ertaga dars bor'**
  String get notifReminder24Title;

  /// No description provided for @notifReminder24Body.
  ///
  /// In uz, this message translates to:
  /// **'Dars boshlanishiga 24 soatdan kam vaqt qoldi. Tafsilotlar — Darslarim bo\'limida.'**
  String get notifReminder24Body;

  /// No description provided for @notifReminder1hTitle.
  ///
  /// In uz, this message translates to:
  /// **'Dars tez orada boshlanadi'**
  String get notifReminder1hTitle;

  /// No description provided for @notifReminder1hBody.
  ///
  /// In uz, this message translates to:
  /// **'Dars 1 soat ichida boshlanadi. Tayyorgarlikni unutmang!'**
  String get notifReminder1hBody;

  /// No description provided for @notifCancelledTitle.
  ///
  /// In uz, this message translates to:
  /// **'Dars bekor qilindi'**
  String get notifCancelledTitle;

  /// No description provided for @notifCancelledBody.
  ///
  /// In uz, this message translates to:
  /// **'Darslaringizdan biri bekor qilindi. Tafsilotlar — Darslarim bo\'limida.'**
  String get notifCancelledBody;

  /// No description provided for @notifReviewTitle.
  ///
  /// In uz, this message translates to:
  /// **'Dars qanday o\'tdi?'**
  String get notifReviewTitle;

  /// No description provided for @notifReviewBody.
  ///
  /// In uz, this message translates to:
  /// **'Ustozga baho qo\'ying — bu boshqa o\'quvchilarga ham yordam beradi.'**
  String get notifReviewBody;

  /// No description provided for @notifGenericTitle.
  ///
  /// In uz, this message translates to:
  /// **'Bildirishnoma'**
  String get notifGenericTitle;

  /// No description provided for @profileBalanceTitle.
  ///
  /// In uz, this message translates to:
  /// **'Balansim'**
  String get profileBalanceTitle;

  /// No description provided for @profileBalanceNote.
  ///
  /// In uz, this message translates to:
  /// **'Hisobni to\'ldirish onlayn to\'lov ulangach ishlaydi. To\'lov loyiha egasi tomonidan ulanmoqda.'**
  String get profileBalanceNote;

  /// No description provided for @gamificationLevel.
  ///
  /// In uz, this message translates to:
  /// **'{level}-daraja'**
  String gamificationLevel(int level);

  /// No description provided for @gamificationXp.
  ///
  /// In uz, this message translates to:
  /// **'{xp} XP'**
  String gamificationXp(int xp);

  /// No description provided for @gamificationStreak.
  ///
  /// In uz, this message translates to:
  /// **'{count} kunlik seriya'**
  String gamificationStreak(int count);

  /// No description provided for @gamificationToNext.
  ///
  /// In uz, this message translates to:
  /// **'Keyingi darajagacha {xp} XP'**
  String gamificationToNext(int xp);

  /// No description provided for @gamificationMaxLevel.
  ///
  /// In uz, this message translates to:
  /// **'Eng yuqori daraja!'**
  String get gamificationMaxLevel;

  /// No description provided for @menuFavorites.
  ///
  /// In uz, this message translates to:
  /// **'Sevimli ustozlar'**
  String get menuFavorites;

  /// No description provided for @menuSupport.
  ///
  /// In uz, this message translates to:
  /// **'Yordam xizmati'**
  String get menuSupport;

  /// No description provided for @menuAbout.
  ///
  /// In uz, this message translates to:
  /// **'Ilova haqida'**
  String get menuAbout;

  /// No description provided for @aboutVersion.
  ///
  /// In uz, this message translates to:
  /// **'Versiya {version}'**
  String aboutVersion(String version);

  /// No description provided for @aboutMadeIn.
  ///
  /// In uz, this message translates to:
  /// **'O\'zbekistonda mehr bilan yaratilgan'**
  String get aboutMadeIn;

  /// No description provided for @signOutConfirmTitle.
  ///
  /// In uz, this message translates to:
  /// **'Hisobdan chiqasizmi?'**
  String get signOutConfirmTitle;

  /// No description provided for @signOutConfirmBody.
  ///
  /// In uz, this message translates to:
  /// **'Qaytib kirish uchun telefon raqamingizga yana kod yuboriladi.'**
  String get signOutConfirmBody;

  /// No description provided for @becomeTeacherConfirmTitle.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz bo\'lasizmi?'**
  String get becomeTeacherConfirmTitle;

  /// No description provided for @becomeTeacherConfirmBody.
  ///
  /// In uz, this message translates to:
  /// **'Ustoz kabineti ochiladi: fanlar, narxlar va jadvalni o\'zingiz belgilaysiz. O\'quvchi sifatida o\'qishni ham davom ettira olasiz.'**
  String get becomeTeacherConfirmBody;

  /// No description provided for @favoritesEmptyTitle.
  ///
  /// In uz, this message translates to:
  /// **'Sevimli ustozlar yo\'q'**
  String get favoritesEmptyTitle;

  /// No description provided for @favoritesEmptyBody.
  ///
  /// In uz, this message translates to:
  /// **'Katalogda yoqqan ustozni yurakcha bilan belgilang — u shu yerda ko\'rinadi.'**
  String get favoritesEmptyBody;

  /// No description provided for @supportSubject.
  ///
  /// In uz, this message translates to:
  /// **'Mavzu'**
  String get supportSubject;

  /// No description provided for @supportMessage.
  ///
  /// In uz, this message translates to:
  /// **'Murojaat matni'**
  String get supportMessage;

  /// No description provided for @supportSend.
  ///
  /// In uz, this message translates to:
  /// **'Yuborish'**
  String get supportSend;

  /// No description provided for @supportSuccessTitle.
  ///
  /// In uz, this message translates to:
  /// **'Murojaat yuborildi!'**
  String get supportSuccessTitle;

  /// No description provided for @supportSuccessBody.
  ///
  /// In uz, this message translates to:
  /// **'Jamoamiz tez orada murojaatingizni ko\'rib chiqadi.'**
  String get supportSuccessBody;

  /// No description provided for @commonClose.
  ///
  /// In uz, this message translates to:
  /// **'Yopish'**
  String get commonClose;

  /// No description provided for @teacherTabDashboard.
  ///
  /// In uz, this message translates to:
  /// **'Umumiy'**
  String get teacherTabDashboard;

  /// No description provided for @dashUpcomingTitle.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin darslar'**
  String get dashUpcomingTitle;

  /// No description provided for @dashNoUpcoming.
  ///
  /// In uz, this message translates to:
  /// **'Yaqin kunlarda darslar yo\'q'**
  String get dashNoUpcoming;

  /// No description provided for @dashMonthIncome.
  ///
  /// In uz, this message translates to:
  /// **'Oylik daromad'**
  String get dashMonthIncome;

  /// No description provided for @dashLessonsTotal.
  ///
  /// In uz, this message translates to:
  /// **'Jami darslar'**
  String get dashLessonsTotal;

  /// No description provided for @walletTitle.
  ///
  /// In uz, this message translates to:
  /// **'Hamyon'**
  String get walletTitle;

  /// No description provided for @walletAvailable.
  ///
  /// In uz, this message translates to:
  /// **'Mavjud mablag\''**
  String get walletAvailable;

  /// No description provided for @walletFrozen.
  ///
  /// In uz, this message translates to:
  /// **'Muzlatilgan: {amount}'**
  String walletFrozen(String amount);

  /// No description provided for @payoutRequest.
  ///
  /// In uz, this message translates to:
  /// **'Pul yechish'**
  String get payoutRequest;

  /// No description provided for @payoutAmountLabel.
  ///
  /// In uz, this message translates to:
  /// **'Summa (so\'m)'**
  String get payoutAmountLabel;

  /// No description provided for @payoutCardLabel.
  ///
  /// In uz, this message translates to:
  /// **'Karta raqami'**
  String get payoutCardLabel;

  /// No description provided for @payoutMinHint.
  ///
  /// In uz, this message translates to:
  /// **'Kamida 50 000 so\'m'**
  String get payoutMinHint;

  /// No description provided for @payoutErrorMin.
  ///
  /// In uz, this message translates to:
  /// **'Eng kam summa — 50 000 so\'m'**
  String get payoutErrorMin;

  /// No description provided for @payoutErrorInsufficient.
  ///
  /// In uz, this message translates to:
  /// **'Hamyonda mablag\' yetarli emas'**
  String get payoutErrorInsufficient;

  /// No description provided for @payoutErrorCard.
  ///
  /// In uz, this message translates to:
  /// **'Karta raqami 16 ta raqamdan iborat bo\'lishi kerak'**
  String get payoutErrorCard;

  /// No description provided for @payoutSuccess.
  ///
  /// In uz, this message translates to:
  /// **'So\'rov qabul qilindi. Administrator tasdiqlagach, pul kartangizga o\'tkaziladi.'**
  String get payoutSuccess;

  /// No description provided for @walletHistory.
  ///
  /// In uz, this message translates to:
  /// **'So\'nggi amaliyotlar'**
  String get walletHistory;

  /// No description provided for @walletHistoryEmpty.
  ///
  /// In uz, this message translates to:
  /// **'Amaliyotlar hali yo\'q'**
  String get walletHistoryEmpty;

  /// No description provided for @txLessonIncome.
  ///
  /// In uz, this message translates to:
  /// **'Dars daromadi'**
  String get txLessonIncome;

  /// No description provided for @txPayout.
  ///
  /// In uz, this message translates to:
  /// **'Pul yechildi'**
  String get txPayout;

  /// No description provided for @txPayoutFreeze.
  ///
  /// In uz, this message translates to:
  /// **'Yechish uchun muzlatildi'**
  String get txPayoutFreeze;

  /// No description provided for @txPayoutUnfreeze.
  ///
  /// In uz, this message translates to:
  /// **'Muzlatish bekor qilindi'**
  String get txPayoutUnfreeze;

  /// No description provided for @txRefundIn.
  ///
  /// In uz, this message translates to:
  /// **'Qaytarildi'**
  String get txRefundIn;

  /// No description provided for @txBookingSpend.
  ///
  /// In uz, this message translates to:
  /// **'Dars uchun to\'lov'**
  String get txBookingSpend;

  /// No description provided for @txAdminAdjust.
  ///
  /// In uz, this message translates to:
  /// **'Tuzatish'**
  String get txAdminAdjust;
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
