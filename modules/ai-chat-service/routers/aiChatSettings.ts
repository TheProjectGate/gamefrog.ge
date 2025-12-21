import express from 'express';
import { pool } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../utils/errorHandler';
import { providerFactory } from '../providers';
import { AIRequest } from '../providers';

const router = express.Router();

interface AIChatSettings {
  enabled: boolean;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  deepseekApiKey?: string;
  anthropicApiKey?: string;
  customProviderApiKey?: string;
  customProviderName?: string;
  customProviderUrl?: string;
  apiKeyConfigured: boolean;
  chatBubblesEnabled?: boolean;
  chatBubblesTestMode?: boolean;
  chatBubblesMinInterval?: number;
  chatBubblesMaxInterval?: number;
  chatBubblesDisplayDuration?: number;
  chatBubblesMaxPerDay?: number;
  commentsAutoHideDuration?: number;
  providerStatus?: {
    primary: string;
    lastUsed?: string;
    configured: {
      gemini: boolean;
      openai: boolean;
      deepseek: boolean;
      anthropic: boolean;
    };
  };
}

// Heuristic provider detector from error message
function detectProviderFromMessage(msg: string): 'gemini' | 'openai' | 'deepseek' | 'anthropic' | 'custom' | 'unknown' {
  const m = msg.toLowerCase();
  if (m.includes('provider:openai') || m.includes('gpt') || m.includes('openai')) return 'openai';
  if (m.includes('provider:gemini') || m.includes('gemini')) return 'gemini';
  if (m.includes('provider:deepseek') || m.includes('deepseek')) return 'deepseek';
  if (m.includes('provider:anthropic') || m.includes('claude')) return 'anthropic';
  if (m.includes('provider:custom') || m.includes('custom')) return 'custom';
  return 'unknown';
}

async function validateProviderKey(provider: string, apiKey?: string, model?: string) {
  const normalized = (provider || '').toLowerCase().trim();
  if (!normalized) {
    throw new AppError('provider is required for validation', 400);
  }
  if (!apiKey) {
    throw new AppError(`${normalized} API key is required for validation`, 400);
  }

  const prov = providerFactory.createProvider({ provider: normalized, apiKey, model });
  if (!prov.isConfigured()) {
    throw new AppError(`${normalized} API key is not configured`, 400);
  }

  const pingRequest: AIRequest = {
    messages: [{ role: 'user', content: 'health check ping' }],
    systemInstruction: 'You are performing a health-check. Reply with "ok".',
    generationConfig: { maxTokens: 8, maxOutputTokens: 8, temperature: 0 },
  };

  try {
    const result = await prov.generateResponse(pingRequest);
    return { ok: true, finishReason: result.finishReason, usage: result.usage };
  } catch (error: any) {
    const msg = error?.message || 'Validation failed';
    const status = error?.status || error?.statusCode || error?.response?.status;
    if (error?.isQuotaError || status === 429 || status === 503) {
      throw new AppError(`${normalized} key is valid but quota/rate-limit was hit`, 503);
    }
    if (status === 401 || status === 403) {
      throw new AppError(`${normalized} API key is invalid or unauthorized`, 400);
    }
    throw new AppError(`Validation failed for ${normalized}: ${msg}`, 502);
  }
}

