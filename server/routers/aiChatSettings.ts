import express from 'express';
import { pool } from '../server';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../utils/errorHandler';

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
        model: 'gemini-2.5-flash', // Обновлено на актуальную модель
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
      };
      return res.json(defaultSettings);
    }

    const settings = rows[0];
    const provider = settings.provider || 'gemini';
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
    });
  } catch (error) {
    console.error('[aiChatSettings] Error fetching settings:', error);
    next(new AppError('Failed to fetch AI chat settings', 500));
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
    } = req.body;

    // Debug logging
    console.log('[aiChatSettings] Received update request:', {
      enabled: typeof enabled,
      provider,
      model: typeof model,
      temperature: typeof temperature,
      maxTokens: typeof maxTokens,
    });

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

    // Check if settings exist
    const [existing]: any = await pool.query(
      'SELECT id FROM ai_chat_settings WHERE id = 1'
    );

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

    if (existing.length === 0) {
      // Insert new settings
      await pool.query(
        `INSERT INTO ai_chat_settings (
          id, enabled, provider, model, temperature, max_tokens, system_prompt,
          gemini_api_key, openai_api_key, deepseek_api_key, anthropic_api_key,
          custom_provider_api_key, custom_provider_name, custom_provider_url,
          chat_bubbles_enabled, chat_bubbles_test_mode, chat_bubbles_min_interval, chat_bubbles_max_interval, chat_bubbles_display_duration, chat_bubbles_max_per_day
        )
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        model: model || 'gemini-1.5-flash',
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
      },
    });
  } catch (error) {
    console.error('[aiChatSettings] Error updating settings:', error);
    next(new AppError('Failed to update AI chat settings', 500));
  }
});

// Get chat bubbles settings (public endpoint - no auth required)
router.get('/chat-bubbles', async (req, res, next) => {
  try {
    const [rows]: any = await pool.query(
      'SELECT chat_bubbles_enabled, chat_bubbles_test_mode, chat_bubbles_min_interval, chat_bubbles_max_interval, chat_bubbles_display_duration, chat_bubbles_max_per_day FROM ai_chat_settings WHERE id = 1'
    );

    if (rows.length === 0) {
      // Return default settings
      return res.json({
        enabled: true,
        testMode: false,
        minInterval: 20,
        maxInterval: 40,
        displayDuration: 5,
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
    });
  } catch (error) {
    console.error('[aiChatSettings] Error fetching chat bubbles settings:', error);
    // Return default settings on error
    res.json({
      enabled: true,
      testMode: false,
      minInterval: 20,
      maxInterval: 40,
      displayDuration: 5,
      maxPerDay: 10,
    });
  }
});

export default router;
