/**
 * DeepSeek AI Provider Module
 */

import { BaseProvider } from '../base/BaseProvider';
import { AIRequest, AIResponse, Message } from '../types';

export class DeepSeekProvider extends BaseProvider {
  readonly name = 'deepseek';
  private model: string;

  constructor(apiKey?: string, model: string = 'deepseek-chat') {
    super(apiKey);
    this.model = model;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    const { systemInstruction, messages } = this.extractSystemInstruction(request.messages);
    
    // Convert messages to DeepSeek format (similar to OpenAI)
    const deepSeekMessages: any[] = [];

    // Add system message if provided
    if (systemInstruction) {
      deepSeekMessages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      deepSeekMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    const deepSeekRequest: any = {
      model: this.model,
      messages: deepSeekMessages,
    };

    // Add generation config
    if (request.generationConfig) {
      if (request.generationConfig.temperature !== undefined) {
        deepSeekRequest.temperature = request.generationConfig.temperature;
      }
      if (request.generationConfig.maxTokens || request.generationConfig.maxOutputTokens) {
        deepSeekRequest.max_tokens = request.generationConfig.maxOutputTokens || request.generationConfig.maxTokens;
      }
    }

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(deepSeekRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429 || response.status === 503) {
          const errorMessage = errorData?.error?.message || 'DeepSeek quota exceeded';
          console.log(`[DeepSeekProvider] Quota error detected: ${errorMessage}`);
          const quotaError: any = new Error(errorMessage);
          quotaError.status = response.status;
          quotaError.statusCode = response.status;
          quotaError.error = errorData;
          quotaError.isQuotaError = true;
          throw quotaError;
        }
        throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`);
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
    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error('No response from DeepSeek');
    }

    const text = choice.message?.content || "I'm sorry, I couldn't generate a response.";
    const finishReason = choice.finish_reason === 'stop' ? 'STOP' : choice.finish_reason?.toUpperCase() || 'STOP';

    return {
      text,
      finishReason,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }
}
