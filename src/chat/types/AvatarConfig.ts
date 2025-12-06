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
}

/**
 * Сообщение в чате
 */
export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
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