// Get AI Chat settings (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM ai_chat_settings WHERE id = 1'
    );

    if (rows.length === 0) {
      // Return default settings
      const defaultSettings: AIChatSettings = {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 1024,
        systemPrompt: undefined,
        geminiApiKey: process.env.GEMINI_API_KEY || undefined,
        openaiApiKey: process.env.OPENAI_API_KEY || undefined,
        deepseekApiKey: process.env.DEEPSEEK_API_KEY || undefined,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
        apiKeyConfigured: !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY),
        chatBubblesEnabled: true,
        chatBubblesTestMode: false,
        chatBubblesMinInterval: 20,
        chatBubblesMaxInterval: 40,
        chatBubblesDisplayDuration: 5,
        chatBubblesMaxPerDay: 10,
        commentsAutoHideDuration: 10,
        providerStatus: {
          primary: 'gemini',
          lastUsed: 'gemini',
          configured: {
            gemini: !!(process.env.GEMINI_API_KEY),
            openai: !!(process.env.OPENAI_API_KEY),
            deepseek: !!(process.env.DEEPSEEK_API_KEY),
            anthropic: !!(process.env.ANTHROPIC_API_KEY),
          },
        },
      };
      return res.json(defaultSettings);
    }

    const settings = rows[0];
    const provider = settings.provider || 'gemini';
    const lastUsedProvider = settings.last_used_provider || provider;
    const apiKeys = {
      gemini: settings.gemini_api_key || process.env.GEMINI_API_KEY || undefined,
      openai: settings.openai_api_key || process.env.OPENAI_API_KEY || undefined,
      deepseek: settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY || undefined,
      anthropic: settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY || undefined,
      custom: settings.custom_provider_api_key || undefined,
    };
    
    res.json({
      enabled: Boolean(settings.enabled),
      provider: provider,
      model: settings.model || 'gemini-2.5-flash',
      temperature: settings.temperature || 0.7,
      maxTokens: settings.max_tokens || 1024,
      systemPrompt: settings.system_prompt || undefined,
      geminiApiKey: apiKeys.gemini,
      openaiApiKey: apiKeys.openai,
      deepseekApiKey: apiKeys.deepseek,
      anthropicApiKey: apiKeys.anthropic,
      customProviderApiKey: settings.custom_provider_api_key || undefined,
      customProviderName: settings.custom_provider_name || undefined,
      customProviderUrl: settings.custom_provider_url || undefined,
      apiKeyConfigured: !!apiKeys[provider as keyof typeof apiKeys] || !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY),
      chatBubblesEnabled: settings.chat_bubbles_enabled !== undefined ? Boolean(settings.chat_bubbles_enabled) : true,
      chatBubblesTestMode: settings.chat_bubbles_test_mode !== undefined ? Boolean(settings.chat_bubbles_test_mode) : false,
      chatBubblesMinInterval: settings.chat_bubbles_min_interval || 20,
      chatBubblesMaxInterval: settings.chat_bubbles_max_interval || 40,
      chatBubblesDisplayDuration: settings.chat_bubbles_display_duration || 5,
      chatBubblesMaxPerDay: settings.chat_bubbles_max_per_day || 10,
      commentsAutoHideDuration: settings.comments_auto_hide_duration || 10,
      // Provider status information
      providerStatus: {
        primary: provider,
        configured: {
          gemini: !!(apiKeys.gemini),
          openai: !!(apiKeys.openai),
          deepseek: !!(apiKeys.deepseek),
          anthropic: !!(apiKeys.anthropic),
        },
      },
    });
  } catch (error) {
    console.error('[AI Chat Service][aiChatSettings] Error fetching settings:', error);
    next(new AppError('Failed to fetch AI chat settings', 500));
  }
});

