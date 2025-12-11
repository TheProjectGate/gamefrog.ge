import React, { useMemo, useRef } from 'react';
import { Product, FilterConfig } from '../types';
import { HeartIcon, CoinIcon } from './Icons';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import useStore from '../store/useStore';
import * as LucideIcons from 'lucide-react';
import { getBackgroundStyle, getBackgroundClassName } from '../utils/colorUtils';
import { sanitizeSVG } from '../utils/sanitize';

interface ProductRowProps {
  product: Product;
  onProductClick: (product: Product) => void;
  onToggleWishlist: (productId: number) => void;
  isInWishlist: boolean;
  genreConfig: FilterConfig;
  platformConfig: FilterConfig;
}

const ProductRow: React.FC<ProductRowProps> = ({ product, onProductClick, onToggleWishlist, isInWishlist, genreConfig, platformConfig }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(rowRef, { threshold: 0.1 });
  const products = useStore(state => state.products);
  const filterAssignments = useStore(state => state.filterAssignments);
  const filterGroups = useStore(state => state.filterGroups);

  const getIconNode = (iconName?: string, className?: string) => {
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
  };

  const getConfigForValue = (config: FilterConfig, value: string) => {
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
  };

  const bundleItemsDetailed = useMemo(() => {
    if (!product.bundleItems || product.bundleItems.length < 2) return [];
    return product.bundleItems
      .map(id => products.find(p => p.id === id))
      .filter((item): item is Product => Boolean(item));
  }, [product.bundleItems, products]);
  const isBundle = bundleItemsDetailed.length >= 2;
  const cardClassNames = `bg-white border-4 border-black flex flex-row overflow-hidden hover:border-[#FFD700] hover:-translate-y-1 cursor-pointer group relative transition-all duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`;
  
  return (
    <div 
      ref={rowRef}
      onClick={() => onProductClick(product)}
      className={cardClassNames}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onProductClick(product)}
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
                            <span className="text-[#107C10]">{product.price.toFixed(2)}</span>
                        </>
                    )}
                </p>
                {!product.coinExclusive && (
                    <span className="text-sm font-bold text-black line-through opacity-70">
                        ${ (product.price * 1.2).toFixed(2) }
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {(() => {
                    const baseGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                    const extraGenres = filterAssignments.genre ? (product.filterValues?.[filterAssignments.genre] || []) : [];
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
                                className={`${getBackgroundClassName(config.color)} ${config.textColor} h-6 px-2 flex items-center justify-center font-bold text-xs border-2 border-black`}
                                style={getBackgroundStyle(config.color)}
                            >
                                {displayContent}
                            </div>
                        );
                    });
                })()}
                {(() => {
                    let basePlatforms: string[] = [];
                    if (Array.isArray(product.platforms)) {
                      basePlatforms = product.platforms;
                    } else if (typeof product.platforms === 'string') {
                      try {
                        const parsed = JSON.parse(product.platforms);
                        if (Array.isArray(parsed)) {
                          basePlatforms = parsed;
                        } else if (parsed) {
                          basePlatforms = [parsed];
                        }
                      } catch (e) {
                        // If JSON parsing fails, treat as a single platform string
                        if (product.platforms.trim()) {
                          basePlatforms = [product.platforms];
                        }
                      }
                    } else if (product.platforms) {
                      basePlatforms = [String(product.platforms)];
                    }
                    const extraPlatforms = filterAssignments.platform ? (product.filterValues?.[filterAssignments.platform] || []) : [];
                    const allPlatforms = [...new Set([...basePlatforms, ...extraPlatforms])]
                      .map(p => typeof p === 'string' ? p.trim() : String(p).trim())
                      .filter(Boolean);
                    return allPlatforms.map((platform, index) => {
                        if (!platform) return null;
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
                                key={`${platform}-${index}`} 
                                title={platform} 
                                className={`${getBackgroundClassName(config.color)} ${config.textColor} w-6 h-6 flex items-center justify-center font-bold text-xs border-2 border-black`}
                                style={getBackgroundStyle(config.color)}
                            >
                                {displayContent}
                            </div>
                        );
                    }).filter(Boolean);
                })()}
                {(() => {
                    // Отображаем иконки для всех остальных групп фильтров (кроме genre и platform)
                    const genreGroup = filterAssignments.genre;
                    const platformGroup = filterAssignments.platform;
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
                        
                        // Для каждого значения фильтра создаем иконку
                        filterValues.forEach((value, index) => {
                            const trimmedValue = typeof value === 'string' ? value.trim() : String(value).trim();
                            if (!trimmedValue) return;
                            
                            const config = getConfigForValue(groupConfig, trimmedValue);
                            if (!config) return;
                            
                            const displayContent = config.customSvg ? (
                                <div className="w-4 h-4 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                            ) : config.iconName ? (
                                getIconNode(config.iconName, 'w-4 h-4')
                            ) : config.symbol ? (
                                <span className="text-xs">{config.symbol}</span>
                            ) : null;
                            
                            if (!displayContent) return;
                            
                            otherFilterIcons.push(
                                <div 
                                    key={`${groupId}-${trimmedValue}-${index}`} 
                                    title={`${group.label}: ${trimmedValue}`} 
                                    className={`${getBackgroundClassName(config.color)} ${config.textColor} w-6 h-6 flex items-center justify-center font-bold text-xs border-2 border-black`}
                                    style={getBackgroundStyle(config.color)}
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
      </div>
    </div>
  );
};

export default ProductRow;
