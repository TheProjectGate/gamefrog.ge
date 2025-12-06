import { DialogueRule, ChatContext, Message } from '../types';

/**
 * Движок диалогов
 * Обрабатывает правила и генерирует ответы
 */
export class DialogueEngine {
  private rules: DialogueRule[];

  constructor(rules: DialogueRule[]) {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Генерирует ответ на основе правил
   */
  generateResponse(userMessage: string, context: ChatContext): string | null {
    const normalized = userMessage.toLowerCase();

    for (const rule of this.rules) {
      if (this.matchesRule(normalized, rule, context)) {
        if (typeof rule.response === 'function') {
          return rule.response(context);
        }
        return rule.response;
      }
    }

    return null;
  }

  /**
   * Проверяет, соответствует ли сообщение правилу
   */
  private matchesRule(
    normalizedMessage: string,
    rule: DialogueRule,
    context: ChatContext
  ): boolean {
    if (rule.patterns.length === 0) {
      return true;
    }

    const hasPattern = rule.patterns.some(pattern =>
      normalizedMessage.includes(pattern.toLowerCase())
    );

    if (!hasPattern) {
      return false;
    }

    if (rule.context && rule.context.length > 0) {
      return rule.context.some(ctx => {
        if (ctx === 'userRole') {
          return !!context.userRole;
        }
        if (ctx === 'currentView') {
          return !!context.currentView;
        }
        return true;
      });
    }

    return true;
  }

  /**
   * Добавляет новое правило
   */
  addRule(rule: DialogueRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Получает все правила
   */
  getRules(): DialogueRule[] {
    return [...this.rules];
  }
}

