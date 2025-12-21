import { Router, Request, Response, NextFunction } from 'express';
import { apiLimiter } from '../middleware/rateLimiter';
import { AppError } from '../utils/errorHandler';
import { pool } from '../server';

const router = Router();

interface AIChatRequestBody {
  provider?: string;
  model?: string;
  request: {
    contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }>;
    systemInstruction?: {
      parts: Array<{ text: string }>;
    };
    generationConfig?: {
      temperature?: number;
      topK?: number;
      topP?: number;
      maxOutputTokens?: number;
    };
  };
  context?: Record<string, any>;
}

/**
 * Получает настройки AI чата из базы данных
 */
async function getAIChatSettings() {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM ai_chat_settings WHERE id = 1'
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0];
  } catch (error) {
    console.error('[getAIChatSettings] Error:', error);
    return null;
  }
}

/**
 * Получает список доступных моделей Gemini
 */
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(listUrl);
    
    if (!response.ok) {
      console.warn('[Gemini] Failed to list models, using fallback list');
      return [];
    }
    
    const data = await response.json() as any;
    const models = data.models || [];
    
    // Фильтруем модели, которые поддерживают generateContent
    const supportedModels = models
      .filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') || 
        m.supportedMethods?.includes('generateContent')
      )
      .map((m: any) => m.name?.replace('models/', '') || '')
      .filter((name: string) => name.length > 0);
    
    console.log(`[Gemini] Found ${supportedModels.length} available models:`, supportedModels);
    return supportedModels;
  } catch (error) {
    console.error('[Gemini] Error listing models:', error);
    return [];
  }
}

/**
 * POST /api/ai/chat
 * Универсальный роутер для всех AI провайдеров
 */
