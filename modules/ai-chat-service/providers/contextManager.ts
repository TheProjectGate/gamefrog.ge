/**
 * Context Manager - manages conversation history and context for all AI providers
 */

import { pool } from '../config/database';
import { Message, ConversationContext } from './types';

export class ContextManager {
  /**
   * Load conversation history for a user
   */
  async loadConversationHistory(userEmail: string, limit: number = 50): Promise<ConversationContext> {
    try {
      const [rows]: any = await pool.execute(
        `SELECT role, content, metadata, created_at 
         FROM chat_messages 
         WHERE user_email = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userEmail, limit]
      );

      const messages: Message[] = rows.reverse().map((row: any) => ({
        role: row.role === 'assistant' ? 'assistant' : 'user',
        content: row.content,
      }));

      // Extract metadata from the most recent message if available
      const metadata = rows.length > 0 && rows[rows.length - 1].metadata
        ? JSON.parse(rows[rows.length - 1].metadata)
        : undefined;

      return {
        messages,
        metadata,
      };
    } catch (error) {
      console.error('[ContextManager] Error loading conversation history:', error);
      return { messages: [] };
    }
  }

  /**
   * Save a message to conversation history
   */
  async saveMessage(
    userEmail: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: ConversationContext['metadata']
  ): Promise<number> {
    try {
      const [result]: any = await pool.execute(
        `INSERT INTO chat_messages (user_email, role, content, metadata, created_at) 
         VALUES (?, ?, ?, ?, NOW())`,
        [
          userEmail,
          role,
          content,
          metadata ? JSON.stringify(metadata) : null,
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error('[ContextManager] Error saving message:', error);
      throw error;
    }
  }

  /**
   * Build AI request with conversation context
   * @param saveUserMessage - if true, saves the current message to history (default: true)
   */
  async buildRequestWithContext(
    userEmail: string,
    currentMessage: string,
    systemInstruction?: string,
    generationConfig?: any,
    saveUserMessage: boolean = true
  ): Promise<{ request: any; context: ConversationContext }> {
    // Load conversation history
    const context = await this.loadConversationHistory(userEmail);

    // Save current user message if requested
    if (saveUserMessage && currentMessage) {
      await this.saveMessage(userEmail, 'user', currentMessage, context.metadata);
    }

    // Reload context to include the newly saved message
    const updatedContext = saveUserMessage 
      ? await this.loadConversationHistory(userEmail)
      : context;

    // Build messages array
    const messages: Message[] = [...updatedContext.messages];
    
    // If we didn't save the message, add it manually
    if (!saveUserMessage && currentMessage) {
      messages.push({ role: 'user', content: currentMessage });
    }

    // Add system instruction if provided (will be extracted by provider)
    const messagesWithSystem = systemInstruction
      ? [{ role: 'system' as const, content: systemInstruction }, ...messages]
      : messages;

    return {
      request: {
        messages: messagesWithSystem,
        systemInstruction,
        generationConfig,
      },
      context: updatedContext,
    };
  }

  /**
   * Clear conversation history for a user (optional, for privacy/cleanup)
   */
  async clearConversationHistory(userEmail: string): Promise<void> {
    try {
      await pool.execute(
        'DELETE FROM chat_messages WHERE user_email = ?',
        [userEmail]
      );
    } catch (error) {
      console.error('[ContextManager] Error clearing conversation history:', error);
      throw error;
    }
  }
}

export const contextManager = new ContextManager();
