-- ============================================================
-- USTOZ seed: app settings, categories, subjects, demo users
-- Demo data is for local/staging only. Fixed UUIDs for tests.
-- ============================================================

-- ---------- app_settings ----------
insert into app_settings (key, value) values
  ('pro_price',                 '14900000'),                -- 149 000 UZS (tiyin), placeholder
  ('free_monthly_lessons_limit','10'),
  ('free_max_subjects',         '1'),
  ('pro_max_subjects',          '5'),
  ('cancel_window_hours',       '12'),
  ('payout_hold_hours',         '24'),
  ('payout_min_amount',         '5000000'),                 -- 50 000 UZS (tiyin)
  ('acquiring_pct',             '2'),
  ('chat_masking_enabled',      'true'),
  ('package_ttl_months',        '6'),
  ('pro_search_boost',          '100'),
  ('pending_payment_ttl_min',   '15'),
  ('trial_free_duration_min',   '20'),
  ('no_show_wait_min',          '15'),
  ('xp_rules',        '{"lesson_done":50,"homework_done":20,"quiz_done":10,"review_left":5}'),
  ('level_thresholds','[0,100,500,1500,4000]'),
  ('level_names',     '{"uz":["Yangi boshlovchi","O''quvchi","Bilimdon","Usta","Guru"],"ru":["Новичок","Ученик","Знаток","Мастер","Гуру"]}'),
  ('platform_domains','["ustoz.uz"]')
on conflict (key) do update set value = excluded.value;

-- ---------- categories ----------
insert into categories (id, name_uz, name_ru, icon, sort, slug) values
  ('10000000-0000-4000-a000-000000000001', 'Tillar',                 'Языки',                'languages', 1, 'tillar'),
  ('10000000-0000-4000-a000-000000000002', 'Maktab fanlari',         'Школьные предметы',    'school',    2, 'maktab-fanlari'),
  ('10000000-0000-4000-a000-000000000003', 'IT va dasturlash',       'IT и программирование','code',      3, 'it'),
  ('10000000-0000-4000-a000-000000000004', 'Psixologiya va kouching','Психология и коучинг', 'brain',     4, 'psixologiya'),
  ('10000000-0000-4000-a000-000000000005', 'Biznes va moliya',       'Бизнес и финансы',     'briefcase', 5, 'biznes'),
  ('10000000-0000-4000-a000-000000000006', 'Ijod va musiqa',         'Творчество и музыка',  'music',     6, 'ijod-musiqa'),
  ('10000000-0000-4000-a000-000000000007', 'Sport va salomatlik',    'Спорт и здоровье',     'dumbbell',  7, 'sport'),
  ('10000000-0000-4000-a000-000000000008', 'Boshqa',                 'Другое',               'sparkles',  8, 'boshqa');

