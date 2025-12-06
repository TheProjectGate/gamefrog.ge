import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Product, FilterConfig } from '../types';
import { HeartIcon, CoinIcon } from './Icons';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import useStore from '../store/useStore';
import * as LucideIcons from 'lucide-react';
import { getBackgroundStyle, getBackgroundClassName } from '../utils/colorUtils';
import { sanitizeSVG } from '../utils/sanitize';

interface ProductCardProps {
  product: Product;
  onToggleWishlist: (productId: number) => void;
  isInWishlist: boolean;
  genreConfig: FilterConfig;
  platformConfig: FilterConfig;
  genreGroupId?: string;
  platformGroupId?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onToggleWishlist, isInWishlist, genreConfig, platformConfig, genreGroupId, platformGroupId }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef, { threshold: 0.1 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const products = useStore(state => state.products);
  const filterAssignments = useStore(state => state.filterAssignments);

  const getIconNode = useCallback((iconName?: string, className?: string) => {
    if (!iconName) return null;
    const raw = String(iconName).trim();
    const tryNames = [raw, raw.replace(/\s+/g, ''), raw.replace(/[^a-zA-Z0-9]/g, '')];
    for (const key of tryNames) {
      const CompA = (LucideIcons as any)[key];
      if (CompA) return <CompA className={className || 'w-4 h-4'} />;
      const pascal = key
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      const CompB = (LucideIcons as any)[pascal];
      if (CompB) return <CompB className={className || 'w-4 h-4'} />;
    }
    return null;
  }, []);

  const getConfigForValue = useCallback((config: FilterConfig, value: string) => {
    if (!value) return undefined;
    
    // Проверяем формат parent::child (суб-фильтр)
    if (value.includes('::')) {
      const [parentKey, childKey] = value.split('::');
      const parentConfig = config[parentKey];
      if (parentConfig?.children && parentConfig.children[childKey]) {
        return parentConfig.children[childKey];
      }
    }
    
    // Сначала проверяем прямое совпадение
    if (config[value]) return config[value];
    
    // Проверяем, является ли это дочерним элементом (без разделителя)
    for (const [parentKey, parentConfig] of Object.entries(config)) {
      if (parentConfig.children && parentConfig.children[value]) {
        return parentConfig.children[value];
      }
    }
    
    // Нормализованный поиск для родительских элементов
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = norm(value);
    for (const [k, v] of Object.entries(config)) {
      if (norm(k) === target) return v;
    }
    return undefined;
  }, []);

  const bundleItemsDetailed = useMemo(() => {
    if (!product.bundleItems || product.bundleItems.length < 2) return [];
    return product.bundleItems
      .map(id => products.find(p => p.id === id))
      .filter((item): item is Product => Boolean(item));
  }, [product.bundleItems, products]);

  const isBundle = bundleItemsDetailed.length >= 2;
  const bundleSummaryText = useMemo(() => {
    if (!isBundle) return '';
    const names = bundleItemsDetailed.map(item => item.name);
    const firstThree = names.slice(0, 3).join(' + ');
    const remaining = names.length - 3;
    return remaining > 0 ? `${firstThree} + ${remaining} more` : firstThree;
  }, [isBundle, bundleItemsDetailed]);

  const containerOrientationClasses = isBundle
    ? 'flex flex-row flex-wrap sm:flex-nowrap items-stretch'
    : 'flex flex-col';

  const mediaWrapperClasses = isBundle
    ? 'relative w-full md:w-1/2 min-h-[220px] bg-gray-200 flex-shrink-0 h-full'
    : 'relative w-full aspect-square bg-gray-200';

  const contentWrapperClasses = isBundle
    ? 'p-4 md:p-5 flex flex-col w-full md:w-1/2 text-left h-full'
    : 'p-4 md:p-5 text-center flex-grow flex flex-col';

  const titleClasses = isBundle
    ? 'text-xl md:text-2xl font-black text-black leading-snug truncate whitespace-nowrap overflow-hidden'
    : 'text-lg md:text-xl font-bold text-black truncate whitespace-nowrap overflow-hidden';

  const priceWrapperClasses = isBundle
    ? 'mt-3 md:mt-4 flex items-center justify-start gap-2 sm:gap-3 flex-wrap text-sm md:text-base'
    : 'mt-2 flex items-center justify-center gap-2 sm:gap-3 text-sm md:text-base';

  const tagWrapperClasses = isBundle
    ? 'mt-auto pt-4 flex justify-start items-center gap-2 flex-wrap'
    : 'mt-auto pt-4 flex justify-center items-center gap-2 flex-wrap';

  const visibilityClasses = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <article
      ref={cardRef}
      className={`platform-card overflow-hidden w-full relative group transition-all duration-500 ease-out hover:border-[#FFD700] ${containerOrientationClasses} ${visibilityClasses}`}
      role="article"
      aria-label={`Product: ${product.name}`}
    >
      <div className={`absolute top-3 left-3 z-10 ${isBundle ? 'flex flex-col items-start gap-2' : 'flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap'}`}>
        {product.goldCoins && product.goldCoins > 0 && (
          <div className="bg-[#FFD700] text-black text-xs font-bold px-2 py-1 border-2 border-black flex items-center gap-1" data-platform-chip aria-label={`Earn ${product.goldCoins} gold coins`}>
            <CoinIcon className="w-4 h-4" aria-hidden="true" />
            <span>+{product.goldCoins}</span>
          </div>
        )}
        {isBundle && (
          <div className="bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-black tracking-[0.2em]" data-platform-chip role="status" aria-label="Bundle product">
            Bundle
          </div>
        )}
        {product.tags?.includes('sale') && (
            <div className="bg-[#FF0000] text-white text-xs font-bold uppercase px-3 py-1 tracking-wider border-2 border-black" data-platform-chip role="status" aria-label="On sale">
                Sale
            </div>
        )}
      </div>
      {!isBundle && (
        <div className="absolute top-3 right-3 z-10">
          <button 
            onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(product.id);
            }}
            className="w-7 h-7 flex items-center justify-center border-2 border-black bg-white transition-colors hover:bg-gray-100"
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <HeartIcon className={`w-4 h-4 ${isInWishlist ? 'text-red-500' : 'text-black'}`} isFilled={isInWishlist} />
          </button>
        </div>
      )}

      <div className={`${mediaWrapperClasses} overflow-hidden`}>
        {isBundle && (
          <div className="absolute top-3 right-3 z-10">
            <button 
              onClick={(e) => {
                  e.stopPropagation();
                  onToggleWishlist(product.id);
              }}
              className="w-7 h-7 flex items-center justify-center border-2 border-black bg-white transition-colors hover:bg-gray-100"
              aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <HeartIcon className={`w-4 h-4 ${isInWishlist ? 'text-red-500' : 'text-black'}`} isFilled={isInWishlist} />
            </button>
          </div>
        )}
        {!isImageLoaded && !imageError && (
          <div className="absolute inset-0 bg-gray-300 animate-pulse"></div>
        )}
        {imageError ? (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center" role="img" aria-label="Product image not available">
            <span className="text-gray-400 text-sm" aria-hidden="true">Image not available</span>
          </div>
        ) : (
        <img 
          src={product.imageUrl} 
          alt={`${product.name} product image`}
          className={`w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setIsImageLoaded(false);
          }}
          loading="lazy"
          aria-hidden={imageError}
        />
        )}
      </div>
      <div className={contentWrapperClasses}>
        <h3 
          className={titleClasses}
          title={product.name}
          id={`product-title-${product.id}`}
        >
          {product.name}
        </h3>
        <div className={priceWrapperClasses} aria-label="Product price">
          <p className="text-xl md:text-2xl font-black flex items-center gap-2" aria-label={product.coinExclusive && product.coinPrice ? `Price: ${product.coinPrice} coins` : `Price: $${(typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0).toFixed(2)}`}>
            {product.coinExclusive && product.coinPrice ? (
              <>
                <CoinIcon className="w-5 h-5 md:w-6 md:h-6 text-[#9333EA]" aria-hidden="true" />
                <span className="text-[#9333EA]">{product.coinPrice}</span>
              </>
            ) : (
              <>
                <span className="text-[#107C10]" aria-hidden="true">$</span>
                <span className="text-[#107C10]">{(typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0).toFixed(2)}</span>
              </>
            )}
          </p>
          {!product.coinExclusive && (
            <span className="text-xs md:text-sm font-bold text-black line-through opacity-70" aria-label={`Original price: $${((typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0) * 1.2).toFixed(2)}`}>
              ${ ((typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0) * 1.2).toFixed(2) }
            </span>
          )}
        </div>
        {isBundle && (
          <p className="text-sm text-black/70 mt-2 mb-auto line-clamp-2 text-left flex-grow">
            Includes {bundleSummaryText}
          </p>
        )}
        <div className={tagWrapperClasses}>
             {(() => {
                const baseGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                const genreGroup = genreGroupId || filterAssignments.genre;
                const extraGenres = genreGroup ? (product.filterValues?.[genreGroup] || []) : [];
                const allGenres = [...new Set([...baseGenres, ...extraGenres])];
                return allGenres.map((genre, index) => {
                    const config = getConfigForValue(genreConfig, genre);
                    if (!config) return null;
                    const displayContent = config.customSvg ? (
                        <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                    ) : config.iconName ? (
                        getIconNode(config.iconName, 'w-4 h-4')
                    ) : config.symbol ? (
                        <span className="text-xs">{config.symbol}</span>
                    ) : null;
                    if (!displayContent) return null;
                    return (
                        <div 
                            key={`${genre}-${index}`}
                            title={genre} 
                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black`} 
                            style={getBackgroundStyle(config.color)}
                            data-platform-chip 
                            role="img" 
                            aria-label={`Genre: ${genre}`}
                        >
                            {displayContent}
                        </div>
                    );
                });
            })()}
            {(() => {
                let basePlatforms = [];
                if (Array.isArray(product.platforms)) {
                  basePlatforms = product.platforms;
                } else if (typeof product.platforms === 'string') {
                  try {
                    const parsed = JSON.parse(product.platforms);
                    if (Array.isArray(parsed)) {
                      basePlatforms = parsed;
                    }
                  } catch (e) { /* ignore error */ }
                }
                const platformGroup = platformGroupId || filterAssignments.platform;
                const extraPlatforms = platformGroup ? (product.filterValues?.[platformGroup] || []) : [];
                const allPlatforms = [...new Set([...basePlatforms, ...extraPlatforms])];
                return allPlatforms.map(platform => {
                    const config = getConfigForValue(platformConfig, platform);
                    if (!config) return null;
                    const displayContent = config.customSvg ? (
                        <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                    ) : config.iconName ? (
                        getIconNode(config.iconName, 'w-4 h-4')
                    ) : config.symbol ? (
                        <span className="text-xs">{config.symbol}</span>
                    ) : null;
                    if (!displayContent) return null;
                    return (
                        <div 
                            key={platform} 
                            title={platform} 
                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black`} 
                            style={getBackgroundStyle(config.color)}
                            data-platform-chip 
                            role="img" 
                            aria-label={`Platform: ${platform}`}
                        >
                            {displayContent}
                        </div>
                    );
                });
            })()}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
