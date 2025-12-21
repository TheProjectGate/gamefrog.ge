import { getApiBaseUrl } from './baseUrl';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface ChatRequest {
  contents: ChatMessage[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

export interface ChatResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
}

/**
 * Отправляет запрос к AI чату через сервер
 * Поддерживает несколько провайдеров: Gemini, OpenAI, DeepSeek, Anthropic
 */
export const chatWithAI = async (
  messages: ChatMessage[],
  systemInstruction?: string,
  context?: Record<string, any>,
  options?: { provider?: 'gemini' | 'openai' | 'deepseek' | 'anthropic' | 'custom'; model?: string }
): Promise<string> => {
  const apiBaseUrl = getApiBaseUrl();
  
  const requestBody: ChatRequest = {
    contents: messages,
    systemInstruction: systemInstruction
      ? {
          parts: [{ text: systemInstruction }],
        }
      : undefined,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  try {
    const response = await fetch(`${apiBaseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request: requestBody,
        context,
        provider: options?.provider,
        model: options?.model,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to chat with AI' }));
      const errorObj: any = new Error(error.message || 'Failed to chat with AI');
      errorObj.status = response.status;
      errorObj.response = { status: response.status };
      throw errorObj;
    }

    const data: ChatResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from AI');
    }

    const text = data.candidates[0].content.parts[0].text;
    return text || 'Sorry, I could not generate a response.';
  } catch (error: any) {
    console.error('[AI Chat API] Error:', error);
    
    // Сохраняем статус ошибки для правильной обработки
    if (error?.status) {
      const errorObj: any = new Error(error.message || 'Failed to chat with AI');
      errorObj.status = error.status;
      errorObj.response = error.response || { status: error.status };
      throw errorObj;
    }
    
    throw error;
  }
};

// Обратная совместимость: экспортируем старые названия
export type GeminiMessage = ChatMessage;
export type GeminiChatRequest = ChatRequest;
export type GeminiChatResponse = ChatResponse;
export const chatWithGemini = chatWithAI;

