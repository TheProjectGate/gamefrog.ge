# Миграции базы данных

## Применение миграций

### Миграция для порядка секций главной страницы

Для применения миграции выполните:

```bash
# Windows PowerShell
mysql -u root -p gamefrog_db < server/migrations/add_home_sections_order.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла add_home_sections_order.sql и выполните его
```

Миграция создаст таблицу `home_sections_order` и заполнит её значениями по умолчанию.

### Миграция для настроек платежных систем

Для применения миграции выполните:

```bash
# Windows PowerShell
mysql -u root -p gamefrog_db < server/migrations/add_payment_settings.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла add_payment_settings.sql и выполните его
```

Миграция создаст таблицу `payment_settings` и добавит конфигурацию UniPay по умолчанию (отключенную).

**Важно:** Если вы видите сообщение "No payment providers configured" в админ-панели, выполните эту миграцию.

### Миграция для настроек пользователей

Для применения миграции выполните:

```bash
# Используя npm скрипт (рекомендуется)
npm run server:migrate-user-settings

# Или через MySQL напрямую
mysql -u root -p gamefrog_db < server/migrations/add_user_settings.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла add_user_settings.sql и выполните его
```

Миграция создаст таблицу `user_settings` для хранения пользовательских настроек, включая цвета индикаторов уведомлений.

### Миграция для сообщений пользователей

Для применения миграции выполните:

```bash
# Используя npm скрипт (рекомендуется)
npm run server:migrate-user-messages

# Или через MySQL напрямую
mysql -u root -p gamefrog_db < server/migrations/add_user_messages.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла add_user_messages.sql и выполните его
```

Миграция создаст таблицу `user_messages` для хранения всех сообщений пользователей (чеки, уведомления и т.д.).

### Миграция для контактной информации пользователей

Для применения миграции выполните:

```bash
# Используя npm скрипт (рекомендуется)
npm run server:migrate-user-contact

# Или через MySQL напрямую
mysql -u root -p gamefrog_db < server/migrations/add_user_contact_info.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла add_user_contact_info.sql и выполните его
```

Миграция добавит поля `phone` и `address` в таблицу `users` для хранения контактных данных пользователей.

### Миграция для исправления путей к изображениям

Для применения миграции выполните:

```bash
# Используя npm скрипт (рекомендуется)
npm run server:migrate-fix-image-urls

# Или через MySQL напрямую
mysql -u root -p gamefrog_db < server/migrations/fix_image_urls.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла fix_image_urls.sql и выполните его
```

Миграция исправит пути к изображениям в таблице `products`, заменив `src/img/` на `/img/` для корректного отображения в браузере.

### Миграция для добавления YouTube Video ID

Для применения миграции выполните:

```bash
# Используя npm скрипт (рекомендуется)
npm run server:migrate-youtube-video-id

# Или через MySQL напрямую
mysql -u root -p gamefrog_db < server/migrations/add_youtube_video_id.sql

# Или через MySQL Workbench / phpMyAdmin
# Скопируйте содержимое файла add_youtube_video_id.sql и выполните его
```

Миграция добавит поле `youtube_video_id` в таблицу `products` для хранения YouTube Video ID, что позволит отображать видео в модальном окне продукта.

