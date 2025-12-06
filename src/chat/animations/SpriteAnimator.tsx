import React, { useEffect, useRef } from 'react';
import { AnimationConfig, FrameCorrection } from '../types';

interface SpriteAnimatorProps {
  sprite: HTMLImageElement | null;
  animationConfig: AnimationConfig;
  frameCorrections?: FrameCorrection[];
  talking?: boolean;
  className?: string;
}

/**
 * Универсальный аниматор спрайтов
 * Поддерживает любые спрайт-листы с автоматической коррекцией кадров
 */
const TARGET_CANVAS_SIZE = 256;

export const SpriteAnimator: React.FC<SpriteAnimatorProps> = ({
  sprite,
  animationConfig,
  frameCorrections = [],
  talking = false,
  className = 'chat-head-canvas',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameDurationRef = useRef(animationConfig.frameDuration);

  useEffect(() => {
    frameDurationRef.current = animationConfig.frameDuration;
  }, [animationConfig.frameDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprite) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameIndex = 0;
    let frameWidth = 0;
    let frameHeight = 0;
    let croppedSize = 0;
    let cropOffsetX = 0;
    let cropOffsetY = 0;
    let animationFrame: number;
    let lastTimestamp = 0;

    const { frameColumns, frameRows } = animationConfig;

    const syncSprite = () => {
      if (!sprite.complete) return false;
      if (frameWidth && frameHeight) return true;

      frameWidth = sprite.width / frameColumns;
      frameHeight = sprite.height / frameRows;
      const desiredSize = animationConfig.frameSize ?? Math.min(frameWidth, frameHeight);
      croppedSize = Math.min(desiredSize, frameWidth, frameHeight);
      // Округляем смещения для центрирования до целых пикселей
      cropOffsetX = Math.round((frameWidth - croppedSize) / 2);
      cropOffsetY = Math.round(Math.max((frameHeight - croppedSize) / 2, -3));
      canvas.width = TARGET_CANVAS_SIZE;
      canvas.height = TARGET_CANVAS_SIZE;
      canvas.style.width = `${TARGET_CANVAS_SIZE}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      // Включаем сглаживание для четкого рендеринга
      ctx.imageSmoothingEnabled = false;
      frameIndex = 0;
      return true;
    };

    const getFrameCorrection = (frameIdx: number): FrameCorrection | undefined => {
      return frameCorrections.find(
        correction =>
          correction.frameIndex === frameIdx &&
          (!correction.animationType || correction.animationType === (talking ? 'talk' : 'idle'))
      );
    };

    const drawFrame = () => {
      if (!syncSprite() || !frameWidth || !frameHeight) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const column = frameIndex % frameColumns;
      const row = Math.floor(frameIndex / frameColumns);

      const correction = getFrameCorrection(frameIndex);
      const offsetX = cropOffsetX + (correction?.offsetX || 0);
      const offsetY = cropOffsetY + (correction?.offsetY || 0);

      // Округляем координаты до целых чисел для четкого рендеринга
      const sourceX = Math.round(column * frameWidth + offsetX);
      const sourceY = Math.round(row * frameHeight + offsetY);
      const sourceSize = Math.round(croppedSize);

      ctx.drawImage(
        sprite,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        TARGET_CANVAS_SIZE,
        TARGET_CANVAS_SIZE,
      );
    };

    const animate = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp;
      }

      if (timestamp - lastTimestamp >= frameDurationRef.current) {
        frameIndex = (frameIndex + 1) % animationConfig.frameCount;
        lastTimestamp = timestamp;
        drawFrame();
      }

      animationFrame = requestAnimationFrame(animate);
    };

    drawFrame();
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [sprite, animationConfig, frameCorrections, talking]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  );
};

