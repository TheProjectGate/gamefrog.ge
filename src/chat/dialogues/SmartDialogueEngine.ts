import { DialogueRule, ChatContext, Message } from '../types';
import { chatWithAI, ChatMessage } from '../../api/aiChat';
import { DialogueEngine } from './DialogueEngine';

/**
 * Умный движок диалогов с интеграцией AI провайдеров
 * Использует правила для простых ответов и AI (Gemini/OpenAI/DeepSeek/Anthropic) для сложных запросов
 */
export class SmartDialogueEngine extends DialogueEngine {
  private aiEnabled: boolean;
  private fallbackToRules: boolean;

  constructor(
    rules: DialogueRule[],
    options: { geminiEnabled?: boolean; fallbackToRules?: boolean } = {}
  ) {
    super(rules);
    // Обратная совместимость: geminiEnabled переименован в aiEnabled
    this.aiEnabled = options.geminiEnabled ?? true;
    this.fallbackToRules = options.fallbackToRules ?? true;
  }

  /**
   * Генерирует ответ с использованием AI провайдеров или правил
   */
  async generateSmartResponse(
    userMessage: string,
    context: ChatContext
  ): Promise<string> {
    // Сначала проверяем правила для простых ответов
    const ruleResponse = this.generateResponse(userMessage, context);
    if (ruleResponse && !this.shouldUseGemini(userMessage)) {
      return ruleResponse;
    }

    // Если AI включен, используем его
    if (this.aiEnabled) {
      try {
        const aiResponse = await this.generateGeminiResponse(
          userMessage,
          context
        );
        if (aiResponse) {
          return aiResponse;
        }
      } catch (error: any) {
        console.error('[SmartDialogueEngine] AI error:', error);
        
        // Проверяем, является ли это ошибкой квоты
        const errorMessage = error?.message || String(error || 'Unknown error');
        const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                            errorMessage.toLowerCase().includes('rate limit') ||
                            errorMessage.toLowerCase().includes('429') ||
                            errorMessage.toLowerCase().includes('temporarily unavailable') ||
                            error?.status === 429 ||
                            error?.status === 503 ||
                            error?.response?.status === 429 ||
                            error?.response?.status === 503;
        
        if (isQuotaError) {
          // Логируем ошибку квоты в админку (без показа пользователю)
          try {
            await fetch('/api/ai-quota-errors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                error: errorMessage,
                timestamp: new Date().toISOString(),
                userEmail: context.userEmail || null,
              }),
            }).catch(() => {}); // Игнорируем ошибки логирования
          } catch (logError) {
            console.error('[SmartDialogueEngine] Failed to log quota error:', logError);
          }
        }
        
        // Fallback to rules if enabled - НЕ показываем ошибку пользователю
        if (this.fallbackToRules && ruleResponse) {
          return ruleResponse;
        }
        
