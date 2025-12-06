# 💬 Система чата GameFrog

## 📁 Структура

```
src/chat/
├── types/              # Типы и интерфейсы
├── animations/         # Система анимаций
├── avatars/           # Аватары персонажей
│   ├── base/          # Базовые компоненты
│   └── kratos/        # Конфигурация Кратоса
├── dialogues/         # Система диалогов
└── ai/                # Адаптеры ИИ (будущее)
```

## 🚀 Быстрый старт

### Использование чата

```tsx
import ChatAssistant from './components/ChatAssistant';

// С аватаром по умолчанию (Кратос)
<ChatAssistant greetingTrigger={trigger} />

// С конкретным аватаром
<ChatAssistant avatarId="kratos" greetingTrigger={trigger} />
```

### Добавление нового аватара

1. **Создайте папку для аватара:**
```
src/chat/avatars/your-avatar/
├── your-avatar.config.ts
└── your-avatar.dialogues.ts (опционально)
```

2. **Создайте конфигурацию:**
```typescript
import { AvatarConfig } from '../../types';
import idleSprite from '../../../path/to/idle.png';
import talkSprite from '../../../path/to/talk.png';

export const yourAvatarConfig: AvatarConfig = {
  id: 'your-avatar',
  name: 'your-avatar',
  displayName: 'Имя Персонажа',
  sprites: {
    idle: idleSprite,
    talk: talkSprite,
  },
  animations: {
    idle: {
      frameDuration: 900,
      frameColumns: 5,
      frameRows: 4,
      frameCount: 20,
    },
    talk: {
      frameDuration: 450,
      frameColumns: 5,
      frameRows: 4,
      frameCount: 20,
    },
  },
  dialogueRules: [
    {
      patterns: ['привет'],
      response: 'Привет!',
      priority: 10,
    },
  ],
  greeting: 'Приветственное сообщение',
};
```

3. **Зарегистрируйте аватара:**
```typescript
import { AvatarRegistry } from '../chat/avatars/base/AvatarRegistry';
import { yourAvatarConfig } from './your-avatar/your-avatar.config';

AvatarRegistry.register(yourAvatarConfig);
```

## 📝 Правила диалогов

### Простое правило:
```typescript
{
  patterns: ['скидка', 'sale'],
  response: 'Скидки горят!',
  priority: 10,
}
```

### Правило с функцией:
```typescript
{
  patterns: [],
  response: (context) => {
    const replies = ['Ответ 1', 'Ответ 2'];
    return replies[Math.floor(Math.random() * replies.length)];
  },
  priority: 1,
}
```

### Правило с контекстом:
```typescript
{
  patterns: ['админ'],
  response: 'Админка доступна',
  priority: 5,
  context: ['userRole'], // Требует наличие userRole в контексте
}
```

## 🎨 Коррекция кадров

Если какой-то кадр анимации выходит за рамки:

```typescript
frameCorrections: [
  {
    frameIndex: 11,        // Номер кадра (0-based)
    offsetX: 0,            // Смещение по X
    offsetY: 4,            // Смещение по Y
    animationType: 'talk',  // Для какой анимации (опционально)
  },
]
```

## 🔮 Будущие возможности

- ✅ Система аватаров
- ✅ Система диалогов
- ✅ Система анимаций
- ⏳ Интеграция ИИ
- ⏳ Эмоции аватаров
- ⏳ Множественные анимации

## 📚 API

### AvatarRegistry
```typescript
// Получить конфиг
const config = AvatarRegistry.get('kratos');

// Зарегистрировать новый
AvatarRegistry.register(newConfig);

// Получить все
const all = AvatarRegistry.getAll();
```

### DialogueEngine
```typescript
const engine = new DialogueEngine(rules);
const response = engine.generateResponse('привет', context);
```

### Avatar Component
```tsx
<Avatar
  config={avatarConfig}
  talking={isTalking}
  className="custom-class"
/>
```

