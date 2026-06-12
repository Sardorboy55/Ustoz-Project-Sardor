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
  String get commonError => 'Произошла ошибка. Попробуйте ещё раз.';
}