        // Если нет fallback, возвращаем дефолтный ответ без упоминания ошибки
        throw error; // Пробрасываем ошибку дальше, но она будет обработана в ChatAssistant
      }
    }

    // Fallback к правилам или дефолтный ответ
    return (
      ruleResponse ||
      (context.translate
        ? context.translate('chat.notUnderstood')
        : "I'm not sure how to help with that. Can you rephrase?")
    );
  }

  /**
   * Определяет, нужно ли использовать AI для этого запроса
   */
  private shouldUseGemini(userMessage: string): boolean {
    const normalized = userMessage.toLowerCase();
    const simplePatterns = [
      'hi',
      'hello',
      'hey',
      'thanks',
      'thank you',
      'bye',
      'goodbye',
    ];
    return !simplePatterns.some(pattern => normalized.includes(pattern));
  }

  /**
   * Генерирует ответ через Gemini API
   */
  private async generateGeminiResponse(
    userMessage: string,
    context: ChatContext
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    const messages = this.buildChatMessages(context.messages, userMessage);

    const contextData = {
      userEmail: context.userEmail,
      userFirstName: context.userFirstName,
      userLastName: context.userLastName,
      userPhone: context.userPhone,
      userAddress: context.userAddress,
      userAvatar: context.userAvatar,
      userRegistrationDate: context.userRegistrationDate,
      purchaseHistory: context.purchaseHistory,
      previousQuestions: context.previousQuestions,
      products: context.products,
      activeOffers: context.activeOffers,
      wishlist: context.wishlist,
      currentView: context.currentView,
    };

    const response = await chatWithAI(messages, systemPrompt, contextData);
    return response.trim();
  }

  /**
   * Строит системный промпт для AI провайдеров
   */
  private buildSystemPrompt(context: ChatContext): string {
    const isOldUser = this.isOldUser(context);
    const hasOffers = context.activeOffers && context.activeOffers.length > 0;
    
    // Собираем полную информацию о пользователе из регистрации
    const userInfoParts: string[] = [];
    if (context.userFirstName) {
      const fullName = context.userLastName 
        ? `${context.userFirstName} ${context.userLastName}` 
        : context.userFirstName;
      userInfoParts.push(`Name: ${fullName}`);
    }
    if (context.userEmail) {
      userInfoParts.push(`Email: ${context.userEmail}`);
    }
    if (context.userPhone) {
      userInfoParts.push(`Phone: ${context.userPhone}`);
    }
    if (context.userAddress) {
      userInfoParts.push(`Address: ${context.userAddress}`);
    }
    if (context.userRegistrationDate) {
      const regDate = new Date(context.userRegistrationDate);
      const daysSince = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
      userInfoParts.push(`Registered: ${daysSince} days ago (${regDate.toLocaleDateString()})`);
    }
    
    const userInfo = userInfoParts.length > 0 
      ? `USER REGISTRATION INFORMATION:\n${userInfoParts.join('\n')}\n`
      : '';
    
    // Информация о покупках
    const purchaseInfo = context.purchaseHistory && context.purchaseHistory.length > 0
      ? `\nUSER PURCHASE HISTORY:\nThe user has made ${context.purchaseHistory.length} purchase(s). Recent purchases:\n${context.purchaseHistory.slice(-5).map(order => {
          const total = order.total != null ? order.total.toFixed(2) : '0.00';
          return `- Order #${order.id} ($${total}): ${order.products?.map(p => p.name).join(', ') || 'No products'}`;
        }).join('\n')}\n`
      : '\nUSER PURCHASE HISTORY: The user has not made any purchases yet.\n';
    
    // Информация о предыдущих вопросах
    const previousQuestionsInfo = context.previousQuestions && context.previousQuestions.length > 0
      ? `\nPREVIOUS CONVERSATION:\nYou have already discussed these topics with the user:\n${context.previousQuestions.slice(-10).map((q, i) => `${i + 1}. ${q.substring(0, 100)}${q.length > 100 ? '...' : ''}`).join('\n')}\n\nIMPORTANT: Do NOT repeat the same questions or topics that were already discussed. Use this information to provide better, more personalized responses.\n`
      : '';

    // Определяем язык для ответов
    const language = context.language || 'en';
    const languageNames: Record<string, string> = {
      'en': 'English',
      'ka': 'Georgian (ქართული)',
      'ru': 'Russian (Русский)',
    };
    const targetLanguage = languageNames[language] || languageNames['en'];
    
    // Используем system prompt из конфигурации аватара, если он есть
    let basePrompt = context.avatarSystemPrompt || 
      `You are a helpful and friendly shopping assistant for GameFrog, a gaming store. 
${userInfo}${purchaseInfo}${previousQuestionsInfo}
Your role is to help users find products, answer questions about sales and discounts, and provide personalized recommendations.

CRITICAL RULES - MEMORY AND PERSONALIZATION:
1. You know ALL the user's registration information (name, email, phone, address) - use it naturally in conversation
2. You know the user's purchase history - reference it when relevant, but DON'T ask about things they already bought unless they ask
3. You remember previous conversations - DON'T repeat questions or topics already discussed
4. If you already asked about something or discussed it, don't ask again - use that information instead
5. Personalize your responses based on what you know about the user
6. If the user bought something before, you can suggest similar products or ask if they want to buy it again
7. NEVER ask for information you already have (name, email, phone, address, purchase history)

Guidelines:
- Be conversational, friendly, and helpful
- Keep responses concise (2-3 sentences max)
- Use the provided context about products, sales, and user information
- If the user asks about sales or discounts, mention specific active offers if available
- If the user is a loyal customer (registered for more than 30 days), you can mention special discounts for returning customers
- Always be positive and encouraging
- If you don't know something, admit it politely
- Remember what you've already discussed - don't repeat yourself