// Validate provider API key (admin only)
router.post('/validate-key', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { provider, apiKey, model } = req.body;
    const result = await validateProviderKey(provider, apiKey, model);
    res.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

// Update AI Chat settings (admin only)
router.put('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { 
      enabled, 
      provider, 
      model, 
      temperature, 
      maxTokens, 
      systemPrompt,
      geminiApiKey,
      openaiApiKey,
      deepseekApiKey,
      anthropicApiKey,
      customProviderApiKey,
      customProviderName,
      customProviderUrl,
      chatBubblesEnabled,
      chatBubblesTestMode,
      chatBubblesMinInterval,
      chatBubblesMaxInterval,
      chatBubblesDisplayDuration,
      chatBubblesMaxPerDay,
      commentsAutoHideDuration,
    } = req.body;

    // Validate input
    if (typeof enabled !== 'boolean') {
      return next(new AppError('enabled must be a boolean', 400));
    }

    const validProviders = ['gemini', 'openai', 'deepseek', 'anthropic', 'custom'];
    const selectedProvider = provider || 'gemini';
    if (!validProviders.includes(selectedProvider)) {
      return next(new AppError(`provider must be one of: ${validProviders.join(', ')}`, 400));
    }

    if (model && typeof model !== 'string') {
      return next(new AppError('model must be a string', 400));
    }

    // Convert temperature to number if it's a string
    const tempValue = typeof temperature === 'string' ? parseFloat(temperature) : temperature;
    if (tempValue !== undefined && (typeof tempValue !== 'number' || isNaN(tempValue) || tempValue < 0 || tempValue > 2)) {
      return next(new AppError('temperature must be a number between 0 and 2', 400));
    }

    // Convert maxTokens to number if it's a string
    const tokensValue = typeof maxTokens === 'string' ? parseInt(maxTokens, 10) : maxTokens;
    if (tokensValue !== undefined && (typeof tokensValue !== 'number' || isNaN(tokensValue) || tokensValue < 1 || tokensValue > 8192)) {
      return next(new AppError('maxTokens must be a number between 1 and 8192', 400));
    }

    // Check if settings exist and load current keys for validation fallback
    const [existing]: any = await pool.query(
      'SELECT * FROM ai_chat_settings WHERE id = 1'
    );
    const existingRow = existing[0];

    // Validate chat bubbles settings
    const bubblesEnabled = chatBubblesEnabled !== undefined ? Boolean(chatBubblesEnabled) : true;
    const bubblesTestMode = chatBubblesTestMode !== undefined ? Boolean(chatBubblesTestMode) : false;
    const bubblesMinInterval = chatBubblesMinInterval !== undefined 
      ? (typeof chatBubblesMinInterval === 'string' ? parseInt(chatBubblesMinInterval, 10) : chatBubblesMinInterval)
      : 20;
    const bubblesMaxInterval = chatBubblesMaxInterval !== undefined 
      ? (typeof chatBubblesMaxInterval === 'string' ? parseInt(chatBubblesMaxInterval, 10) : chatBubblesMaxInterval)
      : 40;
    const bubblesDisplayDuration = chatBubblesDisplayDuration !== undefined 
      ? (typeof chatBubblesDisplayDuration === 'string' ? parseInt(chatBubblesDisplayDuration, 10) : chatBubblesDisplayDuration)
      : 5;
    const bubblesMaxPerDay = chatBubblesMaxPerDay !== undefined 
      ? (typeof chatBubblesMaxPerDay === 'string' ? parseInt(chatBubblesMaxPerDay, 10) : chatBubblesMaxPerDay)
      : 10;

    if (bubblesMinInterval < 5 || bubblesMinInterval > 300) {
      return next(new AppError('chatBubblesMinInterval must be between 5 and 300 seconds', 400));
    }
    if (bubblesMaxInterval < 10 || bubblesMaxInterval > 600) {
      return next(new AppError('chatBubblesMaxInterval must be between 10 and 600 seconds', 400));
    }
    if (bubblesMaxInterval < bubblesMinInterval) {
      return next(new AppError('chatBubblesMaxInterval must be greater than or equal to chatBubblesMinInterval', 400));
    }
    if (bubblesDisplayDuration < 2 || bubblesDisplayDuration > 30) {
      return next(new AppError('chatBubblesDisplayDuration must be between 2 and 30 seconds', 400));
    }
    if (bubblesMaxPerDay < 1 || bubblesMaxPerDay > 100) {
      return next(new AppError('chatBubblesMaxPerDay must be between 1 and 100', 400));
    }

    // Validate comments auto hide duration
    const commentsHideDuration = commentsAutoHideDuration !== undefined 
      ? (typeof commentsAutoHideDuration === 'string' ? parseInt(commentsAutoHideDuration, 10) : commentsAutoHideDuration)
      : 10;
    
    if (commentsHideDuration < 1 || commentsHideDuration > 300) {
      return next(new AppError('commentsAutoHideDuration must be between 1 and 300 seconds', 400));
    }

    // Resolve key for selected provider (prefer incoming value, then existing row, then env)
    const providerKeyForValidation = (() => {
      switch (selectedProvider) {
        case 'gemini':
          return geminiApiKey ?? existingRow?.gemini_api_key ?? process.env.GEMINI_API_KEY;
        case 'openai':
          return openaiApiKey ?? existingRow?.openai_api_key ?? process.env.OPENAI_API_KEY;
        case 'deepseek':
          return deepseekApiKey ?? existingRow?.deepseek_api_key ?? process.env.DEEPSEEK_API_KEY;
        case 'anthropic':
          return anthropicApiKey ?? existingRow?.anthropic_api_key ?? process.env.ANTHROPIC_API_KEY;
        case 'custom':
        default:
          return customProviderApiKey ?? existingRow?.custom_provider_api_key;
      }
    })();

    const modelForValidation =
      model ||
      (selectedProvider === 'openai'
        ? existingRow?.openai_model || 'gpt-4o-mini'
        : selectedProvider === 'deepseek'
        ? existingRow?.deepseek_model || 'deepseek-chat'
        : selectedProvider === 'anthropic'
        ? existingRow?.anthropic_model || 'claude-3-5-sonnet-20241022'
        : selectedProvider === 'gemini'
        ? existingRow?.model || 'gemini-2.5-flash'
        : undefined);

    const shouldValidateKey = req.body.validateKey !== false && selectedProvider !== 'custom';
    if (shouldValidateKey) {
      await validateProviderKey(selectedProvider, providerKeyForValidation, modelForValidation);
    }

    if (existing.length === 0) {
      // Insert new settings
      await pool.query(
        `INSERT INTO ai_chat_settings (
          id, enabled, provider, model, temperature, max_tokens, system_prompt,
          gemini_api_key, openai_api_key, deepseek_api_key, anthropic_api_key,
          custom_provider_api_key, custom_provider_name, custom_provider_url,
          chat_bubbles_enabled, chat_bubbles_test_mode, chat_bubbles_min_interval, chat_bubbles_max_interval, chat_bubbles_display_duration, chat_bubbles_max_per_day,
          comments_auto_hide_duration
        )
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          enabled,
          selectedProvider,
          model || 'gemini-2.5-flash',
          tempValue ?? 0.7,
          tokensValue ?? 1024,
          systemPrompt || null,
          geminiApiKey || null,
          openaiApiKey || null,
          deepseekApiKey || null,
          anthropicApiKey || null,
          customProviderApiKey || null,
          customProviderName || null,
          customProviderUrl || null,
          bubblesEnabled,
          bubblesTestMode,
          bubblesMinInterval,
          bubblesMaxInterval,
          bubblesDisplayDuration,
          bubblesMaxPerDay,
          commentsHideDuration,
        ]
      );
    } else {
      // Update existing settings
      await pool.query(
        `UPDATE ai_chat_settings 
         SET enabled = ?, provider = ?, model = ?, temperature = ?, max_tokens = ?, system_prompt = ?,
             gemini_api_key = ?, openai_api_key = ?, deepseek_api_key = ?, anthropic_api_key = ?,
             custom_provider_api_key = ?, custom_provider_name = ?, custom_provider_url = ?,
             chat_bubbles_enabled = ?, chat_bubbles_test_mode = ?, chat_bubbles_min_interval = ?, chat_bubbles_max_interval = ?, chat_bubbles_display_duration = ?, chat_bubbles_max_per_day = ?,
             comments_auto_hide_duration = ?,
             updated_at = NOW()
         WHERE id = 1`,
        [
          enabled,
          selectedProvider,
          model || 'gemini-2.5-flash',
          tempValue ?? 0.7,
          tokensValue ?? 1024,
          systemPrompt || null,
          geminiApiKey || null,
          openaiApiKey || null,
          deepseekApiKey || null,
          anthropicApiKey || null,
          customProviderApiKey || null,
          customProviderName || null,
          customProviderUrl || null,
          bubblesEnabled,
          bubblesTestMode,
          bubblesMinInterval,
          bubblesMaxInterval,
          bubblesDisplayDuration,
          bubblesMaxPerDay,
          commentsHideDuration,
        ]
      );
    }

    // Get updated settings to return
    const [updatedRows]: any = await pool.query(
      'SELECT * FROM ai_chat_settings WHERE id = 1'
    );
    const updated = updatedRows[0];
    const apiKeys = {
      gemini: updated?.gemini_api_key || process.env.GEMINI_API_KEY || undefined,
      openai: updated?.openai_api_key || process.env.OPENAI_API_KEY || undefined,
      deepseek: updated?.deepseek_api_key || process.env.DEEPSEEK_API_KEY || undefined,
      anthropic: updated?.anthropic_api_key || process.env.ANTHROPIC_API_KEY || undefined,
      custom: updated?.custom_provider_api_key || undefined,
    };

    res.json({
      message: 'AI Chat settings updated successfully',
      settings: {
        enabled,
        provider: selectedProvider,
        model: model || 'gemini-2.5-flash',
        temperature: tempValue ?? 0.7,
        maxTokens: tokensValue ?? 1024,
        systemPrompt: systemPrompt || undefined,
        geminiApiKey: apiKeys.gemini,
        openaiApiKey: apiKeys.openai,
        deepseekApiKey: apiKeys.deepseek,
        anthropicApiKey: apiKeys.anthropic,
        customProviderApiKey: updated?.custom_provider_api_key || undefined,
        customProviderName: updated?.custom_provider_name || undefined,
        customProviderUrl: updated?.custom_provider_url || undefined,
        apiKeyConfigured: !!apiKeys[selectedProvider as keyof typeof apiKeys] || !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY),
        chatBubblesEnabled: bubblesEnabled,
        chatBubblesTestMode: bubblesTestMode,
        chatBubblesMinInterval: bubblesMinInterval,
        chatBubblesMaxInterval: bubblesMaxInterval,
        chatBubblesDisplayDuration: bubblesDisplayDuration,
        chatBubblesMaxPerDay: bubblesMaxPerDay,
        commentsAutoHideDuration: commentsHideDuration,
        providerStatus: {
          primary: selectedProvider,
          configured: {
            gemini: !!(apiKeys.gemini),
            openai: !!(apiKeys.openai),
            deepseek: !!(apiKeys.deepseek),
            anthropic: !!(apiKeys.anthropic),
          },
        },
      },
    });
  } catch (error) {
    console.error('[AI Chat Service][aiChatSettings] Error updating settings:', error);
    next(new AppError('Failed to update AI chat settings', 500));
  }
});

// Get provider usage stats (admin only)
router.get('/provider-stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // Get recent quota errors to see which providers are having issues
    const [quotaErrors]: any = await pool.query(
      `SELECT error_message, user_email, created_at 
       FROM ai_quota_errors 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    // Count errors by provider (parse from error messages)
    const providerErrorCounts: Record<string, number> = {
      gemini: 0,
      openai: 0,
      deepseek: 0,
      anthropic: 0,
    };

    quotaErrors.forEach((error: any) => {
      const msg = (error.error_message || '').toLowerCase();
      if (msg.includes('gemini')) providerErrorCounts.gemini++;
      else if (msg.includes('openai') || msg.includes('gpt')) providerErrorCounts.openai++;
      else if (msg.includes('deepseek')) providerErrorCounts.deepseek++;
      else if (msg.includes('anthropic') || msg.includes('claude')) providerErrorCounts.anthropic++;
    });

    // Aggregate total quota errors and last occurrence
    const [allErrors]: any = await pool.query(
      `SELECT error_message, created_at FROM ai_quota_errors ORDER BY created_at DESC`
    );
    const providerTotals: Record<string, { total: number; lastAt?: string | null }> = {
      gemini: { total: 0, lastAt: null },
      openai: { total: 0, lastAt: null },
      deepseek: { total: 0, lastAt: null },
      anthropic: { total: 0, lastAt: null },
      unknown: { total: 0, lastAt: null },
    };
    allErrors.forEach((row: any) => {
      const prov = detectProviderFromMessage(row.error_message || '');
      if (!providerTotals[prov]) providerTotals[prov] = { total: 0, lastAt: null };
      providerTotals[prov].total += 1;
      if (!providerTotals[prov].lastAt) {
        providerTotals[prov].lastAt = row.created_at;
      }
    });

    // Get current settings
    const [settingsRows]: any = await pool.query(
      'SELECT provider, last_used_provider, gemini_api_key, openai_api_key, deepseek_api_key, anthropic_api_key FROM ai_chat_settings WHERE id = 1'
    );

    const settings = settingsRows[0] || {};
    const lastUsedProvider = settings.last_used_provider || settings.provider || 'gemini';
    const apiKeys = {
      gemini: settings.gemini_api_key || process.env.GEMINI_API_KEY || undefined,
      openai: settings.openai_api_key || process.env.OPENAI_API_KEY || undefined,
      deepseek: settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY || undefined,
      anthropic: settings.anthropic_api_key || process.env.ANTHROPIC_API_KEY || undefined,
    };

    res.json({
      primary: settings.provider || 'gemini',
      lastUsed: lastUsedProvider,
      configured: {
        gemini: !!(apiKeys.gemini),
        openai: !!(apiKeys.openai),
        deepseek: !!(apiKeys.deepseek),
        anthropic: !!(apiKeys.anthropic),
      },
      quotaErrorsLast24h: providerErrorCounts,
      quotaErrorsTotal: providerTotals,
      recentErrors: quotaErrors.slice(0, 10),
    });
  } catch (error) {
    console.error('[AI Chat Service][aiChatSettings] Error fetching provider stats:', error);
    next(new AppError('Failed to fetch provider stats', 500));
  }
});

