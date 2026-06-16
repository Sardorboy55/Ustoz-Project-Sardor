#!/bin/bash
# Обновить живой сайт одной командой.
# Использование:  bash ~/Desktop/Ustoz/deploy.sh "что я изменил"

cd ~/Desktop/Ustoz || { echo "Папка проекта не найдена"; exit 1; }

MSG="${1:-update}"

echo "1/3 Сохраняю изменения..."
git add -A
git commit -m "$MSG" || echo "  (нечего сохранять — иду дальше)"

echo "2/3 Отправляю на GitHub (ветка main)..."
git push origin HEAD:main || { echo "Ошибка пуша — проверь интернет/доступ"; exit 1; }

echo "3/3 Запускаю сборку на Vercel..."
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_4d31w4xwS1IsgnIx61geKwPpKMDe/zBQiQv5SAy" > /dev/null

echo ""
echo "✅ Готово! Через ~1-2 минуты сайт обновится:"
echo "   https://ustoz-web-two.vercel.app"
