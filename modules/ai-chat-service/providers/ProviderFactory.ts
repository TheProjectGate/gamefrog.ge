/**
 * Provider Factory - creates and manages AI provider instances
 */

import { AIProvider } from './types';
import { GeminiProvider } from './gemini/GeminiProvider';
import { OpenAIProvider } from './openai/OpenAIProvider';
import { DeepSeekProvider } from './deepseek/DeepSeekProvider';
import { AnthropicProvider } from './anthropic/AnthropicProvider';

export interface ProviderConfig {
  provider: string;
  apiKey?: string;
  model?: string;
}

export class ProviderFactory {
  private providers: Map<string, AIProvider> = new Map();

  /**
   * Create a provider instance
   */
  createProvider(config: ProviderConfig): AIProvider {
    const { provider, apiKey, model } = config;

    switch (provider.toLowerCase()) {
      case 'gemini':
        return new GeminiProvider(apiKey, model);
      
      case 'openai':
        return new OpenAIProvider(apiKey, model || 'gpt-4o-mini');
      
      case 'deepseek':
        return new DeepSeekProvider(apiKey, model || 'deepseek-chat');
      
      case 'anthropic':
        return new AnthropicProvider(apiKey, model || 'claude-3-5-sonnet-20241022');
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Get or create a provider instance (cached)
   */
  getProvider(config: ProviderConfig): AIProvider {
    const cacheKey = `${config.provider}:${config.model || 'default'}`;
    
    if (!this.providers.has(cacheKey)) {
      const provider = this.createProvider(config);
      this.providers.set(cacheKey, provider);
    }

    return this.providers.get(cacheKey)!;
  }

  /**
   * Clear provider cache
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return ['gemini', 'openai', 'deepseek', 'anthropic'];
  }
}

export const providerFactory = new ProviderFactory();
