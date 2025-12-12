import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Product, FilterConfig } from '../types';
import { HeartIcon, CoinIcon } from './Icons';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import useStore, { FILTER_CHILD_DELIMITER } from '../store/useStore';
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
  variant?: 'card' | 'row'; // 'card' - вертикальная карточка, 'row' - горизонтальная строка
  onProductClick?: (product: Product) => void; // Для row варианта
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onToggleWishlist, isInWishlist, genreConfig, platformConfig, genreGroupId, platformGroupId, variant = 'card', onProductClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef, { threshold: 0.1 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const products = useStore(state => state.products);
  const filterAssignments = useStore(state => state.filterAssignments);
  const filterGroups = useStore(state => state.filterGroups);
  
  // Общая функция нормализации и Set для дедупликации между группами
  const normalizeName = useCallback((name: string) => name.toLowerCase().trim().replace(/\s+/g, ' '), []);
  const allShownNormalizedRef = useRef<Set<string>>(new Set());
  
  // Очищаем Set при каждом рендере карточки (в начале компонента)
  allShownNormalizedRef.current.clear();

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
    
    const trimmedValue = value.trim();
    if (!trimmedValue) return undefined;
    
    // Проверяем формат parent::child (суб-фильтр)
    if (trimmedValue.includes('::')) {
      const [parentKey, childKey] = trimmedValue.split('::').map(s => s.trim());
      if (parentKey && childKey) {
        const parentConfig = config[parentKey];
        if (parentConfig?.children && parentConfig.children[childKey]) {
          return parentConfig.children[childKey];
        }
      }
    }
    
    // Сначала проверяем прямое совпадение (с учетом пробелов)
    if (config[trimmedValue]) return config[trimmedValue];
    
    // Проверяем, является ли это дочерним элементом (без разделителя)
    for (const [parentKey, parentConfig] of Object.entries(config)) {
      if (parentConfig.children) {
        if (parentConfig.children[trimmedValue]) {
          return parentConfig.children[trimmedValue];
        }
        // Также проверяем без учета регистра и пробелов
        for (const [childKey, childConfig] of Object.entries(parentConfig.children)) {
          const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (norm(childKey) === norm(trimmedValue)) {
            return childConfig;
          }
        }
      }
    }
    
    // Нормализованный поиск для родительских элементов
    const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const target = norm(trimmedValue);
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

  // Если variant === 'row', рендерим горизонтальную карточку
  if (variant === 'row') {
    const handleClick = () => {
      if (onProductClick) {
        onProductClick(product);
      }
    };

    const cardClassNames = `bg-white border-4 border-black flex flex-row overflow-hidden hover:border-[#FFD700] hover:-translate-y-1 cursor-pointer group relative transition-all duration-500 ease-out ${visibilityClasses}`;
    
    return (
      <div 
        ref={cardRef}
        onClick={handleClick}
        className={cardClassNames}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
        aria-label={`View details for ${product.name}`}
      >
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
          {product.goldCoins && product.goldCoins > 0 && (
            <div className="bg-[#FFD700] text-black text-xs font-bold px-2 py-1 border-2 border-black flex items-center gap-1">
              <CoinIcon className="w-4 h-4" />
              <span>+{product.goldCoins}</span>
            </div>
          )}
          {isBundle && (
            <div className="bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-black tracking-[0.2em]">
              Bundle
            </div>
          )}
          {product.tags?.includes('sale') && (
            <div className="bg-[#FF0000] text-white text-xs font-bold uppercase px-3 py-1 tracking-wider border-2 border-black">
              Sale
            </div>
          )}
        </div>
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

        <div className="relative h-48 sm:h-auto sm:w-48 flex-shrink-0 bg-gray-200">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-5 flex flex-col flex-1 min-w-0">
          <div className="min-w-0">
            <h3 
              className="text-2xl font-bold text-black mt-1 truncate whitespace-nowrap overflow-hidden"
              title={product.name}
            >
              {product.name}
            </h3>
            <p className="text-black/80 text-base leading-relaxed my-2 line-clamp-2">
              {product.description}
            </p>
            {isBundle && (
              <p className="text-sm font-semibold text-black/70">
                Includes: {bundleItemsDetailed.map(item => item.name).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black flex items-center gap-2">
                {product.coinExclusive && product.coinPrice ? (
                  <>
                    <CoinIcon className="w-7 h-7 text-[#9333EA]" />
                    <span className="text-[#9333EA]">{product.coinPrice}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#107C10]">$</span>
                    <span className="text-[#107C10]">{(typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0).toFixed(2)}</span>
                  </>
                )}
              </p>
              {!product.coinExclusive && (
                <span className="text-sm font-bold text-black line-through opacity-70">
                  ${((typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0) * 1.2).toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Используем ту же логику для фильтров, что и в card варианте */}
              {(() => {
                const genreGroup = genreGroupId || filterAssignments.genre;
                const baseGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                const extraGenres = genreGroup ? (product.filterValues?.[genreGroup] || []) : [];
                const allGenres = [...new Set([...baseGenres, ...extraGenres])];
                
                return allGenres.map((genre, index) => {
                  const config = getConfigForValue(genreConfig, genre);
                  if (!config) return null;
                  
                  const displayName = genre.includes(FILTER_CHILD_DELIMITER) 
                    ? genre.split(FILTER_CHILD_DELIMITER)[1] 
                    : genre;
                  const normalizedName = normalizeName(displayName);
                  
                  if (allShownNormalizedRef.current.has(normalizedName)) return null;
                  allShownNormalizedRef.current.add(normalizedName);
                  
                  const showIcons = config.showIcons !== false;
                  
                  const displayContent = showIcons && config.customSvg ? (
                    <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                  ) : showIcons && config.iconName ? (
                    getIconNode(config.iconName, 'w-4 h-4')
                  ) : config.symbol ? (
                    <span className="text-xs">{config.symbol}</span>
                  ) : null;
                  
                  if (!displayContent) return null;
                  return (
                    <div 
                      key={`${genre}-${index}`}
                      title={displayName} 
                      className={`${getBackgroundClassName(config.color)} ${config.textColor} h-6 px-2 flex items-center justify-center font-bold text-xs border-2 border-black`}
                      style={getBackgroundStyle(config.color)}
                    >
                      {displayContent}
                    </div>
                  );
                }).filter(Boolean);
              })()}
              {/* Платформы - упрощенная логика */}
              {(() => {
                const platformGroup = platformGroupId || filterAssignments.platform;
                const filterValuePlatforms = platformGroup ? (product.filterValues?.[platformGroup] || []) : [];
                let legacyPlatforms: string[] = [];
                if (Array.isArray(product.platforms)) {
                  legacyPlatforms = product.platforms;
                } else if (typeof product.platforms === 'string') {
                  try {
                    const parsed = JSON.parse(product.platforms);
                    if (Array.isArray(parsed)) {
                      legacyPlatforms = parsed;
                    } else if (parsed) {
                      legacyPlatforms = [parsed];
                    }
                  } catch (e) {
                    if (product.platforms.trim()) {
                      legacyPlatforms = [product.platforms];
                    }
                  }
                } else if (product.platforms) {
                  legacyPlatforms = [String(product.platforms)];
                }
                const allPlatforms = [...new Set([...filterValuePlatforms, ...legacyPlatforms])];
                
                return allPlatforms.map((platform, index) => {
                  const config = getConfigForValue(platformConfig, platform);
                  if (!config) return null;
                  
                  const displayName = platform.includes(FILTER_CHILD_DELIMITER) 
                    ? platform.split(FILTER_CHILD_DELIMITER)[1] 
                    : platform;
                  const normalizedName = normalizeName(displayName);
                  
                  if (allShownNormalizedRef.current.has(normalizedName)) return null;
                  allShownNormalizedRef.current.add(normalizedName);
                  
                  const showIcons = config.showIcons !== false;
                  
                  const displayContent = showIcons && config.customSvg ? (
                    <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                  ) : showIcons && config.iconName ? (
                    getIconNode(config.iconName, 'w-4 h-4')
                  ) : config.symbol ? (
                    <span className="text-xs">{config.symbol}</span>
                  ) : null;
                  
                  if (!displayContent) return null;
                  return (
                    <div 
                      key={`${platform}-${index}`} 
                      title={displayName} 
                      className={`${getBackgroundClassName(config.color)} ${config.textColor} w-6 h-6 flex items-center justify-center font-bold text-xs border-2 border-black`}
                      style={getBackgroundStyle(config.color)}
                    >
                      {displayContent}
                    </div>
                  );
                }).filter(Boolean);
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Стандартный card вариант
  const handleCardClick = () => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  return (
    <article
      ref={cardRef}
      onClick={onProductClick ? handleCardClick : undefined}
      className={`platform-card overflow-hidden w-full relative group transition-all duration-500 ease-out hover:border-[#FFD700] ${containerOrientationClasses} ${visibilityClasses} ${onProductClick ? 'cursor-pointer' : ''}`}
      role={onProductClick ? "button" : "article"}
      tabIndex={onProductClick ? 0 : undefined}
      onKeyDown={onProductClick ? (e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick() : undefined}
      aria-label={onProductClick ? `View details for ${product.name}` : `Product: ${product.name}`}
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
                // Упрощенная логика, как в модальном окне
                const genreGroup = genreGroupId || filterAssignments.genre;
                const baseGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                const extraGenres = genreGroup ? (product.filterValues?.[genreGroup] || []) : [];
                const allGenres = [...new Set([...baseGenres, ...extraGenres])];
                
                return allGenres.map((genre, index) => {
                    const config = getConfigForValue(genreConfig, genre);
                    if (!config) return null;
                    
                    // Извлекаем displayName для дедупликации
                    const displayName = genre.includes(FILTER_CHILD_DELIMITER) 
                        ? genre.split(FILTER_CHILD_DELIMITER)[1] 
                        : genre;
                    const normalizedName = normalizeName(displayName);
                    
                    // Пропускаем, если уже показали это значение
                    if (allShownNormalizedRef.current.has(normalizedName)) return null;
                    allShownNormalizedRef.current.add(normalizedName);
                    
                    const showIcons = config.showIcons !== false;
                    
                    const displayContent = showIcons && config.customSvg ? (
                        <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                    ) : showIcons && config.iconName ? (
                        getIconNode(config.iconName, 'w-4 h-4')
                    ) : config.symbol ? (
                        <span className="text-xs">{config.symbol}</span>
                    ) : null;
                    
                    if (!displayContent) return null;
                    return (
                        <div 
                            key={`${genre}-${index}`}
                            title={displayName} 
                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black`} 
                            style={getBackgroundStyle(config.color)}
                            data-platform-chip 
                            role="img" 
                            aria-label={`Genre: ${displayName}`}
                        >
                            {displayContent}
                        </div>
                    );
                }).filter(Boolean);
            })()}
            {(() => {
                const platformGroup = platformGroupId || filterAssignments.platform;
                // Приоритет отдаем filterValues (новый формат), старые поля используем только для обратной совместимости
                const filterValuePlatforms = platformGroup ? (product.filterValues?.[platformGroup] || []) : [];
                
                // Парсим legacy platforms
                let legacyPlatforms: string[] = [];
                if (Array.isArray(product.platforms)) {
                  legacyPlatforms = product.platforms;
                } else if (typeof product.platforms === 'string') {
                  try {
                    const parsed = JSON.parse(product.platforms);
                    if (Array.isArray(parsed)) {
                      legacyPlatforms = parsed;
                    } else if (parsed) {
                      legacyPlatforms = [parsed];
                    }
                  } catch (e) {
                    if (product.platforms.trim()) {
                      legacyPlatforms = [product.platforms];
                    }
                  }
                } else if (product.platforms) {
                  legacyPlatforms = [String(product.platforms)];
                }
                
                // Создаем Set для отслеживания уже добавленных значений (нормализованных)
                const addedNormalized = new Set<string>();
                
                // Функция для получения нормализованного имени платформы (извлекает child если есть)
                const getNormalizedPlatformName = (platform: string): string => {
                    const trimmed = platform.trim();
                    if (trimmed.includes(FILTER_CHILD_DELIMITER)) {
                        return normalizeName(trimmed.split(FILTER_CHILD_DELIMITER)[1]);
                    }
                    return normalizeName(trimmed);
                };
                
                // Сначала добавляем значения из filterValues (приоритет)
                const allPlatforms: string[] = [];
                filterValuePlatforms.forEach((platform) => {
                    const trimmed = typeof platform === 'string' ? platform.trim() : String(platform).trim();
                    if (trimmed) {
                        const normalized = getNormalizedPlatformName(trimmed);
                        if (!addedNormalized.has(normalized)) {
                            allPlatforms.push(trimmed);
                            addedNormalized.add(normalized);
                        }
                    }
                });
                
                // Затем добавляем значения из legacy полей, только если их еще нет
                legacyPlatforms.forEach((platform) => {
                    const trimmed = typeof platform === 'string' ? platform.trim() : String(platform).trim();
                    if (trimmed) {
                        const normalized = getNormalizedPlatformName(trimmed);
                        // Проверяем, не добавлена ли уже эта платформа (по нормализованному имени)
                        if (!addedNormalized.has(normalized)) {
                            // Если это дочерний элемент, добавляем в формате "Parent::Child"
                            // Иначе добавляем как есть
                            allPlatforms.push(trimmed);
                            addedNormalized.add(normalized);
                        }
                    }
                });
                
                // Разделяем на родительские и дочерние значения
                const parentPlatforms = new Set<string>();
                const childPlatforms = new Set<string>();
                const parentToChildren = new Map<string, Set<string>>();
                
                // Сначала собираем все уникальные значения (убираем дубликаты на уровне исходных данных)
                const uniquePlatforms = new Set<string>();
                allPlatforms.forEach((platform) => {
                    if (platform) {
                        uniquePlatforms.add(platform);
                    }
                });
                
                uniquePlatforms.forEach((platform) => {
                    if (platform.includes(FILTER_CHILD_DELIMITER)) {
                        const [parentKey, childKey] = platform.split(FILTER_CHILD_DELIMITER).map(s => s.trim());
                        if (parentKey && childKey) {
                            childPlatforms.add(platform);
                            if (!parentToChildren.has(parentKey)) {
                                parentToChildren.set(parentKey, new Set());
                            }
                            parentToChildren.get(parentKey)!.add(childKey);
                        }
                    } else {
                        // Проверяем, не является ли это дочерним элементом, который был добавлен без разделителя
                        // ВАЖНО: проверяем ТОЛЬКО в platformConfig, так как это группа платформ
                        // Если у нас есть конфиг с children, и это имя совпадает с одним из children, то это дочерний элемент
                        let isChild = false;
                        // Проверяем только в platformConfig, не в genreConfig
                        for (const [parentName, parentConfig] of Object.entries(platformConfig)) {
                            if (parentConfig.children && parentConfig.children[platform]) {
                                // Это дочерний элемент в группе платформ, добавляем в правильном формате
                                const childPlatform = `${parentName}${FILTER_CHILD_DELIMITER}${platform}`;
                                if (!childPlatforms.has(childPlatform)) {
                                    childPlatforms.add(childPlatform);
                                    if (!parentToChildren.has(parentName)) {
                                        parentToChildren.set(parentName, new Set());
                                    }
                                    parentToChildren.get(parentName)!.add(platform);
                                }
                                isChild = true;
                                break;
                            }
                        }
                        if (!isChild) {
                            parentPlatforms.add(platform);
                        }
                    }
                });
                
                // Показываем только дочерние значения, если они есть, иначе показываем родительские
                const platformsToShow = new Set<string>();
                childPlatforms.forEach(childPlatform => platformsToShow.add(childPlatform));
                parentPlatforms.forEach(parentPlatform => {
                    if (!parentToChildren.has(parentPlatform)) {
                        platformsToShow.add(parentPlatform);
                    }
                });
                
                // Дедупликация: используем Map для отслеживания уже показанных значений (нормализованные имена -> оригинальное значение)
                const shownPlatforms = new Map<string, string>();
                
                return Array.from(platformsToShow).map((platform, index) => {
                    if (!platform) return null;
                    
                    // Извлекаем имя для проверки дубликатов и отображения
                    const displayName = platform.includes(FILTER_CHILD_DELIMITER) 
                        ? platform.split(FILTER_CHILD_DELIMITER)[1] 
                        : platform;
                    
                    // Нормализуем имя для проверки дубликатов (используем ту же функцию нормализации)
                    const normalizedName = normalizeName(displayName);
                    
                    // Пропускаем, если уже показали это значение (внутри платформ или глобально, включая жанры)
                    if (shownPlatforms.has(normalizedName) || allShownNormalizedRef.current.has(normalizedName)) return null;
                    shownPlatforms.set(normalizedName, platform);
                    allShownNormalizedRef.current.add(normalizedName);
                    
                    const config = getConfigForValue(platformConfig, platform);
                    if (!config) return null;
                    
                    const showIcons = config.showIcons !== false;
                    
                    const displayContent = showIcons && config.customSvg ? (
                        <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                    ) : showIcons && config.iconName ? (
                        getIconNode(config.iconName, 'w-4 h-4')
                    ) : config.symbol ? (
                        <span className="text-xs">{config.symbol}</span>
                    ) : null;
                    
                    if (!displayContent) return null;
                    return (
                        <div 
                            key={`${platform}-${index}`} 
                            title={displayName} 
                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black`} 
                            style={getBackgroundStyle(config.color)}
                            data-platform-chip 
                            role="img" 
                            aria-label={`Platform: ${displayName}`}
                        >
                            {displayContent}
                        </div>
                    );
                }).filter(Boolean);
            })()}
            {(() => {
                // Отображаем иконки для всех остальных групп фильтров (кроме genre и platform)
                const genreGroup = genreGroupId || filterAssignments.genre;
                const platformGroup = platformGroupId || filterAssignments.platform;
                const excludedGroups = new Set([genreGroup, platformGroup].filter(Boolean));
                
                const otherFilterIcons: React.ReactNode[] = [];
                
                // Проходим по всем группам фильтров
                Object.entries(filterGroups).forEach(([groupId, group]) => {
                    // Пропускаем genre и platform, они уже обработаны выше
                    if (excludedGroups.has(groupId)) return;
                    
                    // Получаем значения фильтров для этой группы из product.filterValues
                    const filterValues = product.filterValues?.[groupId] || [];
                    if (filterValues.length === 0) return;
                    
                    const groupConfig = group.items;
                    
                    // Разделяем значения на родительские и дочерние
                    const parentValues = new Set<string>();
                    const childValues = new Set<string>();
                    const parentToChildren = new Map<string, Set<string>>();
                    
                    filterValues.forEach((value) => {
                        const trimmedValue = typeof value === 'string' ? value.trim() : String(value).trim();
                        if (!trimmedValue) return;
                        
                        // Проверяем, является ли это дочерним значением (формат parent::child)
                        if (trimmedValue.includes(FILTER_CHILD_DELIMITER)) {
                            const [parentKey, childKey] = trimmedValue.split(FILTER_CHILD_DELIMITER).map(s => s.trim());
                            if (parentKey && childKey) {
                                childValues.add(trimmedValue);
                                if (!parentToChildren.has(parentKey)) {
                                    parentToChildren.set(parentKey, new Set());
                                }
                                parentToChildren.get(parentKey)!.add(childKey);
                            }
                        } else {
                            parentValues.add(trimmedValue);
                        }
                    });
                    
                    // Для каждого значения фильтра создаем иконку
                    // Показываем только дочерние значения, если они есть, иначе показываем родительские
                    const valuesToShow = new Set<string>();
                    
                    // Добавляем все дочерние значения
                    childValues.forEach(childValue => valuesToShow.add(childValue));
                    
                    // Добавляем родительские значения только если для них нет дочерних
                    parentValues.forEach(parentValue => {
                        if (!parentToChildren.has(parentValue)) {
                            valuesToShow.add(parentValue);
                        }
                    });
                    
                    // Дедупликация: используем Map для отслеживания уже показанных значений (нормализованные имена -> оригинальное значение)
                    // Используем ту же функцию normalizeName, что и для жанров/платформ
                    const shownValues = new Map<string, string>();
                    
                    valuesToShow.forEach((value, index) => {
                        const trimmedValue = typeof value === 'string' ? value.trim() : String(value).trim();
                        if (!trimmedValue) return;
                        
                        const config = getConfigForValue(groupConfig, trimmedValue);
                        if (!config) return;
                        
                        // Извлекаем имя для отображения (убираем parent::child формат)
                        const displayName = trimmedValue.includes(FILTER_CHILD_DELIMITER) 
                            ? trimmedValue.split(FILTER_CHILD_DELIMITER)[1] 
                            : trimmedValue;
                        
                        // Нормализуем имя для проверки дубликатов (используем ту же функцию)
                        const normalizedName = normalizeName(displayName);
                        
                        // Пропускаем, если уже показали это значение (внутри этой группы или глобально)
                        if (shownValues.has(normalizedName) || allShownNormalizedRef.current.has(normalizedName)) return;
                        shownValues.set(normalizedName, trimmedValue);
                        allShownNormalizedRef.current.add(normalizedName);
                        
                        // Проверяем, является ли это дочерним элементом (формат "Parent::Child")
                        const isChildElement = trimmedValue.includes(FILTER_CHILD_DELIMITER);
                        // Проверяем, есть ли у родительского элемента children
                        
                        const showIcons = config.showIcons !== false;
                        
                        const displayContent = showIcons && config.customSvg ? (
                            <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                        ) : showIcons && config.iconName ? (
                            getIconNode(config.iconName, 'w-4 h-4')
                        ) : config.symbol ? (
                            <span className="text-xs">{config.symbol}</span>
                        ) : null;
                        
                        if (!displayContent) return;
                        
                        otherFilterIcons.push(
                            <div 
                                key={`${groupId}-${trimmedValue}-${index}`} 
                                title={`${group.label}: ${displayName}`} 
                                className={`${getBackgroundClassName(config.color)} ${config.textColor} w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black`} 
                                style={getBackgroundStyle(config.color)}
                                data-platform-chip 
                                role="img" 
                                aria-label={`${group.label}: ${displayName}`}
                            >
                                {displayContent}
                            </div>
                        );
                    });
                });
                
                return otherFilterIcons;
            })()}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
