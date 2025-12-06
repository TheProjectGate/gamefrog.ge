# Command Reference

Собраны основные команды, которые пригодятся при разработке, тестировании и сборке проекта.

## Development

```bash
# Полный стек (backend + watcher на сервере)
npm run dev

# Только фронтенд (Vite dev-server)
npm run dev:frontend

# Только backend
npm run dev:backend
```

## Backend Utilities

```bash
# Компиляция серверного TypeScript
npm run server:build

# Запуск собранного сервера (dist/server.js)
npm run server:start

# Проверка типов серверного кода
npm run server:type-check

# Создание администратора
npm run server:create-admin

# Освобождение занятого порта (пример для 5433)
npm run server:free-port 5433
```

## Tests

```bash
npm run test
npm run test:watch
```

## Frontend Build / Preview

```bash
npm run build        # продакшн-билд Vite
npm run preview      # просмотр собранного dist локально
```

## Capacitor / Android

```bash
# Синхронизировать dist с нативным проектом
npx cap sync android

# Открыть Android Studio с проектом
npx cap open android

# Создать/обновить Android-платформу (если удалили папку android)
npx cap add android
```

## Live Reload / Mobile Debug

```bash
# Запустить фронтенд на внешнем IP (для устройств/эмуляторов)
npm run dev:frontend -- --host

# Собрать и запустить Android c livereload (подставьте IP и порт dev-сервера)
npx cap run android --livereload --external http://192.168.0.42:5173
```

## Misc

```bash
# Генерация иконок (если потребуется)
npm run generate-icons
```

