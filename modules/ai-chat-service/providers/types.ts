/**
 * Types for AI provider modules
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationContext {
  messages: Message[];
  metadata?: {
    productMentions?: string[];
    userInfoMentions?: string[];
    actions?: string[];
  };
}

export interface GenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxTokens?: number;
  maxOutputTokens?: number;
}

export interface AIRequest {
  messages: Message[];
  systemInstruction?: string;
  generationConfig?: GenerationConfig;
  context?: ConversationContext;
}

export interface AIResponse {
  text: string;
  finishReason: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  /**
   * Unique identifier for the provider
   */
  readonly name: string;

  /**
   * Check if provider is configured and ready to use
   */
  isConfigured(): boolean;

  /**
   * Generate a response from the AI provider
   * @param request AI request with messages and configuration
   * @returns AI response with generated text
   */
  generateResponse(request: AIRequest): Promise<AIResponse>;

  /**
   * Convert provider-specific response to standard format
   */
  convertToStandardFormat(response: any): AIResponse;
}
