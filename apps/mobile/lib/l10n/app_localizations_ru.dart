// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appTitle => 'USTOZ';

  @override
  String get splashTagline => 'Найдите своего наставника';

  @override
  String get onboardingTitle1 => 'Наставник по любому направлению';

  @override
  String get onboardingBody1 =>
      'Языки, школьные предметы, IT, психология и многое другое — всё в одном приложении.';

  @override
  String get onboardingTitle2 => 'Урок внутри платформы';

  @override
  String get onboardingBody2 =>
      'Видео, интерактивная доска, чат и домашние задания — никуда переходить не нужно.';

  @override
  String get onboardingTitle3 => 'Безопасная оплата';

  @override
  String get onboardingBody3 =>
      'Платите через Payme, Click или Uzum. Если урок не состоялся — деньги вернутся.';

  @override
  String get onboardingNext => 'Далее';

  @override
  String get onboardingStart => 'Начать';

  @override
  String get onboardingSkip => 'Пропустить';

  @override
  String get homeTitle => 'Главная';

  @override
  String get homeGreeting => 'Здравствуйте!';

  @override
  String get homeSubtitle =>
      'Добро пожаловать в USTOZ. Это скелет Фазы 0: навигация, тема и локализация uz/ru готовы.';

  @override
  String get settingsTitle => 'Настройки';

  @override
  String get settingsLanguage => 'Язык';

  @override
  String get languageUzbek => 'Узбекский';

  @override
  String get languageRussian => 'Русский';

  @override
  String get catalogTitle => 'Каталог';

  @override
  String get lessonsTitle => 'Мои уроки';

  @override
  String get chatsTitle => 'Чаты';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get commonCancel => 'Отмена';

  @override
  String get commonSave => 'Сохранить';

  @override
  String get commonSaved => 'Сохранено';

  @override
  String get commonError => 'Произошла ошибка. Попробуйте ещё раз.';

  @override
  String get authPhoneTitle => 'Вход';

  @override
  String get authPhoneHeadline => 'Введите номер телефона';

  @override
  String get authPhoneHint => 'Отправим 6-значный код подтверждения по SMS.';

  @override
  String get authSendCode => 'Отправить код';

  @override
  String get authRateLimited => 'Слишком много попыток. Попробуйте чуть позже.';

  @override
  String get authOtpTitle => 'Код подтверждения';

  @override
  String authOtpHeadline(String phone) {
    return 'Введите 6-значный код, отправленный на $phone';
  }

  @override
  String authResendIn(int seconds) {
    return 'Отправить повторно: $seconds с';
  }

  @override
  String get authResend => 'Отправить код ещё раз';

  @override
  String get authVerify => 'Подтвердить';

  @override
  String get authCodeWrong => 'Неверный или просроченный код';

  @override
  String get setupTitle => 'Заполните профиль';

  @override
  String get setupNameLabel => 'Ваше имя';

  @override
  String get setupNameHint => 'Имя Фамилия';

  @override
  String get setupInterests => 'Какие направления интересны?';

  @override
  String get setupContinue => 'Продолжить';

  @override
  String get teacherCabinet => 'Кабинет устоза';

  @override
  String get becomeTeacherTitle => 'Станьте устозом';

  @override
  String get becomeTeacherBody =>
      'Создайте профиль, укажите предметы и цены — ученики найдут вас.';

  @override
  String get becomeTeacherCta => 'Стать устозом';

  @override
  String get signOut => 'Выйти';

  @override
  String get teacherTabProfile => 'Анкета';

  @override
  String get teacherTabSubjects => 'Предметы и цены';

  @override
  String get teacherUploadPhoto => 'Загрузить фото';

  @override
  String get teacherUploadVideo => 'Видео (90 с)';

  @override
  String get teacherHeadlineUz => 'Заголовок (uz)';

  @override
  String get teacherHeadlineRu => 'Заголовок (ru)';

  @override
  String get teacherBioUz => 'О себе (uz)';

  @override
  String get teacherBioRu => 'О себе (ru)';

  @override
  String get teacherExperience => 'Опыт (лет)';

  @override
  String get teacherLangs => 'Языки преподавания';

  @override
  String get teacherAddSubject => 'Добавить предмет';

  @override
  String get teacherNoSubjects => 'Пока нет предметов. Добавьте первый!';

  @override
  String get teacherSubject => 'Предмет';

  @override
  String get teacherTrialToggle => 'Бесплатный пробный урок 20 минут';

  @override
  String get teacherTrialOn => 'есть пробный';

  @override
  String get teacherSubjectLimit =>
      'На тарифе FREE — только 1 предмет. PRO — до 5.';

  @override
  String get minutes => 'мин';

  @override
  String get catalogSearchHint => 'Имя, предмет или направление...';

  @override
  String get catalogAll => 'Все';

  @override
  String get sortRecommended => 'Рекомендуем';

  @override
  String get sortCheap => 'Дешевле';

  @override
  String get sortRating => 'Рейтинг';

  @override
  String get catalogTrialChip => 'Бесплатный пробный';

  @override
  String get catalogEmpty => 'Ничего не найдено';

  @override
  String get catalogFrom => 'от';

  @override
  String get catalogTrialBadge => 'Бесплатный пробный урок';

  @override
  String get teacherProfileTitle => 'Профиль устоза';

  @override
  String get teacherAbout => 'О преподавателе';

  @override
  String get minutesLessons => 'уроков';

  @override
  String get years => 'лет';

  @override
  String get minShort => ' мин';

  @override
  String get bookComingSoon => 'Бронирование — в Фазе 3';

  @override
  String get bookingCta => 'Забронировать';

  @override
  String get bookingTitle => 'Бронирование урока';

  @override
  String get bookingTrialChoice => 'Бесплатный пробный (20 мин)';

  @override
  String get bookingNoSlots => 'На этот день свободных слотов нет';

  @override
  String get bookingFreeTrialLabel => 'Бесплатный пробный урок';

  @override
  String get bookingTotal => 'Итого';

  @override
  String get bookingConfirm => 'Подтвердить';

  @override
  String get bookingCreated => 'Урок забронирован!';

  @override
  String get bookingSlotTaken => 'Это время уже занято. Выберите другое.';

  @override
  String get bookingTrialUsed => 'Бесплатный пробный урок уже использован.';

  @override
  String get lessonsUpcoming => 'Предстоящие';

  @override
  String get lessonsPast => 'Прошедшие';

  @override
  String get lessonsEmpty => 'Пока нет уроков';

  @override
  String get roleStudent => 'Ученик';

  @override
  String get roleTeacher => 'Устоз';

  @override
  String get statusPendingPayment => 'Ждёт оплаты';

  @override
  String get statusPaid => 'Оплачен';

  @override
  String get statusInProgress => 'Идёт';

  @override
  String get statusCompleted => 'Проведён';

  @override
  String get statusCancelled => 'Отменён';

  @override
  String get statusExpired => 'Истёк';

  @override
  String get cancelLessonTitle => 'Отменить урок?';

  @override
  String get cancelLessonBody =>
      'При отмене за 12+ часов оплата вернётся на баланс, позже — не вернётся.';

  @override
  String get cancelLessonConfirm => 'Отменить';

  @override
  String get weekdaySun => 'Воскресенье';

  @override
  String get weekdayMon => 'Понедельник';

  @override
  String get weekdayTue => 'Вторник';

  @override
  String get weekdayWed => 'Среда';

  @override
  String get weekdayThu => 'Четверг';

  @override
  String get weekdayFri => 'Пятница';

  @override
  String get weekdaySat => 'Суббота';

  @override
  String get teacherTabSchedule => 'Расписание';

  @override
  String get availabilityAdd => 'Добавить время';

  @override
  String get availabilityDay => 'День';

  @override
  String get availabilityFrom => 'Начало';

  @override
  String get availabilityTo => 'Конец';

  @override
  String get availabilityEmpty => 'Расписание пустое. Добавьте время занятий!';

  @override
  String get availabilityExceptions => 'Исключения (отпуск)';

  @override
  String get availabilityAddException => 'Закрыть день';
}
