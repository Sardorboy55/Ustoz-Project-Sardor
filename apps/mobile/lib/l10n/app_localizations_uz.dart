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
  String get onboardingTitle1 => 'O\'zingizga mos ustozni toping';

  @override
  String get onboardingBody1 =>
      'Tillar, maktab fanlari, IT, psixologiya va boshqa yo\'nalishlar — tajribali ustozlar bitta ilovada.';

  @override
  String get onboardingTitle2 => 'Qulay vaqtni band qiling';

  @override
  String get onboardingBody2 =>
      'Ustozning bo\'sh vaqtlarini ko\'ring va o\'zingizga qulay paytni tanlang — bir necha soniyada.';

  @override
  String get onboardingTitle3 => 'Onlayn o\'qing, o\'sishni kuzating';

  @override
  String get onboardingBody3 =>
      'Darslar platforma ichida o\'tadi: video, doska va chat. Natijalaringiz har doim ko\'z oldingizda.';

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
  String get commonRetry => 'Qayta urinish';

  @override
  String get sectionAll => 'Barchasi';

  @override
  String get tabHome => 'Asosiy';

  @override
  String get tabCatalog => 'Katalog';

  @override
  String get tabLessons => 'Darslar';

  @override
  String get tabChats => 'Chatlar';

  @override
  String get tabProfile => 'Profil';

  @override
  String get chatsEmptyTitle => 'Xabarlar hozircha yo\'q';

  @override
  String get chatsEmptyBody =>
      'Ustozga uning profilidan yozing — barcha xabarlar shu yerda saqlanadi.';

  @override
  String get chatsEmptyAction => 'Katalogga o\'tish';

  @override
  String get verifiedBadge => 'Tasdiqlangan';

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

  @override
  String get bookingCta => 'Band qilish';

  @override
  String get bookingTitle => 'Darsni band qilish';

  @override
  String get bookingTrialChoice => 'Bepul sinov (20 daq)';

  @override
  String get bookingNoSlots => 'Bu kunda bo\'sh vaqt yo\'q';

  @override
  String get bookingFreeTrialLabel => 'Bepul sinov darsi';

  @override
  String get bookingTotal => 'Jami';

  @override
  String get bookingConfirm => 'Tasdiqlash';

  @override
  String get bookingCreated => 'Dars band qilindi!';

  @override
  String get bookingSlotTaken => 'Bu vaqt endi band. Boshqasini tanlang.';

  @override
  String get bookingTrialUsed =>
      'Bepul sinov darsidan allaqachon foydalangansiz.';

  @override
  String get lessonsUpcoming => 'Kelgusi';

  @override
  String get lessonsPast => 'O\'tgan';

  @override
  String get lessonsEmpty => 'Hozircha darslar yo\'q';

  @override
  String get roleStudent => 'O\'quvchi';

  @override
  String get roleTeacher => 'Ustoz';

  @override
  String get statusPendingPayment => 'To\'lov kutilmoqda';

  @override
  String get statusPaid => 'To\'langan';

  @override
  String get statusInProgress => 'Davom etmoqda';

  @override
  String get statusCompleted => 'O\'tkazildi';

  @override
  String get statusCancelled => 'Bekor qilindi';

  @override
  String get statusCancelledByStudent => 'O\'quvchi bekor qildi';

  @override
  String get statusCancelledByTeacher => 'Ustoz bekor qildi';

  @override
  String get statusNoShowStudent => 'O\'quvchi kelmadi';

  @override
  String get statusNoShowTeacher => 'Ustoz kelmadi';

  @override
  String get statusExpired => 'Muddati o\'tdi';

  @override
  String get cancelLessonTitle => 'Darsni bekor qilish?';

  @override
  String get cancelLessonBody =>
      '12 soatdan oldin bekor qilinsa — to\'lov balansga qaytadi, keyin — qaytmaydi.';

  @override
  String get cancelLessonConfirm => 'Bekor qilish';

  @override
  String get weekdaySun => 'Yakshanba';

  @override
  String get weekdayMon => 'Dushanba';

  @override
  String get weekdayTue => 'Seshanba';

  @override
  String get weekdayWed => 'Chorshanba';

  @override
  String get weekdayThu => 'Payshanba';

  @override
  String get weekdayFri => 'Juma';

  @override
  String get weekdaySat => 'Shanba';

  @override
  String get teacherTabSchedule => 'Jadval';

  @override
  String get availabilityAdd => 'Vaqt qo\'shish';

  @override
  String get availabilityDay => 'Kun';

  @override
  String get availabilityFrom => 'Boshlanishi';

  @override
  String get availabilityTo => 'Tugashi';

  @override
  String get availabilityEmpty =>
      'Jadval bo\'sh. Dars vaqtlaringizni qo\'shing!';

  @override
  String get availabilityExceptions => 'Istisno kunlar (ta\'til)';

  @override
  String get availabilityAddException => 'Kun yopish';

  @override
  String get homeGreetingMorning => 'Xayrli tong';

  @override
  String get homeGreetingDay => 'Xayrli kun';

  @override
  String get homeGreetingEvening => 'Xayrli oqshom';

  @override
  String get homeGreetingNight => 'Xayrli tun';

  @override
  String get homeSearchHint => 'Ustoz, fan yoki yo\'nalish qidiring...';

  @override
  String get homeNextLesson => 'Yaqinlashayotgan dars';

  @override
  String get homeCategories => 'Yo\'nalishlar';

  @override
  String get homePopular => 'Mashhur ustozlar';

  @override
  String get homeTrialSection => 'Bepul sinov darsi bilan';

  @override
  String get homeFavorites => 'Sevimli ustozlar';

  @override
  String homeTeacherToday(int count) {
    return 'Bugungi darslar: $count';
  }

  @override
  String get homeTeacherPanelCta => 'Ustoz kabinetiga o\'tish';

  @override
  String startsIn(String time) {
    return 'Boshlanishiga $time qoldi';
  }

  @override
  String get lessonStarted => 'Dars boshlandi';

  @override
  String get unitDay => 'kun';

  @override
  String get unitHour => 'soat';

  @override
  String get unitMin => 'daq';

  @override
  String get todayLabel => 'Bugun';

  @override
  String get tomorrowLabel => 'Ertaga';

  @override
  String get catalogFilters => 'Filtrlar';

  @override
  String get catalogSortTitle => 'Saralash';

  @override
  String get sortPriceAsc => 'Avval arzonlari';

  @override
  String get sortPriceDesc => 'Avval qimmatlari';

  @override
  String get filterCategory => 'Yo\'nalish';

  @override
  String get filterSubject => 'Fan';

  @override
  String get filterAnySubject => 'Barcha fanlar';

  @override
  String get filterPrice => 'Narx (60 daqiqa uchun)';

  @override
  String get filterRatingMin => 'Reyting 4 dan yuqori';

  @override
  String get filterLang => 'Dars tili';

  @override
  String get filterTrialOnly => 'Faqat bepul sinov darsi bilan';

  @override
  String get filterReset => 'Tozalash';

  @override
  String get filterShow => 'Ko\'rsatish';

  @override
  String get languageEnglish => 'Inglizcha';

  @override
  String get catalogEmptyBody =>
      'Qidiruv yoki filtrlarni o\'zgartirib ko\'ring.';

  @override
  String get catalogResetFilters => 'Filtrlarni tozalash';

  @override
  String cardLessonsCount(int count) {
    return '$count ta dars';
  }

  @override
  String get teacherVideoIntro => 'Video taqdimot';

  @override
  String get teacherServices => 'Xizmatlar va narxlar';

  @override
  String get teacherFreeSlots => 'Bo\'sh vaqtlar';

  @override
  String get teacherSlotsHint => 'Yaqin 3 kun · 60 daqiqalik dars';

  @override
  String get teacherNoUpcomingSlots => 'Yaqin kunlarda bo\'sh vaqt yo\'q';

  @override
  String get teacherReviewsTitle => 'Sharhlar';

  @override
  String reviewsCountLabel(int count) {
    return '$count ta sharh';
  }

  @override
  String get teacherReviewsEmpty => 'Sharhlar hozircha yo\'q';

  @override
  String get showMore => 'Yana ko\'rsatish';

  @override
  String get readMore => 'To\'liq o\'qish';

  @override
  String get readLess => 'Yig\'ish';

  @override
  String get reviewAnonymous => 'O\'quvchi';

  @override
  String get teacherWrite => 'Yozish';

  @override
  String get bookingStepSubject => 'Fan';

  @override
  String get bookingStepTime => 'Vaqt';

  @override
  String get bookingStepConfirm => 'Tasdiqlash';

  @override
  String get bookingDateTime => 'Sana va vaqt';

  @override
  String get bookingDuration => 'Davomiyligi';

  @override
  String get bookingPolicyFree => '12 soatdan oldin bekor qilish — bepul';

  @override
  String get bookingSuccessTitle => 'Band qilindi!';

  @override
  String get bookingSuccessPaidNote =>
      'Dars tasdiqlandi. Uni \"Darslarim\" bo\'limida topasiz.';

  @override
  String get bookingPendingNote =>
      'To\'lov kutilmoqda: onlayn to\'lov loyiha egasi tomonidan ulanmoqda. Tanlangan vaqt siz uchun 15 daqiqa band qilib turiladi.';

  @override
  String get bookingGoLessons => 'Darslarim';

  @override
  String get bookingWriteTeacher => 'Ustozga yozish';

  @override
  String get bookingGoHome => 'Bosh sahifaga';

  @override
  String get lessonsEmptyUpcomingTitle => 'Kelgusi darslar yo\'q';

  @override
  String get lessonsEmptyUpcomingBody =>
      'O\'zingizga mos ustozni tanlab, birinchi darsni band qiling.';

  @override
  String get lessonsFindTeacher => 'Ustoz topish';

  @override
  String get lessonsEmptyPastTitle => 'O\'tgan darslar hali yo\'q';

  @override
  String get cancelLessonLate =>
      'Diqqat: dars boshlanishiga 12 soatdan kam qoldi — to\'lov qaytarilmaydi.';

  @override
  String get lessonCancelled => 'Dars bekor qilindi';

  @override
  String get refundToBalance => 'To\'lov balansingizga qaytarildi';

  @override
  String get leaveReview => 'Sharh qoldirish';

  @override
  String get reviewTitle => 'Dars qanday o\'tdi?';

  @override
  String get reviewHint => 'Fikringizni yozing (ixtiyoriy)';

  @override
  String get reviewSend => 'Yuborish';

  @override
  String get reviewThanks => 'Rahmat! Sharhingiz qabul qilindi.';

  @override
  String get reviewAlready => 'Bu dars uchun sharh allaqachon qoldirilgan.';

  @override
  String get yourRating => 'Sizning bahoyingiz';

  @override
  String get tagPunctual => 'Punktual';

  @override
  String get tagClear => 'Tushunarli tushuntiradi';

  @override
  String get tagPolite => 'Xushmuomala';

  @override
  String get tagRecommend => 'Tavsiya qilaman';

  @override
  String get chatYou => 'Siz';

  @override
  String get chatNoMessages => 'Xabarlar hali yo\'q';

  @override
  String get chatAttachment => 'Fayl';

  @override
  String get chatInputHint => 'Xabar yozing...';

  @override
  String get chatSafetyNote =>
      'Xavfsizligingiz uchun telefon raqamlari va boshqa kontaktlar avtomatik yashiriladi.';

  @override
  String get chatMaskedNote => 'tizim tomonidan o\'zgartirildi';

  @override
  String get chatYesterday => 'Kecha';

  @override
  String get chatTeacherNoChat =>
      'O\'quvchi sizga hali yozmagan. Chat o\'quvchi birinchi xabar yuborganida ochiladi.';

  @override
  String get notificationsTitle => 'Bildirishnomalar';

  @override
  String get notificationsEmptyTitle => 'Bildirishnomalar yo\'q';

  @override
  String get notificationsEmptyBody =>
      'Dars eslatmalari va muhim yangiliklar shu yerda ko\'rinadi.';

  @override
  String get notificationsMarkAll => 'Barchasini o\'qish';

  @override
  String get notifReminder24Title => 'Ertaga dars bor';

  @override
  String get notifReminder24Body =>
      'Dars boshlanishiga 24 soatdan kam vaqt qoldi. Tafsilotlar — Darslarim bo\'limida.';

  @override
  String get notifReminder1hTitle => 'Dars tez orada boshlanadi';

  @override
  String get notifReminder1hBody =>
      'Dars 1 soat ichida boshlanadi. Tayyorgarlikni unutmang!';

  @override
  String get notifCancelledTitle => 'Dars bekor qilindi';

  @override
  String get notifCancelledBody =>
      'Darslaringizdan biri bekor qilindi. Tafsilotlar — Darslarim bo\'limida.';

  @override
  String get notifReviewTitle => 'Dars qanday o\'tdi?';

  @override
  String get notifReviewBody =>
      'Ustozga baho qo\'ying — bu boshqa o\'quvchilarga ham yordam beradi.';

  @override
  String get notifGenericTitle => 'Bildirishnoma';

  @override
  String get profileBalanceTitle => 'Balansim';

  @override
  String get profileBalanceNote =>
      'Hisobni to\'ldirish onlayn to\'lov ulangach ishlaydi. To\'lov loyiha egasi tomonidan ulanmoqda.';

  @override
  String gamificationLevel(int level) {
    return '$level-daraja';
  }

  @override
  String gamificationXp(int xp) {
    return '$xp XP';
  }

  @override
  String gamificationStreak(int count) {
    return '$count kunlik seriya';
  }

  @override
  String gamificationToNext(int xp) {
    return 'Keyingi darajagacha $xp XP';
  }

  @override
  String get gamificationMaxLevel => 'Eng yuqori daraja!';

  @override
  String get menuFavorites => 'Sevimli ustozlar';

  @override
  String get menuSupport => 'Yordam xizmati';

  @override
  String get menuAbout => 'Ilova haqida';

  @override
  String aboutVersion(String version) {
    return 'Versiya $version';
  }

  @override
  String get aboutMadeIn => 'O\'zbekistonda mehr bilan yaratilgan';

  @override
  String get signOutConfirmTitle => 'Hisobdan chiqasizmi?';

  @override
  String get signOutConfirmBody =>
      'Qaytib kirish uchun telefon raqamingizga yana kod yuboriladi.';

  @override
  String get becomeTeacherConfirmTitle => 'Ustoz bo\'lasizmi?';

  @override
  String get becomeTeacherConfirmBody =>
      'Ustoz kabineti ochiladi: fanlar, narxlar va jadvalni o\'zingiz belgilaysiz. O\'quvchi sifatida o\'qishni ham davom ettira olasiz.';

  @override
  String get favoritesEmptyTitle => 'Sevimli ustozlar yo\'q';

  @override
  String get favoritesEmptyBody =>
      'Katalogda yoqqan ustozni yurakcha bilan belgilang — u shu yerda ko\'rinadi.';

  @override
  String get supportSubject => 'Mavzu';

  @override
  String get supportMessage => 'Murojaat matni';

  @override
  String get supportSend => 'Yuborish';

  @override
  String get supportSuccessTitle => 'Murojaat yuborildi!';

  @override
  String get supportSuccessBody =>
      'Jamoamiz tez orada murojaatingizni ko\'rib chiqadi.';

  @override
  String get commonClose => 'Yopish';

  @override
  String get teacherTabDashboard => 'Umumiy';

  @override
  String get dashUpcomingTitle => 'Yaqin darslar';

  @override
  String get dashNoUpcoming => 'Yaqin kunlarda darslar yo\'q';

  @override
  String get dashMonthIncome => 'Oylik daromad';

  @override
  String get dashLessonsTotal => 'Jami darslar';

  @override
  String get walletTitle => 'Hamyon';

  @override
  String get walletAvailable => 'Mavjud mablag\'';

  @override
  String walletFrozen(String amount) {
    return 'Muzlatilgan: $amount';
  }

  @override
  String get payoutRequest => 'Pul yechish';

  @override
  String get payoutAmountLabel => 'Summa (so\'m)';

  @override
  String get payoutCardLabel => 'Karta raqami';

  @override
  String get payoutMinHint => 'Kamida 50 000 so\'m';

  @override
  String get payoutErrorMin => 'Eng kam summa — 50 000 so\'m';

  @override
  String get payoutErrorInsufficient => 'Hamyonda mablag\' yetarli emas';

  @override
  String get payoutErrorCard =>
      'Karta raqami 16 ta raqamdan iborat bo\'lishi kerak';

  @override
  String get payoutSuccess =>
      'So\'rov qabul qilindi. Administrator tasdiqlagach, pul kartangizga o\'tkaziladi.';

  @override
  String get walletHistory => 'So\'nggi amaliyotlar';

  @override
  String get walletHistoryEmpty => 'Amaliyotlar hali yo\'q';

  @override
  String get txLessonIncome => 'Dars daromadi';

  @override
  String get txPayout => 'Pul yechildi';

  @override
  String get txPayoutFreeze => 'Yechish uchun muzlatildi';

  @override
  String get txPayoutUnfreeze => 'Muzlatish bekor qilindi';

  @override
  String get txRefundIn => 'Qaytarildi';

  @override
  String get txBookingSpend => 'Dars uchun to\'lov';

  @override
  String get txAdminAdjust => 'Tuzatish';
}
