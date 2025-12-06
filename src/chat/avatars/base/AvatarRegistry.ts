import { AvatarConfig } from '../../types';
import { kratosConfig } from '../kratos/kratos.config';

/**
 * Реестр всех доступных аватаров
 */
class AvatarRegistryClass {
  private avatars: Map<string, AvatarConfig> = new Map();

  constructor() {
    this.register(kratosConfig);
  }

  /**
   * Регистрирует новый аватар
   */
  register(config: AvatarConfig): void {
    this.avatars.set(config.id, config);
  }

  /**
   * Получает конфигурацию аватара по ID
   */
  get(id: string): AvatarConfig | undefined {
    return this.avatars.get(id);
  }

  /**
   * Получает все зарегистрированные аватары
   */
  getAll(): AvatarConfig[] {
    return Array.from(this.avatars.values());
  }

  /**
   * Проверяет, существует ли аватар
   */
  has(id: string): boolean {
    return this.avatars.has(id);
  }
}

export const AvatarRegistry = new AvatarRegistryClass();