YOUR PRIMARY GOAL: Help users discover and purchase products. When you mention ANY product, ALWAYS offer to add it to their cart or wishlist. Be proactive - don't wait for the user to ask!

PRODUCT ACTIONS - CRITICAL INSTRUCTIONS:
You MUST actively OFFER to help users add products to their cart or wishlist. This is a KEY feature of your role.

IMPORTANT: You should SUGGEST adding products, but NEVER add them automatically. The user must confirm by clicking a button.

WHEN TO SUGGEST ACTIONS:
1. When user asks about a specific product - ALWAYS offer to add it to cart or wishlist
2. When user expresses interest in buying something - suggest adding to cart
3. When user asks "what products do you have?" - list products AND offer to add them
4. When recommending products - ALWAYS offer to add them to cart or wishlist
5. When user asks about price or availability - offer to add to cart/wishlist

HOW TO FIND PRODUCTS:
- Match product names from user's message with products in the list
- Use partial name matching (e.g., "PS5" matches "PlayStation 5")
- Be flexible with names - users might use abbreviations or variations
- If you find a matching product, use its exact ID from the product list

ACTION FORMAT:
When you want to OFFER adding a product, include this EXACT format at the END of your response:
[ACTION:ACTION_TYPE:PRODUCT_ID]

Available actions:
- ADD_TO_CART: Offer to add product to shopping cart (use when user wants to buy or shows purchase intent)
- ADD_TO_WISHLIST: Offer to add product to wishlist (use when user wants to save for later or is just browsing)

REMEMBER: The action marker creates a BUTTON that the user must click. You are only SUGGESTING, not automatically adding!

EXAMPLES OF PROACTIVE SUGGESTIONS:
User: "What PlayStation games do you have?"
You: "We have several PlayStation games available! For example, [Product Name] (ID: X) for $Y. Would you like me to add it to your cart? [ACTION:ADD_TO_CART:X]"
Note: This creates a button - user must click to confirm!

User: "I'm interested in Xbox"
You: "Great! We have [Xbox Product Name] (ID: X) available for $Y. I can add it to your cart if you'd like! [ACTION:ADD_TO_CART:X]"

User: "Show me RPG games"
You: "Here are some great RPG games: [Product Name] (ID: X) for $Y. Would you like to add it to your cart or wishlist? [ACTION:ADD_TO_CART:X] or [ACTION:ADD_TO_WISHLIST:X]"

User: "What's the price of PlayStation 5?"
You: "PlayStation 5 is $499.99 (ID: 1). I can add it to your cart if you're interested! [ACTION:ADD_TO_CART:1]"

User: "Do you have any games on sale?"
You: "Yes! We have [Product Name] (ID: X) on sale with Y% discount. Would you like to add it to your cart? [ACTION:ADD_TO_CART:X]"

User: "Add PlayStation 5 to my cart"
You: "I can add PlayStation 5 to your cart! Just click the button below. [ACTION:ADD_TO_CART:1]"

User: "I want to save this for later"
You: "I can add it to your wishlist! Click the button to confirm. [ACTION:ADD_TO_WISHLIST:PRODUCT_ID]"

CRITICAL RULES:
- ALWAYS OFFER to add products when discussing them - this is your MAIN function
- Use ADD_TO_CART for purchase intent, ADD_TO_WISHLIST for browsing/saving
- Include the action marker IMMEDIATELY after mentioning the product
- If user doesn't specify, suggest BOTH options: "Would you like me to add it to your cart or wishlist?"
- NEVER say you can't do something - you CAN and SHOULD offer to add products when relevant
- If product name doesn't match exactly, use the closest match from the product list
- When listing multiple products, offer to add EACH one separately
- Even if user just asks "what do you have?", list products AND offer to add them
- Be proactive - don't wait for explicit request to add products
- REMEMBER: Action markers create BUTTONS that require user confirmation - you are only SUGGESTING, not automatically adding!`;

    // Добавляем инструкции о языке
    let prompt = `${basePrompt}

IMPORTANT LANGUAGE INSTRUCTION:
- The website interface is currently set to ${targetLanguage} (language code: ${language})
- You MUST respond in ${targetLanguage} at all times
- Match the user's language if they write in a different language, but prefer ${targetLanguage} for your responses
- If the user writes in ${targetLanguage}, respond in ${targetLanguage}
- Be natural and fluent in ${targetLanguage}