router.post(
  '/chat',
  apiLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { request, context, provider: providerOverride, model: modelOverride } = req.body as AIChatRequestBody;

      if (!request || !request.contents || !Array.isArray(request.contents)) {
        throw new AppError('Invalid request format', 400);
      }

      // Получаем настройки из базы данных
      const settings = await getAIChatSettings();
      const providerRaw = providerOverride || settings?.provider || 'gemini';
      const provider = typeof providerRaw === 'string'
        ? providerRaw.trim().toLowerCase()
        : 'gemini';
      const model = modelOverride || settings?.model || 'gemini-2.5-flash';

      const validProviders = ['gemini', 'openai', 'deepseek', 'anthropic', 'custom'];
      if (!validProviders.includes(provider)) {
        throw new AppError(`Invalid provider "${provider}". Must be one of: ${validProviders.join(', ')}`, 400);
      }

      // Утилита получения ключа по провайдеру
      const getApiKey = (p: string): string | undefined => {
        if (p === 'gemini') return settings?.gemini_api_key || process.env.GEMINI_API_KEY;
        if (p === 'openai') return settings?.openai_api_key || process.env.OPENAI_API_KEY;
        if (p === 'deepseek') return settings?.deepseek_api_key || process.env.DEEPSEEK_API_KEY;
        if (p === 'anthropic') return settings?.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
        if (p === 'custom') return settings?.custom_provider_api_key;
        return undefined;
      };

      // Приоритет: запрошенный провайдер, затем fallback (openai -> gemini) если ключи есть.
      const providerOrder = Array.from(
        new Set([
          provider,
          ...(provider === 'gemini' ? ['openai'] : []),
          ...(provider === 'openai' ? ['gemini'] : []),
        ])
      );

      // Явно проверяем ключ для первичного провайдера и не замалчиваем отсутствие
      const primaryKey = getApiKey(providerOrder[0]);
      if (!primaryKey) {
        throw new AppError(
          `${providerOrder[0].charAt(0).toUpperCase() + providerOrder[0].slice(1)} API is not configured. Please set API key in admin settings or environment variables.`,
          503
        );
      }

      const buildGeminiResponse = async (apiKey: string) => {
        // Используем модель из настроек или из контекста запроса, или по умолчанию
        // Маппинг моделей для совместимости с API
        // Актуальные модели Gemini (2024-2025)
        const modelMapping: Record<string, string> = {
          'gemini-1.5-flash': 'gemini-2.5-flash', // Обновляем на актуальную версию
          'gemini-1.5-pro': 'gemini-2.5-flash',   // Используем flash как fallback
          'gemini-pro': 'gemini-2.5-flash',       // Обновляем старую модель
          'gemini-2.5-flash': 'gemini-2.5-flash',
          'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
        };
        
        const rawModel = model || 'gemini-2.5-flash'; // Используем актуальную модель по умолчанию
        // Если модель не из семейства Gemini (например, gpt-4o при fallback), принудительно ставим gemini-2.5-flash
        let geminiModel = rawModel.startsWith('gemini') ? rawModel : 'gemini-2.5-flash';
        geminiModel = modelMapping[geminiModel] || geminiModel;
        
        // Пробуем сначала v1, если не работает - fallback на v1beta
        let apiVersion = 'v1';
        let url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${geminiModel}:generateContent?key=${apiKey}`;
        
        console.log(`[Gemini] Attempting model: ${geminiModel}, API version: ${apiVersion}`);

        // Подготавливаем запрос для Gemini
        // В REST API используется snake_case, а не camelCase
        const geminiRequest: any = {
          contents: request.contents,
        };

        // Gemini REST expects snake_case system_instruction
        if (request.systemInstruction) {
          geminiRequest.system_instruction = request.systemInstruction;
        }

        // generationConfig остается как есть (поддерживается в обоих форматах)
        if (request.generationConfig) {
          geminiRequest.generationConfig = request.generationConfig;
        }

        // Список вариантов для попыток (версия API, модель)
        // Используем актуальные модели из Google AI Studio
        const standardVariants = [
          { version: 'v1beta', model: geminiModel }, // Модель из настроек
          { version: 'v1', model: geminiModel },
          { version: 'v1beta', model: 'gemini-2.5-flash' },      // Основная актуальная модель
          { version: 'v1', model: 'gemini-2.5-flash' },
          { version: 'v1beta', model: 'gemini-2.5-flash-lite' }, // Легкая версия
          { version: 'v1', model: 'gemini-2.5-flash-lite' },
          { version: 'v1beta', model: 'gemini-1.5-flash' },      // Fallback на старую версию
          { version: 'v1', model: 'gemini-1.5-flash' },
        ];
        
        // Отправляем запрос к Gemini API с fallback механизмом
        let geminiResponse: globalThis.Response | null = null;
        let lastError: any = null;
        let tryVariants = standardVariants;
        
        for (const variant of tryVariants) {
          try {
            const tryUrl = `https://generativelanguage.googleapis.com/${variant.version}/models/${variant.model}:generateContent?key=${apiKey}`;
            console.log(`[Gemini] Trying: ${variant.version}/models/${variant.model}`);
            
            const testResponse: globalThis.Response = await fetch(tryUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(geminiRequest),
            });
            
            if (testResponse.ok) {
              console.log(`[Gemini] Success with ${variant.version}/models/${variant.model}`);
              geminiResponse = testResponse;
              break; // Успешно, выходим из цикла
            }
            
            // Если получили 404, пробуем следующий вариант
            if (testResponse.status === 404) {
              const errorData = await testResponse.json().catch(() => ({})) as any;
              console.warn(`[Gemini] Model ${variant.model} not found in ${variant.version}, trying next variant...`);
              lastError = errorData;
              continue;
            }
            
            // Для ошибок квоты логируем, но не показываем пользователю
            if (testResponse.status === 429 || testResponse.status === 503) {
              const errorData = await testResponse.json().catch(() => ({})) as any;
              const errorMessage = errorData?.error?.message || 'AI quota exceeded';
              
              // Логируем ошибку квоты в базу данных
              try {
                await pool.query(
                  `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
                   VALUES (?, ?, NOW())`,
                  [errorMessage, (req as any).user?.email || null]
                );
              } catch (logError) {
                console.error('[Gemini] Failed to log quota error:', logError);
              }
              
              // Возвращаем общее сообщение без деталей ошибки
              throw new AppError(
                'AI service is temporarily unavailable. Please try again later.',
                503
              );
            }
            
            // Для других ошибок сразу выбрасываем
            const errorData = await testResponse.json().catch(() => ({})) as any;
            throw new AppError(
              errorData?.error?.message || 'Failed to get response from Gemini',
              testResponse.status
            );
          } catch (fetchError: any) {
            if (fetchError instanceof AppError) {
              throw fetchError;
            }
            lastError = fetchError;
            // Продолжаем пробовать следующие варианты
            continue;
          }
        }
        
        // Если все стандартные варианты не сработали, пробуем получить список доступных моделей
        if (!geminiResponse || !geminiResponse.ok) {
          console.log('[Gemini] Standard models failed, fetching available models...');
          const availableModels = await getAvailableGeminiModels(apiKey);
          
          if (availableModels.length > 0) {
            // Пробуем доступные модели
            const dynamicVariants: Array<{ version: string; model: string }> = [];
            for (const modelName of availableModels.slice(0, 5)) { // Ограничиваем до 5 моделей
              dynamicVariants.push({ version: 'v1beta', model: modelName });
              dynamicVariants.push({ version: 'v1', model: modelName });
            }
            
            console.log(`[Gemini] Trying ${dynamicVariants.length} dynamically discovered models...`);
            
            for (const variant of dynamicVariants) {
              try {
                const tryUrl = `https://generativelanguage.googleapis.com/${variant.version}/models/${variant.model}:generateContent?key=${apiKey}`;
                console.log(`[Gemini] Trying: ${variant.version}/models/${variant.model}`);
                
                const testResponse: globalThis.Response = await fetch(tryUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(geminiRequest),
                });
                
                if (testResponse.ok) {
                  console.log(`[Gemini] Success with ${variant.version}/models/${variant.model}`);
                  geminiResponse = testResponse;
                  break;
                }
                
                if (testResponse.status === 404) {
                  continue;
                }
                
                // Для ошибок квоты логируем, но не показываем пользователю
                if (testResponse.status === 429 || testResponse.status === 503) {
                  const errorData = await testResponse.json().catch(() => ({})) as any;
                  const errorMessage = errorData?.error?.message || 'AI quota exceeded';
                  
                  // Логируем ошибку квоты в базу данных
                  try {
                    await pool.query(
                      `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
                       VALUES (?, ?, NOW())`,
                      [errorMessage, (req as any).user?.email || null]
                    );
                  } catch (logError) {
                    console.error('[Gemini] Failed to log quota error:', logError);
                  }
                  
                  // Возвращаем общее сообщение без деталей ошибки
                  throw new AppError(
                    'AI service is temporarily unavailable. Please try again later.',
                    503
                  );
                }
                
                const errorData = await testResponse.json().catch(() => ({})) as any;
                throw new AppError(
                  errorData?.error?.message || 'Failed to get response from Gemini',
                  testResponse.status
                );
              } catch (fetchError: any) {
                if (fetchError instanceof AppError) {
                  throw fetchError;
                }
                continue;
              }
            }
          }
        }
        
        // Если все варианты не сработали
        if (!geminiResponse || !geminiResponse.ok) {
          console.error('[Gemini API] All variants failed. Last error:', lastError);
          
          // Проверяем, является ли это ошибкой квоты
          const isQuotaError = lastError?.error?.message?.toLowerCase().includes('quota') || 
                              lastError?.error?.message?.toLowerCase().includes('rate limit') ||
                              lastError?.status === 429;
          
          if (isQuotaError) {
            const errorMessage = lastError?.error?.message || 'AI quota exceeded';
            
            // Логируем ошибку квоты в базу данных
            try {
              await pool.query(
                `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
                 VALUES (?, ?, NOW())`,
                [errorMessage, (req as any).user?.email || null]
              );
            } catch (logError) {
              console.error('[Gemini] Failed to log quota error:', logError);
            }
            
            // Возвращаем общее сообщение без деталей ошибки
            throw new AppError(
              'AI service is temporarily unavailable. Please try again later.',
              503
            );
          }
          
          throw new AppError(
            lastError?.error?.message || 'Failed to get response from Gemini. Please check your API key and model name. Make sure your API key has access to Gemini models.',
            503
          );
        }
        
        // Используем успешный ответ
        const response: globalThis.Response = geminiResponse;

        const data = await response.json() as any;

        // Форматируем ответ в ожидаемом формате
        if (!data?.candidates || data.candidates.length === 0) {
          throw new AppError('No response from Gemini', 500);
        }

        const candidate = data.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.warn('[Gemini] Finish reason:', candidate.finishReason);
        }

        const text =
          candidate.content?.parts?.[0]?.text ||
          "I'm sorry, I couldn't generate a response.";

        return {
          candidates: [
            {
              content: {
                parts: [{ text }],
              },
              finishReason: candidate.finishReason || 'STOP',
            },
          ],
        };
      };

      const buildOpenAIResponse = async (apiKey: string) => {
        // Поддержка OpenAI Chat Completions API
        const openaiModel = model || 'gpt-4o-mini';

        // Конвертация формата Gemini в формат OpenAI
        const systemMessage =
          request.systemInstruction?.parts
            ?.map((p) => p.text || '')
            .filter(Boolean)
            .join('\n') || undefined;

        const messages = [
          ...(systemMessage
            ? [{ role: 'system', content: systemMessage }]
            : []),
          ...request.contents.map((item) => ({
            role: item.role === 'user' ? 'user' : 'assistant',
            content:
              item.parts
                ?.map((p) => p.text || '')
                .filter(Boolean)
                .join('\n') || '',
          })),
        ];

        const openaiRequest: any = {
          model: openaiModel,
          messages,
        };

        // Маппинг настроек генерации
        if (request.generationConfig) {
          const { temperature, topP, maxOutputTokens } =
            request.generationConfig;
          if (typeof temperature === 'number') {
            openaiRequest.temperature = temperature;
          }
          if (typeof topP === 'number') {
            openaiRequest.top_p = topP;
          }
          if (typeof maxOutputTokens === 'number') {
            openaiRequest.max_tokens = maxOutputTokens;
          }
        }

        const response: globalThis.Response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(openaiRequest),
          }
        );

        if (response.status === 429 || response.status === 503) {
          const errorData = (await response.json().catch(() => ({}))) as any;
          const errorMessage =
            errorData?.error?.message || 'AI quota exceeded';

          try {
            await pool.query(
              `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
               VALUES (?, ?, NOW())`,
              [errorMessage, (req as any).user?.email || null]
            );
          } catch (logError) {
            console.error('[OpenAI] Failed to log quota error:', logError);
          }

          throw new AppError(
            'AI service is temporarily unavailable. Please try again later.',
            503
          );
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as any;
          throw new AppError(
            errorData?.error?.message ||
              `Failed to get response from OpenAI (status ${response.status})`,
            response.status
          );
        }

        const data = (await response.json()) as any;
        const choice = data?.choices?.[0];
        const text =
          choice?.message?.content ||
          "I'm sorry, I couldn't generate a response.";

        return {
          candidates: [
            {
              content: {
                parts: [{ text }],
              },
              finishReason: choice?.finish_reason || 'STOP',
            },
          ],
        };
      };

      let lastError: any = null;
      for (const currentProvider of providerOrder) {
        const apiKey = getApiKey(currentProvider);
        if (!apiKey) {
          // Для вторичных провайдеров просто переходим дальше
          continue;
        }
        try {
          let result;
          if (currentProvider === 'gemini') {
            result = await buildGeminiResponse(apiKey);
          } else if (currentProvider === 'openai') {
            result = await buildOpenAIResponse(apiKey);
          } else {
            throw new AppError(
              `Provider "${currentProvider}" is not yet supported. Currently only Gemini and OpenAI are supported.`,
              501
            );
          }
          return res.json(result);
        } catch (err: any) {
          lastError = err;
          console.warn(`[AI Chat] Provider ${currentProvider} failed:`, err?.message || err);
          // If this is the last provider or unsupported error, rethrow
          const isQuota = err instanceof AppError
            ? err.statusCode === 429 || err.statusCode === 503
            : err?.status === 429 || err?.status === 503;
          // Try next provider on any error; if none left, fall through to error handling below
          continue;
        }
      }

      // Если все провайдеры провалились
      if (lastError) throw lastError;
    } catch (error: any) {
      if (error instanceof AppError) {
        // Проверяем, является ли это ошибкой квоты
        if (error.statusCode === 429 || error.statusCode === 503) {
          const errorMessage = error.message || 'AI quota exceeded';
          
          // Логируем ошибку квоты в базу данных
          try {
            await pool.query(
              `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
               VALUES (?, ?, NOW())`,
              [errorMessage, (req as any).user?.email || null]
            );
          } catch (logError) {
            console.error('[Gemini] Failed to log quota error:', logError);
          }
          
          // Возвращаем общее сообщение без деталей ошибки
          next(
            new AppError(
              'AI service is temporarily unavailable. Please try again later.',
              503
            )
          );
        } else {
          next(error);
        }
      } else {
        // Проверяем, является ли это ошибкой квоты
        const isQuotaError = error?.message?.toLowerCase().includes('quota') || 
                            error?.message?.toLowerCase().includes('rate limit') ||
                            error?.status === 429 ||
                            error?.response?.status === 429;
        
        if (isQuotaError) {
          const errorMessage = error?.message || 'AI quota exceeded';
          
          // Логируем ошибку квоты в базу данных
          try {
            await pool.query(
              `INSERT INTO ai_quota_errors (error_message, user_email, created_at) 
               VALUES (?, ?, NOW())`,
              [errorMessage, (req as any).user?.email || null]
            );
          } catch (logError) {
            console.error('[Gemini] Failed to log quota error:', logError);
          }
          
          // Возвращаем общее сообщение без деталей ошибки
          next(
            new AppError(
              'AI service is temporarily unavailable. Please try again later.',
              503
            )
          );
        } else {
          console.error('[Gemini Router] Unexpected error:', error);
          next(
            new AppError(
              'An unexpected error occurred while processing your request',
              500
            )
          );
        }
      }
    }
  }
);

export default router;