-- ---------- subjects ----------
insert into subjects (category_id, name_uz, name_ru, slug) values
  -- Languages
  ('10000000-0000-4000-a000-000000000001', 'Ingliz tili',   'Английский язык', 'ingliz-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Rus tili',      'Русский язык',    'rus-tili'),
  ('10000000-0000-4000-a000-000000000001', 'O''zbek tili',  'Узбекский язык',  'ozbek-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Arab tili',     'Арабский язык',   'arab-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Koreys tili',   'Корейский язык',  'koreys-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Nemis tili',    'Немецкий язык',   'nemis-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Xitoy tili',    'Китайский язык',  'xitoy-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Fransuz tili',  'Французский язык','fransuz-tili'),
  ('10000000-0000-4000-a000-000000000001', 'Turk tili',     'Турецкий язык',   'turk-tili'),
  -- School subjects
  ('10000000-0000-4000-a000-000000000002', 'Matematika',          'Математика',          'matematika'),
  ('10000000-0000-4000-a000-000000000002', 'Fizika',              'Физика',              'fizika'),
  ('10000000-0000-4000-a000-000000000002', 'Kimyo',               'Химия',               'kimyo'),
  ('10000000-0000-4000-a000-000000000002', 'Biologiya',           'Биология',            'biologiya'),
  ('10000000-0000-4000-a000-000000000002', 'Tarix',               'История',             'tarix'),
  ('10000000-0000-4000-a000-000000000002', 'DTM tayyorlov',       'Подготовка к ДТМ',    'dtm-tayyorlov'),
  ('10000000-0000-4000-a000-000000000002', 'IELTS tayyorlov',     'Подготовка к IELTS',  'ielts'),
  ('10000000-0000-4000-a000-000000000002', 'SAT tayyorlov',       'Подготовка к SAT',    'sat'),
  -- IT
  ('10000000-0000-4000-a000-000000000003', 'Python',              'Python',              'python'),
  ('10000000-0000-4000-a000-000000000003', 'Veb-dasturlash',      'Веб-разработка',      'veb-dasturlash'),
  ('10000000-0000-4000-a000-000000000003', 'Mobil dasturlash',    'Мобильная разработка','mobil-dasturlash'),
  ('10000000-0000-4000-a000-000000000003', 'Dizayn',              'Дизайн',              'dizayn'),
  ('10000000-0000-4000-a000-000000000003', 'Excel',               'Excel',               'excel'),
  ('10000000-0000-4000-a000-000000000003', '1C',                  '1C',                  '1c'),
  -- Psychology & coaching
  ('10000000-0000-4000-a000-000000000004', 'Psixolog maslahati',  'Консультация психолога','psixolog'),
  ('10000000-0000-4000-a000-000000000004', 'Oilaviy psixolog',    'Семейный психолог',   'oilaviy-psixolog'),
  ('10000000-0000-4000-a000-000000000004', 'Karyera kouchi',      'Карьерный коуч',      'karyera-kouch'),
  -- Business & finance
  ('10000000-0000-4000-a000-000000000005', 'Buxgalteriya',        'Бухгалтерия',         'buxgalteriya'),
  ('10000000-0000-4000-a000-000000000005', 'Marketing',           'Маркетинг',           'marketing'),
  ('10000000-0000-4000-a000-000000000005', 'Sotuv',               'Продажи',             'sotuv'),
  ('10000000-0000-4000-a000-000000000005', 'Soliqlar',            'Налоги',              'soliqlar'),
  -- Creativity & music
  ('10000000-0000-4000-a000-000000000006', 'Gitara',              'Гитара',              'gitara'),
  ('10000000-0000-4000-a000-000000000006', 'Fortepiano',          'Фортепиано',          'fortepiano'),
  ('10000000-0000-4000-a000-000000000006', 'Vokal',               'Вокал',               'vokal'),
  ('10000000-0000-4000-a000-000000000006', 'Rasm',                'Рисование',           'rasm'),
  ('10000000-0000-4000-a000-000000000006', 'Fotografiya',         'Фотография',          'fotografiya'),
  -- Sport & health
  ('10000000-0000-4000-a000-000000000007', 'Fitnes',              'Фитнес-тренер',       'fitnes'),
  ('10000000-0000-4000-a000-000000000007', 'Yoga',                'Йога',                'yoga'),
  ('10000000-0000-4000-a000-000000000007', 'Sog''lom ovqatlanish','Питание',             'ovqatlanish'),
  -- Other
  ('10000000-0000-4000-a000-000000000008', 'Boshqa yo''nalish',   'Другое направление',  'boshqa');

-- ---------- demo users (local/staging only) ----------
-- on_auth_user_created trigger creates profiles + gamification rows.
insert into auth.users
  (instance_id, id, aud, role, phone, phone_confirmed_at, encrypted_password,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001',
   'authenticated', 'authenticated', '998900000001', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002',
   'authenticated', 'authenticated', '998900000002', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000003',
   'authenticated', 'authenticated', '998900000003', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000004',
   'authenticated', 'authenticated', '998900000004', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000005',
   'authenticated', 'authenticated', '998900000005', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  -- demo admin
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000aa',
   'authenticated', 'authenticated', '998900000099', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now()),
  -- demo student
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000ff',
   'authenticated', 'authenticated', '998900000010', now(), '',
   '{"provider":"phone","providers":["phone"]}', '{}', now(), now());

