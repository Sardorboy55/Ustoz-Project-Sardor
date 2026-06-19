-- Обложки видео (картинки) лежат в бакете intro-videos, но он принимал только
-- видео-mime — картинки отклонялись («не удалось загрузить файл»). Разрешаем
-- image/* в этом же бакете.
update storage.buckets
  set allowed_mime_types = array[
    'video/mp4', 'video/quicktime', 'video/webm',
    'image/jpeg', 'image/png', 'image/webp'
  ]
  where id = 'intro-videos';
