# 🌍 Система интернационализации (i18n)

Эта система обеспечивает масштабируемую поддержку множественных языков на сайте.

## 📁 Структура

```
src/i18n/
├── config.ts                    # Конфигурация i18next
├── locales/
│   ├── en/
│   │   └── translation.json     # Английские переводы
│   └── ka/
│       └── translation.json     # Грузинские переводы
└── README.md                    # Эта документация
```

## 🚀 Использование

### В компонентах React

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <p>{t('home.subtitle')}</p>
    </div>
  );
};
```

### С параметрами

```tsx
const { t } = useTranslation();
<p>{t('footer.copyright', { year: 2024 })}</p>
```

### Переключение языка

```tsx
import useStore from '../store/useStore';
import { SupportedLanguage } from '../i18n/config';

const MyComponent = () => {
  const setLanguage = useStore(state => state.setLanguage);
  
  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };
  
  return (
    <button onClick={() => handleLanguageChange('ka')}>
      Switch to Georgian
    </button>
  );
};
```

## ➕ Добавление нового языка

### 1. Создайте файл переводов

Создайте новую папку в `src/i18n/locales/` с кодом языка (например, `ru` для русского):

```
src/i18n/locales/ru/translation.json
```

### 2. Скопируйте структуру из существующего языка

Скопируйте содержимое `en/translation.json` и переведите все строки.

### 3. Обновите конфигурацию

Откройте `src/i18n/config.ts` и добавьте:

```typescript
import ruTranslations from './locales/ru/translation.json';

export const SUPPORTED_LANGUAGES = ['en', 'ka', 'ru'] as const;

const resources = {
  en: {
    translation: enTranslations,
  },
  ka: {
    translation: kaTranslations,
  },
  ru: {
    translation: ruTranslations,
  },
};
```

### 4. Обновите LanguageSwitcher (опционально)

Если нужно изменить отображаемые названия языков, обновите `LANGUAGE_NAMES` в `src/components/LanguageSwitcher.tsx`:

```typescript
const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'EN',
  ka: 'KA',
  ru: 'RU',
};
```

## 📝 Структура переводов

Переводы организованы по разделам:

- `common` - Общие фразы (кнопки, действия)
- `header` - Элементы шапки сайта
- `footer` - Элементы подвала
- `home` - Главная страница
- `cart` - Корзина
- `wishlist` - Список желаний
- `sale` - Страница распродажи
- `browse` - Каталог
- `product` - Карточка товара
- `auth` - Авторизация
- `chat` - Чат-ассистент
- `admin` - Админ-панель
- `toast` - Уведомления

## 🔧 Технические детали

- **Библиотека**: `react-i18next` + `i18next`
- **Определение языка**: Автоматически из `localStorage` или языка браузера
- **Хранение**: Язык сохраняется в `localStorage` под ключом `i18nextLng`
- **Синхронизация**: Язык синхронизирован между Zustand store и i18next

## 💡 Советы

1. **Всегда используйте ключи переводов** вместо хардкода текста
2. **Группируйте переводы** по функциональным разделам
3. **Используйте параметры** для динамических значений (даты, числа)
4. **Проверяйте все ключи** при добавлении нового языка
5. **Используйте TypeScript** для автодополнения ключей (можно расширить типы)

## 🐛 Отладка

Если переводы не отображаются:

1. Проверьте, что файл переводов существует и правильно структурирован
2. Убедитесь, что язык добавлен в `SUPPORTED_LANGUAGES`
3. Проверьте консоль браузера на ошибки
4. Убедитесь, что `i18n/config.ts` импортирован в `index.tsx`

