import React, { useMemo, useState } from 'react';

interface BundleDeckProps {
  images: string[];
  className?: string;
  rounded?: boolean;
}

const BundleDeck: React.FC<BundleDeckProps> = ({ images, className = '', rounded = true }) => {
  const [isHovered, setIsHovered] = useState(false);

  const previewImages = useMemo(() => {
    const uniqueImages = images.filter(Boolean);
    if (uniqueImages.length < 2) {
      return uniqueImages.length ? uniqueImages : [];
    }
    return uniqueImages.slice(0, Math.min(uniqueImages.length, 6));
  }, [images]);

  if (previewImages.length < 2) {
    return null;
  }

  const midpoint = (previewImages.length - 1) / 2;

  return (
    <div
      className={`relative overflow-visible ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {previewImages.map((src, index) => {
        const stackTranslateX = index * 6;
        const stackTranslateY = index * 4;
        const spreadTranslateX = (index - midpoint) * 18;
        const spreadTranslateY = -Math.abs(index - midpoint) * 6;
        const spreadRotate = (index - midpoint) * 8;

        const transform = isHovered
          ? `translate(${spreadTranslateX}px, ${spreadTranslateY}px) rotate(${spreadRotate}deg)`
          : `translate(${stackTranslateX}px, ${stackTranslateY}px)`;

        return (
          <img
            key={`${src}-${index}`}
            src={src}
            alt="Bundle item"
            className={`absolute inset-0 w-full h-full object-cover border-4 border-black shadow-[4px_4px_0_0_#000] transition-transform duration-300 ease-out ${rounded ? 'rounded-xl' : ''}`}
            style={{ transform, zIndex: index + 1 }}
            draggable={false}
          />
        );
      })}
      <div className={`absolute inset-0 border-4 border-black pointer-events-none ${rounded ? 'rounded-xl' : ''}`}></div>
    </div>
  );
};

export default BundleDeck;

