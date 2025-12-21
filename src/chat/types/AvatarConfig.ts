/**
 * Конфигурация анимации
 */
export interface AnimationConfig {
  frameDuration: number;
  frameColumns: number;
  frameRows: number;
  frameCount: number;
  frameSize?: number;
}

/**
 * Коррекция для проблемных кадров
 */
export interface FrameCorrection {
  frameIndex: number;
  offsetX?: number;
  offsetY?: number;
  animationType?: 'idle' | 'talk' | string;
}

/**
 * Правило диалога
 */
export interface DialogueRule {
  patterns: string[];
  response: string | ((context?: ChatContext) => string);
  priority: number;
  context?: string[];
  emotion?: string;
}

/**
 * Контекст чата
 */
export interface ChatContext {
  messages: Message[];
  userRole?: string;
  currentView?: string;
  timestamp: number;
  translate?: (key: string, options?: Record<string, unknown>) => string;
  language?: string; // Язык интерфейса (например, 'en', 'ka', 'ru')
  avatarSystemPrompt?: string; // System prompt из конфигурации аватара
  // Расширенный контекст для ИИ
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  userPhone?: string;
  userAddress?: string;
  userAvatar?: number;
  userRegistrationDate?: string;
  purchaseHistory?: Array<{
    id: number;
    total: number;
    createdAt: string;
    products: Array<{ name: string; price: number }>;
  }>;
  previousQuestions?: string[]; // Список уже заданных вопросов, чтобы не повторять их
  products?: Array<{
    id: number;
    name: string;
    price: number;
    discountPercent?: number;
    tags?: string[];
    genre?: string[];
  }>;
  activeOffers?: Array<{
    id: number;
    discountPercent: number;
    endsAt: string;
    productIds?: number[];
  }>;
  wishlist?: number[];
}

/**
 * Предложенное действие в сообщении
 */
export interface PendingAction {
  type: 'ADD_TO_CART' | 'ADD_TO_WISHLIST';
  productId: number;
  productName?: string;
}

/**
 * Сообщение в чате
 */
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  pendingActions?: PendingAction[]; // Предложенные действия, ожидающие подтверждения
}

/**
 * Конфигурация ИИ
 */
export interface AIConfig {
  enabled: boolean;
  provider?: 'openai' | 'anthropic' | 'local';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Полная конфигурация аватара
 */
export interface AvatarConfig {
  id: string;
  name: string;
  displayName: string;
  sprites: {
    idle: string;
    talk: string;
    [emotion: string]: string;
  };
  animations: {
    idle: AnimationConfig;
    talk: AnimationConfig;
    [key: string]: AnimationConfig;
  };
  frameCorrections?: FrameCorrection[];
  dialogueRules: DialogueRule[];
  aiConfig?: AIConfig;
  greeting?: string | (() => string);
  backgroundImage?: string;
  avatarScale?: number;
}