// Get chat bubbles settings (public endpoint - no auth required)
router.get('/chat-bubbles', async (req, res, next) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT chat_bubbles_enabled, chat_bubbles_test_mode, chat_bubbles_min_interval, chat_bubbles_max_interval, chat_bubbles_display_duration, chat_bubbles_max_per_day, comments_auto_hide_duration FROM ai_chat_settings WHERE id = 1'
    );

    if (rows.length === 0) {
      // Return default settings
      return res.json({
        enabled: true,
        testMode: false,
        minInterval: 20,
        maxInterval: 40,
        displayDuration: 5,
        maxPerDay: 10,
        commentsAutoHideDuration: 10,
      });
    }

    const settings = rows[0];
    res.json({
      enabled: Boolean(settings.chat_bubbles_enabled ?? true),
      testMode: Boolean(settings.chat_bubbles_test_mode ?? false),
      minInterval: settings.chat_bubbles_min_interval || 20,
      maxInterval: settings.chat_bubbles_max_interval || 40,
      displayDuration: settings.chat_bubbles_display_duration || 5,
      maxPerDay: settings.chat_bubbles_max_per_day || 10,
      commentsAutoHideDuration: settings.comments_auto_hide_duration || 10,
    });
  } catch (error) {
    console.error('[AI Chat Service][aiChatSettings] Error fetching chat bubbles settings:', error);
    // Return default settings on error
    res.json({
      enabled: true,
      testMode: false,
      minInterval: 20,
      maxInterval: 40,
      displayDuration: 5,
      maxPerDay: 10,
      commentsAutoHideDuration: 10,
    });
  }
});

// Get comments settings (public endpoint - no auth required)
router.get('/comments-settings', async (req, res, next) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT comments_auto_hide_duration FROM ai_chat_settings WHERE id = 1'
    );

    if (rows.length === 0) {
      return res.json({
        autoHideDuration: 10,
      });
    }

    const settings = rows[0];
    res.json({
      autoHideDuration: settings.comments_auto_hide_duration || 10,
    });
  } catch (error) {
    console.error('[AI Chat Service][aiChatSettings] Error fetching comments settings:', error);
    res.json({
      autoHideDuration: 10,
    });
  }
});

export default router;