update profiles set full_name = 'Aziza Karimova',  is_teacher = true where id = '00000000-0000-4000-a000-000000000001';
update profiles set full_name = 'Bobur Rahimov',   is_teacher = true where id = '00000000-0000-4000-a000-000000000002';
update profiles set full_name = 'Nilufar Yusupova',is_teacher = true where id = '00000000-0000-4000-a000-000000000003';
update profiles set full_name = 'Sardor Alimov',   is_teacher = true where id = '00000000-0000-4000-a000-000000000004';
update profiles set full_name = 'Madina Tosheva',  is_teacher = true where id = '00000000-0000-4000-a000-000000000005';
update profiles set full_name = 'Temur (admin)',   is_admin  = true where id = '00000000-0000-4000-a000-0000000000aa';
update profiles set full_name = 'Demo O''quvchi'                    where id = '00000000-0000-4000-a000-0000000000ff';

-- ---------- teacher profiles ----------
-- rating/lessons_done are demo values for catalog display & sorting tests.
insert into teacher_profiles
  (user_id, slug, headline_uz, headline_ru, bio_uz, bio_ru,
   experience_years, teaching_langs, tier, tier_expires_at, search_boost,
   rating_avg, rating_count, lessons_done)
values
  ('00000000-0000-4000-a000-000000000001', 'aziza-karimova',
   'IELTS 8.5 | Ingliz tili 7 yillik tajriba',
   'IELTS 8.5 | Английский язык, 7 лет опыта',
   'Salom! Men Aziza, IELTS 8.5 sertifikatiga egaman. CEFR B2–C1 darajaga tayyorlayman. Darslarim interaktiv: speaking club, mock testlar va shaxsiy reja.',
   'Привет! Я Азиза, сертификат IELTS 8.5. Готовлю к B2–C1. Уроки интерактивные: speaking club, пробные тесты и личный план.',
   7, '{uz,ru,en}', 'pro', now() + interval '1 month', 100, 4.90, 127, 450),
  ('00000000-0000-4000-a000-000000000002', 'bobur-rahimov',
   'Matematika va DTM tayyorlov | Oliy toifali o''qituvchi',
   'Математика и подготовка к ДТМ | Учитель высшей категории',
   'Matematikadan 12 yillik tajribaga ega o''qituvchiman. DTM ga tayyorlovda 90% o''quvchilarim grant asosida o''qishga kirgan.',
   'Преподаю математику 12 лет. 90% моих учеников поступили на грант после подготовки к ДТМ.',
   12, '{uz,ru}', 'pro', now() + interval '1 month', 100, 4.80, 94, 612),
  ('00000000-0000-4000-a000-000000000003', 'nilufar-yusupova',
   'Rus tili — noldan erkin so''zlashuvgacha',
   'Русский язык — с нуля до свободной речи',
   'Rus tilini o''zbek tilida tushuntiraman. Grammatika, so''zlashuv va talaffuz ustida ishlaymiz. Boshlang''ich daraja uchun maxsus dastur.',
   'Объясняю русский на узбекском. Работаем над грамматикой, разговорной речью и произношением. Специальная программа для начинающих.',
   5, '{uz,ru}', 'free', null, 0, 4.70, 38, 156),
  ('00000000-0000-4000-a000-000000000004', 'sardor-alimov',
   'Python va backend | Amaliy loyihalar bilan',
   'Python и backend | На реальных проектах',
   'Senior dasturchi, 8 yillik tajriba. Python, Django, ma''lumotlar bazalari. Darslarda real loyiha quramiz — portfolio bilan chiqasiz.',
   'Senior-разработчик, 8 лет опыта. Python, Django, базы данных. На уроках строим реальный проект — выйдете с портфолио.',
   8, '{uz,ru,en}', 'pro', now() + interval '1 month', 100, 5.00, 61, 203),
  ('00000000-0000-4000-a000-000000000005', 'madina-tosheva',
   'Psixolog | Xavotir va stress bilan ishlash',
   'Психолог | Работа с тревогой и стрессом',
   'Klinik psixolog, 6 yillik amaliyot. Xavotir, stress, munosabatlar masalalarida yordam beraman. Maxfiylik kafolatlanadi.',
   'Клинический психолог, 6 лет практики. Помогаю с тревогой, стрессом, вопросами отношений. Конфиденциальность гарантирована.',
   6, '{uz,ru}', 'free', null, 0, 4.95, 52, 178);

