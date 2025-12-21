/**
 * Anthropic (Claude) AI Provider Module
 */

import { BaseProvider } from '../base/BaseProvider';
import { AIRequest, AIResponse, Message } from '../types';

export class AnthropicProvider extends BaseProvider {
  readonly name = 'anthropic';
  private model: string;

  constructor(apiKey?: string, model: string = 'claude-3-5-sonnet-20241022') {
    super(apiKey);
    this.model = model;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is not configured');
    }

    const { systemInstruction, messages } = this.extractSystemInstruction(request.messages);
    
    // Convert messages to Anthropic format
    // Anthropic uses a different format: array of {role, content} where content is a string
    const anthropicMessages: any[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const anthropicRequest: any = {
      model: this.model,
      messages: anthropicMessages,
      max_tokens: request.generationConfig?.maxTokens || request.generationConfig?.maxOutputTokens || 1024,
    };

    // Add system instruction
    if (systemInstruction) {
      anthropicRequest.system = systemInstruction;
    }

    // Add generation config
    if (request.generationConfig?.temperature !== undefined) {
      anthropicRequest.temperature = request.generationConfig.temperature;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(anthropicRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429 || response.status === 503) {
          const errorMessage = errorData?.error?.message || 'Anthropic quota exceeded';
          console.log(`[AnthropicProvider] Quota error detected: ${errorMessage}`);
          const quotaError: any = new Error(errorMessage);
          quotaError.status = response.status;
          quotaError.statusCode = response.status;
          quotaError.error = errorData;
          quotaError.isQuotaError = true;
          throw quotaError;
        }
        throw new Error(errorData.error?.message || `Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      return this.convertToStandardFormat(data);
    } catch (error: any) {
      if (error.isQuotaError) {
        error.provider = this.name;
        throw error;
      }
      throw error;
    }
  }

  convertToStandardFormat(response: any): AIResponse {
    const contentBlock = response.content?.[0];
    if (!contentBlock || contentBlock.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    const text = contentBlock.text || "I'm sorry, I couldn't generate a response.";
    const stopReason = response.stop_reason || 'stop_sequence';

    return {
      text,
      finishReason: stopReason === 'stop_sequence' ? 'STOP' : stopReason.toUpperCase(),
      usage: response.usage ? {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      } : undefined,
    };
  }
}
