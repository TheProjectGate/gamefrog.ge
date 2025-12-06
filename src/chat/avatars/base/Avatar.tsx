import React, { useMemo, useState, useEffect } from 'react';
import { SpriteAnimator } from '../../animations/SpriteAnimator';
import { AvatarConfig } from '../../types';

interface AvatarProps {
  config: AvatarConfig;
  talking: boolean;
  className?: string;
}

/**
 * Базовый компонент аватара
 * Управляет загрузкой спрайтов и переключением анимаций
 */
export const Avatar: React.FC<AvatarProps> = ({ config, talking, className }) => {
  const [idleSprite, setIdleSprite] = useState<HTMLImageElement | null>(null);
  const [talkSprite, setTalkSprite] = useState<HTMLImageElement | null>(null);
  const avatarScale = config.avatarScale ?? 1;

  useEffect(() => {
    const loadSprite = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    Promise.all([
      loadSprite(config.sprites.idle).then(setIdleSprite),
      loadSprite(config.sprites.talk).then(setTalkSprite),
    ]).catch(console.error);
  }, [config.sprites.idle, config.sprites.talk]);

  const currentSprite = talking ? talkSprite : idleSprite;
  const currentAnimation = talking ? config.animations.talk : config.animations.idle;

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        transform: `scale(${avatarScale})`,
        transformOrigin: 'center',
        display: 'flex',
      }}
    >
      <SpriteAnimator
        sprite={currentSprite}
        animationConfig={currentAnimation}
        frameCorrections={config.frameCorrections}
        talking={talking}
      />
    </div>
  );
};