Context information:`;

    if (isOldUser) {
      prompt += `\n- This is a loyal customer who has been registered for a while. You can offer special discounts or thank them for their loyalty.`;
    }

    if (hasOffers) {
      const offersText = context.activeOffers!
        .map(
          offer =>
            `  - ${offer.discountPercent}% discount (ends ${new Date(offer.endsAt).toLocaleDateString()})`
        )
        .join('\n');
      prompt += `\n- Active sales and offers:\n${offersText}`;
    }

    if (context.products && context.products.length > 0) {
      // Добавляем информацию о всех доступных продуктах с акцентом на возможность добавления
      prompt += `\n\n=== AVAILABLE PRODUCTS (${context.products.length} total) ===`;
      prompt += `\nYou have access to ALL these products and can add ANY of them to cart or wishlist:`;
      
      // Группируем продукты по категориям для лучшего понимания
      const productsList = context.products.slice(0, 100).map(p => {
        let info = `ID ${p.id}: "${p.name}" - $${p.price}`;
        if (p.description) {
          const shortDesc = p.description.length > 60 ? p.description.substring(0, 60) + '...' : p.description;
          info += ` | ${shortDesc}`;
        }
        if (p.discountPercent && p.discountPercent > 0) {
          info += ` [${p.discountPercent}% OFF - ON SALE!]`;
        }
        if (p.stock !== undefined && p.stock > 0) {
          info += ` [In Stock: ${p.stock}]`;
        } else if (p.stock === 0) {
          info += ` [OUT OF STOCK]`;
        }
        if (p.genre && p.genre.length > 0) {
          info += ` | Genre: ${Array.isArray(p.genre) ? p.genre.join(', ') : p.genre}`;
        }
        if (p.platforms && p.platforms.length > 0) {
          info += ` | Platform: ${p.platforms.join(', ')}`;
        }
        if (p.tags && p.tags.length > 0) {
          info += ` | Tags: ${p.tags.join(', ')}`;
        }
        return info;
      }).join('\n  ');
      
      prompt += `\n  ${productsList}`;
      
      if (context.products.length > 100) {
        prompt += `\n  ... and ${context.products.length - 100} more products available.`;
      }
      
      // Отдельно упоминаем продукты со скидками
      const saleProducts = context.products.filter(
        p => p.discountPercent && p.discountPercent > 0
      );
      if (saleProducts.length > 0) {
        prompt += `\n\nSPECIAL OFFERS: ${saleProducts.length} products are currently on sale! These are great deals - offer to add them!`;
      }
      
      prompt += `\n\nREMEMBER: 
- When user mentions ANY product name (even partially), find it in this list above
- Use the EXACT ID number from the product list (the number after "ID")
- ALWAYS offer to add products using [ACTION:ADD_TO_CART:ID] or [ACTION:ADD_TO_WISHLIST:ID]
- If you can't find exact match, use the closest product from the list
- NEVER make up product IDs - only use IDs from the list above`;
    }

    if (context.wishlist && context.wishlist.length > 0) {
      prompt += `\n- The user has ${context.wishlist.length} items in their wishlist.`;
    }

    // Добавляем напоминание о правилах памяти
    prompt += `\n\nREMEMBER:
- You have access to the user's complete registration information - use it naturally
- You know their purchase history - reference it when helpful, but don't repeat questions about what they bought
- You remember previous conversations - don't repeat topics or questions
- Personalize your responses based on what you know about this specific user`;

    return prompt;
  }

  /**
   * Строит сообщения для AI чата из истории чата
   */
  private buildChatMessages(
    chatHistory: Message[],
    currentMessage: string
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Берем последние 10 сообщений для контекста
    const recentMessages = chatHistory.slice(-10);

    for (const msg of recentMessages) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Добавляем текущее сообщение
    messages.push({
      role: 'user',
      parts: [{ text: currentMessage }],
    });

    return messages;
  }

  /**
   * Проверяет, является ли пользователь "старым" (зарегистрирован более 30 дней)
   */
  private isOldUser(context: ChatContext): boolean {
    if (!context.userRegistrationDate) return false;
    const registrationDate = new Date(context.userRegistrationDate);
    const now = new Date();
    const daysSinceRegistration =
      (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceRegistration > 30;
  }
}
