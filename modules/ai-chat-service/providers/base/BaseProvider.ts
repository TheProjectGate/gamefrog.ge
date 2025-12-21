/**
 * Base class for AI providers
 */

import { AIProvider, AIRequest, AIResponse, Message } from '../types';

export abstract class BaseProvider implements AIProvider {
  abstract readonly name: string;
  protected apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if provider is configured
   */
  abstract isConfigured(): boolean;

  /**
   * Generate response from AI provider
   */
  abstract generateResponse(request: AIRequest): Promise<AIResponse>;

  /**
   * Convert provider response to standard format
   */
  abstract convertToStandardFormat(response: any): AIResponse;

  /**
   * Prepare messages for provider (remove system message if needed)
   */
  protected prepareMessages(messages: Message[]): Message[] {
    return messages;
  }

  /**
   * Extract system instruction from messages
   */
  protected extractSystemInstruction(messages: Message[]): { systemInstruction?: string; messages: Message[] } {
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    return {
      systemInstruction: systemMessages.length > 0 ? systemMessages[0].content : undefined,
      messages: nonSystemMessages,
    };
  }
}
