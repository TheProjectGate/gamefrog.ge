# AI Chat Service Module

Отдельный модуль для AI чата и комментариев, который может работать независимо от основного сервера.

## Структура

- `server.ts` - главный файл сервера
- `config/database.ts` - конфигурация базы данных
- `providers/` - модульная система AI провайдеров:
  - `types.ts` - общие типы и интерфейсы
  - `contextManager.ts` - менеджер контекста (история переписки)
  - `ProviderFactory.ts` - фабрика для создания провайдеров
  - `base/BaseProvider.ts` - базовый класс для провайдеров
  - `gemini/GeminiProvider.ts` - модуль Gemini
  - `openai/OpenAIProvider.ts` - модуль OpenAI
  - `deepseek/DeepSeekProvider.ts` - модуль DeepSeek
  - `anthropic/AnthropicProvider.ts` - модуль Anthropic (Claude)
- `routers/` - роутеры API:
  - `gemini.ts` - универсальный AI чат роутер (использует модульные провайдеры)
  - `chatMessages.ts` - управление сообщениями чата
  - `aiChatSettings.ts` - настройки AI чата
  - `aiQuotaErrors.ts` - логирование ошибок квоты
  - `comments.ts` - управление комментариями к продуктам
- `middleware/` - middleware для аутентификации и rate limiting
- `utils/` - утилиты для обработки ошибок

## Установка

```bash
cd modules/ai-chat-service
npm install
```

## Запуск

### Development режим
```bash
npm run dev
```

### Production режим
```bash
npm run build
npm start
```

## Конфигурация

Модуль использует те же переменные окружения из корня проекта:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - настройки базы данных
- `JWT_SECRET` - секрет для JWT токенов
- `GEMINI_API_KEY` - API ключ для Gemini (или настраивается через админку)
- `AI_CHAT_SERVICE_PORT` - порт для сервиса (по умолчанию 5434)

## API Endpoints

- `POST /api/gemini/chat` - отправка сообщения в AI чат
- `GET/POST/DELETE /api/chat-messages` - управление сообщениями чата
- `GET/PUT /api/ai-chat-settings` - настройки AI чата
- `GET /api/ai-chat-settings/chat-bubbles` - публичные настройки чат-баблов (включая настройки комментариев)
- `GET /api/ai-chat-settings/comments-settings` - публичные настройки комментариев
- `GET/POST/DELETE /api/ai-quota-errors` - управление ошибками квоты
- `GET/POST/PUT/DELETE /api/comments` - управление комментариями

## Настройки комментариев

В админке можно контролировать:
- `commentsAutoHideDuration` - время (в секундах), через которое комментарий автоматически исчезнет после появления. Диапазон: 1-300 секунд. По умолчанию: 10 секунд.

Комментарии появляются из аватарки чата и автоматически скрываются через указанное время.

## Модульная архитектура провайдеров

Все AI провайдеры реализованы как отдельные модули с единым интерфейсом. Каждый провайдер:

- **Поддерживает контекст** - автоматически читает и использует историю переписки с пользователем
- **Сохраняет контекст** - сохраняет все сообщения в базу данных для поддержания контекста
- **Единый интерфейс** - все провайдеры реализуют один и тот же интерфейс `AIProvider`

### Автоматическое переключение провайдеров

Система автоматически переключается между провайдерами при ошибках квоты:
1. Пытается использовать основной провайдер (настроенный в админке)
2. При ошибке квоты автоматически пробует другие доступные провайдеры
3. Порядок fallback: Gemini → OpenAI → DeepSeek → Anthropic

### Управление контекстом

`ContextManager` автоматически:
- Загружает историю переписки для каждого пользователя
- Добавляет текущее сообщение к истории
- Передает полный контекст в AI провайдер
- Сохраняет ответы AI в базу данных

### Добавление нового провайдера

Для добавления нового AI провайдера:

1. Создайте класс провайдера, наследующий `BaseProvider`:
```typescript
import { BaseProvider } from '../base/BaseProvider';
import { AIRequest, AIResponse } from '../types';

export class MyProvider extends BaseProvider {
  readonly name = 'myprovider';
  
  isConfigured(): boolean {
    return !!this.apiKey;
  }
  
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    // Ваша реализация
  }
  
  convertToStandardFormat(response: any): AIResponse {
    // Конвертация ответа в стандартный формат
  }
}
```

2. Добавьте провайдер в `ProviderFactory.ts`

## Использование в основном сервере

Модуль может быть запущен отдельно или интегрирован в основной сервер. Для интеграции добавьте проксирование запросов к этому сервису.