insert into wallets (teacher_id) values
  ('00000000-0000-4000-a000-000000000001'),
  ('00000000-0000-4000-a000-000000000002'),
  ('00000000-0000-4000-a000-000000000003'),
  ('00000000-0000-4000-a000-000000000004'),
  ('00000000-0000-4000-a000-000000000005');

-- ---------- teacher subjects & prices (tiyin) ----------
insert into teacher_subjects
  (teacher_id, subject_id, price_30, price_60, price_90,
   trial_free_enabled, trial_discount_pct, pkg5_discount_pct, pkg10_discount_pct, pkg20_discount_pct)
values
  -- Aziza: English + IELTS (PRO, 2 subjects)
  ('00000000-0000-4000-a000-000000000001', (select id from subjects where slug = 'ingliz-tili'),
   4500000, 8000000, 11000000, true, 30, 5, 10, 15),
  ('00000000-0000-4000-a000-000000000001', (select id from subjects where slug = 'ielts'),
   null, 9000000, 12500000, false, 20, 5, 10, 15),
  -- Bobur: Math + DTM (PRO, 2 subjects)
  ('00000000-0000-4000-a000-000000000002', (select id from subjects where slug = 'matematika'),
   3500000, 6000000, 8500000, true, 25, 5, 10, 15),
  ('00000000-0000-4000-a000-000000000002', (select id from subjects where slug = 'dtm-tayyorlov'),
   null, 7000000, 9500000, false, 0, 5, 10, 15),
  -- Nilufar: Russian (FREE, 1 subject)
  ('00000000-0000-4000-a000-000000000003', (select id from subjects where slug = 'rus-tili'),
   3000000, 5000000, 7000000, true, 20, 5, 10, 15),
  -- Sardor: Python (PRO)
  ('00000000-0000-4000-a000-000000000004', (select id from subjects where slug = 'python'),
   null, 10000000, 14000000, true, 0, 5, 10, 15),
  -- Madina: Psychology (FREE, 1 subject)
  ('00000000-0000-4000-a000-000000000005', (select id from subjects where slug = 'psixolog'),
   null, 15000000, 21000000, false, 15, 5, 10, 15);

-- ---------- weekly availability (minutes from midnight, Asia/Tashkent) ----------
-- Mon–Fri for everyone with varied windows; weekends for some.
insert into availability_rules (teacher_id, weekday, start_min, end_min)
select t.id, w.weekday, s.start_min, s.end_min
from (values
  ('00000000-0000-4000-a000-000000000001'::uuid),
  ('00000000-0000-4000-a000-000000000002'::uuid),
  ('00000000-0000-4000-a000-000000000003'::uuid),
  ('00000000-0000-4000-a000-000000000004'::uuid),
  ('00000000-0000-4000-a000-000000000005'::uuid)
) t(id)
cross join (values (1),(2),(3),(4),(5)) w(weekday)
cross join (values (540, 780), (840, 1080)) s(start_min, end_min);  -- 09:00–13:00, 14:00–18:00

-- Saturday mornings for Aziza & Sardor
insert into availability_rules (teacher_id, weekday, start_min, end_min) values
  ('00000000-0000-4000-a000-000000000001', 6, 600, 840),   -- 10:00–14:00
  ('00000000-0000-4000-a000-000000000004', 6, 600, 840);
