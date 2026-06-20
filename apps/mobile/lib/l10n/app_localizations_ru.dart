// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String get appTitle => 'IBILIM';

  @override
  String get splashTagline => 'Найдите своего наставника';

  @override
  String get onboardingTitle1 => 'Найдите своего устоза';

  @override
  String get onboardingBody1 =>
      'Языки, школьные предметы, IT, психология и другие направления — опытные наставники в одном приложении.';

  @override
  String get onboardingTitle2 => 'Бронируйте удобное время';

  @override
  String get onboardingBody2 =>
      'Смотрите свободные часы устоза и выбирайте подходящий момент — это занимает меньше минуты.';

  @override
  String get onboardingTitle3 => 'Занимайтесь онлайн и растите';

  @override
  String get onboardingBody3 =>
      'Уроки проходят внутри платформы: видео, доска и чат. Ваш прогресс всегда перед глазами.';

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
      'Добро пожаловать в IBILIM. Это скелет Фазы 0: навигация, тема и локализация uz/ru готовы.';

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
  String get commonRetry => 'Повторить';

  @override
  String get sectionAll => 'Все';

  @override
  String get tabHome => 'Главная';

  @override
  String get tabCatalog => 'Каталог';

  @override
  String get tabLessons => 'Уроки';

  @override
  String get tabChats => 'Чаты';

  @override
  String get tabProfile => 'Профиль';

  @override
  String get chatsEmptyTitle => 'Сообщений пока нет';

  @override
  String get chatsEmptyBody =>
      'Напишите устозу с его профиля — вся переписка будет храниться здесь.';

  @override
  String get chatsEmptyAction => 'Перейти в каталог';

  @override
  String get verifiedBadge => 'Проверен';

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
  String get statusCancelledByStudent => 'Отменён учеником';

  @override
  String get statusCancelledByTeacher => 'Отменён устозом';

  @override
  String get statusNoShowStudent => 'Ученик не пришёл';

  @override
  String get statusNoShowTeacher => 'Устоз не пришёл';

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

  @override
  String get homeGreetingMorning => 'Доброе утро';

  @override
  String get homeGreetingDay => 'Добрый день';

  @override
  String get homeGreetingEvening => 'Добрый вечер';

  @override
  String get homeGreetingNight => 'Доброй ночи';

  @override
  String get homeSearchHint => 'Найти устоза, предмет или направление...';

  @override
  String get homeNextLesson => 'Ближайший урок';

  @override
  String get homeCategories => 'Направления';

  @override
  String get homePopular => 'Популярные преподаватели';

  @override
  String get homeTrialSection => 'С бесплатным пробным уроком';

  @override
  String get homeFavorites => 'Избранные преподаватели';

  @override
  String homeTeacherToday(int count) {
    return 'Сегодня уроков: $count';
  }

  @override
  String get homeTeacherPanelCta => 'Открыть кабинет устоза';

  @override
  String startsIn(String time) {
    return 'До начала $time';
  }

  @override
  String get lessonStarted => 'Урок начался';

  @override
  String get unitDay => 'дн.';

  @override
  String get unitHour => 'ч';

  @override
  String get unitMin => 'мин';

  @override
  String get todayLabel => 'Сегодня';

  @override
  String get tomorrowLabel => 'Завтра';

  @override
  String get catalogFilters => 'Фильтры';

  @override
  String get catalogSortTitle => 'Сортировка';

  @override
  String get sortPriceAsc => 'Сначала дешевле';

  @override
  String get sortPriceDesc => 'Сначала дороже';

  @override
  String get filterCategory => 'Направление';

  @override
  String get filterSubject => 'Предмет';

  @override
  String get filterAnySubject => 'Все предметы';

  @override
  String get filterPrice => 'Цена (за 60 минут)';

  @override
  String get filterRatingMin => 'Рейтинг 4 и выше';

  @override
  String get filterLang => 'Язык занятий';

  @override
  String get filterTrialOnly => 'Только с бесплатным пробным';

  @override
  String get filterReset => 'Сбросить';

  @override
  String get filterShow => 'Показать';

  @override
  String get languageEnglish => 'Английский';

  @override
  String get catalogEmptyBody => 'Попробуйте изменить запрос или фильтры.';

  @override
  String get catalogResetFilters => 'Сбросить фильтры';

  @override
  String cardLessonsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count уроков',
      few: '$count урока',
      one: '$count урок',
    );
    return '$_temp0';
  }

  @override
  String get teacherVideoIntro => 'Видеопрезентация';

  @override
  String get teacherServices => 'Услуги и цены';

  @override
  String get teacherFreeSlots => 'Свободное время';

  @override
  String get teacherSlotsHint => 'Ближайшие 3 дня · урок 60 минут';

  @override
  String get teacherNoUpcomingSlots => 'В ближайшие дни нет свободного времени';

  @override
  String get teacherReviewsTitle => 'Отзывы';

  @override
  String reviewsCountLabel(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count отзывов',
      few: '$count отзыва',
      one: '$count отзыв',
    );
    return '$_temp0';
  }

  @override
  String get teacherReviewsEmpty => 'Отзывов пока нет';

  @override
  String get showMore => 'Показать ещё';

  @override
  String get readMore => 'Читать далее';

  @override
  String get readLess => 'Свернуть';

  @override
  String get reviewAnonymous => 'Ученик';

  @override
  String get teacherWrite => 'Написать';

  @override
  String get bookingStepSubject => 'Предмет';

  @override
  String get bookingStepTime => 'Время';

  @override
  String get bookingStepConfirm => 'Подтверждение';

  @override
  String get bookingDateTime => 'Дата и время';

  @override
  String get bookingDuration => 'Длительность';

  @override
  String get bookingPolicyFree => 'Бесплатная отмена за 12 часов до урока';

  @override
  String get bookingSuccessTitle => 'Бронирование создано!';

  @override
  String get bookingSuccessPaidNote =>
      'Урок подтверждён. Найдёте его в разделе «Мои уроки».';

  @override
  String get bookingPendingNote =>
      'Ожидает оплаты: онлайн-оплата подключается владельцем проекта. Выбранное время зарезервировано для вас на 15 минут.';

  @override
  String get bookingGoLessons => 'Мои уроки';

  @override
  String get bookingWriteTeacher => 'Написать преподавателю';

  @override
  String get bookingGoHome => 'На главную';

  @override
  String get lessonsEmptyUpcomingTitle => 'Нет предстоящих уроков';

  @override
  String get lessonsEmptyUpcomingBody =>
      'Выберите подходящего устоза и запишитесь на первый урок.';

  @override
  String get lessonsFindTeacher => 'Найти устоза';

  @override
  String get lessonsEmptyPastTitle => 'Прошедших уроков пока нет';

  @override
  String get cancelLessonLate =>
      'Внимание: до урока меньше 12 часов — оплата не вернётся.';

  @override
  String get lessonCancelled => 'Урок отменён';

  @override
  String get refundToBalance => 'Оплата вернулась на ваш баланс';

  @override
  String get leaveReview => 'Оставить отзыв';

  @override
  String get reviewTitle => 'Как прошёл урок?';

  @override
  String get reviewHint => 'Поделитесь впечатлениями (необязательно)';

  @override
  String get reviewSend => 'Отправить';

  @override
  String get reviewThanks => 'Спасибо! Отзыв отправлен.';

  @override
  String get reviewAlready => 'Отзыв на этот урок уже оставлен.';

  @override
  String get yourRating => 'Ваша оценка';

  @override
  String get tagPunctual => 'Пунктуальный';

  @override
  String get tagClear => 'Понятно объясняет';

  @override
  String get tagPolite => 'Вежливый';

  @override
  String get tagRecommend => 'Рекомендую';

  @override
  String get chatYou => 'Вы';

  @override
  String get chatNoMessages => 'Сообщений пока нет';

  @override
  String get chatAttachment => 'Файл';

  @override
  String get chatInputHint => 'Сообщение...';

  @override
  String get chatSafetyNote =>
      'Для вашей безопасности номера телефонов и другие контакты скрываются автоматически.';

  @override
  String get chatMaskedNote => 'изменено системой';

  @override
  String get chatYesterday => 'Вчера';

  @override
  String get chatTeacherNoChat =>
      'Ученик вам ещё не писал. Чат появится, когда ученик отправит первое сообщение.';

  @override
  String get notificationsTitle => 'Уведомления';

  @override
  String get notificationsEmptyTitle => 'Уведомлений нет';

  @override
  String get notificationsEmptyBody =>
      'Напоминания об уроках и важные новости появятся здесь.';

  @override
  String get notificationsMarkAll => 'Прочитать все';

  @override
  String get notifReminder24Title => 'Завтра урок';

  @override
  String get notifReminder24Body =>
      'До начала урока меньше 24 часов. Подробности — в разделе «Мои уроки».';

  @override
  String get notifReminder1hTitle => 'Урок скоро начнётся';

  @override
  String get notifReminder1hBody =>
      'Урок начнётся в течение часа. Не забудьте подготовиться!';

  @override
  String get notifCancelledTitle => 'Урок отменён';

  @override
  String get notifCancelledBody =>
      'Один из ваших уроков отменён. Подробности — в разделе «Мои уроки».';

  @override
  String get notifReviewTitle => 'Как прошёл урок?';

  @override
  String get notifReviewBody => 'Оцените устоза — это поможет другим ученикам.';

  @override
  String get notifGenericTitle => 'Уведомление';

  @override
  String get profileBalanceTitle => 'Мой баланс';

  @override
  String get profileBalanceNote =>
      'Пополнение заработает после подключения онлайн-оплаты. Оплата подключается владельцем проекта.';

  @override
  String gamificationLevel(int level) {
    return 'Уровень $level';
  }

  @override
  String gamificationXp(int xp) {
    return '$xp XP';
  }

  @override
  String gamificationStreak(int count) {
    return 'Серия: $count дн.';
  }

  @override
  String gamificationToNext(int xp) {
    return 'До следующего уровня $xp XP';
  }

  @override
  String get gamificationMaxLevel => 'Максимальный уровень!';

  @override
  String get menuFavorites => 'Избранное';

  @override
  String get menuSupport => 'Поддержка';

  @override
  String get menuAbout => 'О приложении';

  @override
  String aboutVersion(String version) {
    return 'Версия $version';
  }

  @override
  String get aboutMadeIn => 'Сделано с любовью в Узбекистане';

  @override
  String get signOutConfirmTitle => 'Выйти из аккаунта?';

  @override
  String get signOutConfirmBody =>
      'Чтобы войти снова, вы получите код по номеру телефона.';

  @override
  String get becomeTeacherConfirmTitle => 'Стать устозом?';

  @override
  String get becomeTeacherConfirmBody =>
      'Откроется кабинет устоза: предметы, цены и расписание вы настроите сами. Учиться как ученик тоже сможете.';

  @override
  String get favoritesEmptyTitle => 'В избранном пока пусто';

  @override
  String get favoritesEmptyBody =>
      'Отмечайте понравившихся устозов сердечком — они появятся здесь.';

  @override
  String get supportSubject => 'Тема';

  @override
  String get supportMessage => 'Текст обращения';

  @override
  String get supportSend => 'Отправить';

  @override
  String get supportSuccessTitle => 'Обращение отправлено!';

  @override
  String get supportSuccessBody =>
      'Наша команда скоро рассмотрит ваше обращение.';

  @override
  String get commonClose => 'Закрыть';

  @override
  String get teacherTabDashboard => 'Обзор';

  @override
  String get dashUpcomingTitle => 'Ближайшие уроки';

  @override
  String get dashNoUpcoming => 'Ближайших уроков нет';

  @override
  String get dashMonthIncome => 'Доход за месяц';

  @override
  String get dashLessonsTotal => 'Всего уроков';

  @override
  String get walletTitle => 'Кошелёк';

  @override
  String get walletAvailable => 'Доступно';

  @override
  String walletFrozen(String amount) {
    return 'Заморожено: $amount';
  }

  @override
  String get payoutRequest => 'Запросить выплату';

  @override
  String get payoutAmountLabel => 'Сумма (сум)';

  @override
  String get payoutCardLabel => 'Номер карты';

  @override
  String get payoutMinHint => 'Минимум 50 000 сум';

  @override
  String get payoutErrorMin => 'Минимальная сумма — 50 000 сум';

  @override
  String get payoutErrorInsufficient => 'Недостаточно средств на кошельке';

  @override
  String get payoutErrorCard => 'Номер карты должен состоять из 16 цифр';

  @override
  String get payoutSuccess =>
      'Заявка принята. После подтверждения администратором деньги поступят на карту.';

  @override
  String get walletHistory => 'Последние операции';

  @override
  String get walletHistoryEmpty => 'Операций пока нет';

  @override
  String get txLessonIncome => 'Доход с урока';

  @override
  String get txPayout => 'Выплата';

  @override
  String get txPayoutFreeze => 'Заморожено под выплату';

  @override
  String get txPayoutUnfreeze => 'Разморозка';

  @override
  String get txRefundIn => 'Возврат';

  @override
  String get txBookingSpend => 'Оплата урока';

  @override
  String get txAdminAdjust => 'Корректировка';
}
