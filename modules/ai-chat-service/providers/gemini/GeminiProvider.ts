/**
 * Gemini AI Provider Module
 */

import { BaseProvider } from '../base/BaseProvider';
import { AIRequest, AIResponse, Message } from '../types';

export class GeminiProvider extends BaseProvider {
  readonly name = 'gemini';
  private model: string;

  constructor(apiKey?: string, model: string = 'gemini-2.5-flash') {
    super(apiKey);
    this.model = model;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const { systemInstruction, messages } = this.extractSystemInstruction(request.messages);
    
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const geminiRequest: any = { contents };

    // Add system instruction
    if (systemInstruction) {
      geminiRequest.system_instruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    // Add generation config
    if (request.generationConfig) {
      geminiRequest.generationConfig = {
        temperature: request.generationConfig.temperature,
        topK: request.generationConfig.topK,
        topP: request.generationConfig.topP,
        maxOutputTokens: request.generationConfig.maxOutputTokens || request.generationConfig.maxTokens,
      };
    }

    // Try different API versions and models
    const variants = [
      { version: 'v1beta', model: this.model },
      { version: 'v1', model: this.model },
      { version: 'v1beta', model: 'gemini-2.5-flash' },
      { version: 'v1', model: 'gemini-2.5-flash' },
    ];

    let lastError: any = null;
    for (const variant of variants) {
      try {
        const url = `https://generativelanguage.googleapis.com/${variant.version}/models/${variant.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiRequest),
        });

        if (response.ok) {
          const data = await response.json();
          return this.convertToStandardFormat(data);
        }

        if (response.status === 429 || response.status === 503) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData?.error?.message || 'Quota exceeded';
          console.log(`[GeminiProvider] Quota error detected: ${errorMessage}`);
          lastError = { 
            status: response.status, 
            statusCode: response.status,
            error: errorData, 
            message: errorMessage,
            isQuotaError: true 
          };
          break; // Don't try other variants for quota errors
        }

        lastError = { status: response.status };
      } catch (error: any) {
        lastError = error;
        continue;
      }
    }

    if (lastError?.isQuotaError) {
      // Create a proper error object that will be caught correctly
      const quotaError: any = new Error(lastError.message || 'Gemini quota exceeded');
      quotaError.status = lastError.status || 429;
      quotaError.statusCode = lastError.statusCode || lastError.status || 429;
      quotaError.error = lastError.error;
      quotaError.isQuotaError = true;
      quotaError.provider = this.name;
      throw quotaError;
    }

    // For any other error, create error with proper structure for fallback detection
    const errorMessage = lastError?.error?.message || lastError?.message || 'Unknown error';
    const errorStatus = lastError?.status || lastError?.statusCode || 500;
    
    // Check if this looks like a quota/rate limit error even if not marked
    const errorString = errorMessage.toLowerCase();
    const looksLikeQuotaError = 
      errorStatus === 429 || 
      errorStatus === 503 ||
      errorString.includes('quota') ||
      errorString.includes('rate limit') ||
      errorString.includes('resource exhausted') ||
      errorString.includes('too many requests') ||
      errorString.includes('service unavailable');
    
    const error: any = new Error(`Failed to get response from Gemini: ${errorMessage}`);
    error.status = errorStatus;
    error.statusCode = errorStatus;
    error.error = lastError?.error || { message: errorMessage };
    error.message = errorMessage;
    error.isQuotaError = looksLikeQuotaError; // Mark as quota error if it looks like one
    error.provider = this.name;
    
    throw error;
  }

  convertToStandardFormat(response: any): AIResponse {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini');
    }

    const text = candidate.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
    const finishReason = candidate.finishReason || 'STOP';

    return {
      text,
      finishReason,
      usage: response.usageMetadata ? {
        promptTokens: response.usageMetadata.promptTokenCount,
        completionTokens: response.usageMetadata.candidatesTokenCount,
        totalTokens: response.usageMetadata.totalTokenCount,
      } : undefined,
    };
  }
}
