import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Product, FilterConfig } from '../types';
import { CloseIcon, HeartIcon, CoinIcon, PlayIcon, VolumeIcon } from './Icons';
import useStore, { FILTER_CHILD_DELIMITER } from '../store/useStore';
import * as LucideIcons from 'lucide-react';
import { getBackgroundStyle, getBackgroundClassName } from '../utils/colorUtils';
import { sanitizeSVG } from '../utils/sanitize';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (productId: number) => void;
  isInWishlist: boolean;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onAddToCart, onToggleWishlist, isInWishlist }) => {
  const products = useStore(state => state.products);
  const openProductModal = useStore(state => state.openProductModal);
  const filterGroups = useStore(state => state.filterGroups);
  const filterAssignments = useStore(state => state.filterAssignments);
  const genreConfig = (filterAssignments.genre && filterGroups[filterAssignments.genre]?.items) || {};
  const platformConfig = (filterAssignments.platform && filterGroups[filterAssignments.platform]?.items) || {};
  const [imageError, setImageError] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Общая функция нормализации и Set для дедупликации между группами
  const normalizeName = useCallback((name: string) => name.toLowerCase().trim().replace(/\s+/g, ' '), []);
  const allShownNormalizedRef = useRef<Set<string>>(new Set());
  
  // Очищаем Set при каждом рендере модального окна
  allShownNormalizedRef.current.clear();

  // Extract YouTube video ID from URL or use direct ID
  const getYouTubeVideoId = useCallback((urlOrId?: string): string | null => {
    if (!urlOrId) return null;
    // If it's already just an ID (no special characters except dash and underscore)
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
      return urlOrId;
    }
    // Try to extract from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = urlOrId.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }, []);

  const youtubeVideoId = useMemo(() => getYouTubeVideoId(product.youtubeVideoId), [product.youtubeVideoId, getYouTubeVideoId]);

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
  const individualTotal = useMemo(() => {
    if (!isBundle) return 0;
    return bundleItemsDetailed.reduce((sum, item) => sum + item.price, 0);
  }, [isBundle, bundleItemsDetailed]);

  const bundleSavings = isBundle ? Math.max(0, individualTotal - product.price) : 0;
  
  const safePrice = (price: number | string | undefined): number => {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') return parseFloat(price) || 0;
    return 0;
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 md:p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      aria-describedby="product-modal-description"
    >
      {isVideoFullscreen && youtubeVideoId ? (
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <button 
            onClick={() => {
              setIsVideoFullscreen(false);
              setIsVideoMode(false);
              setIsMuted(true);
            }}
            className="absolute top-4 right-4 bg-white hover:bg-[#FF0000] text-black hover:text-white transition-colors z-20 border-4 border-black p-3"
            aria-label="Close video"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
          <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-black">
            <iframe
              key={`video-fullscreen-${youtubeVideoId}`}
              ref={iframeRef}
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&showinfo=0`}
              title={`${product.name} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
        </div>
      ) : (
        <div 
          className="relative bg-white border-4 border-black w-full max-w-[95vw] md:max-w-6xl h-[95vh] max-h-[95vh] overflow-y-auto flex flex-col md:flex-row md:h-auto md:max-h-[95vh] md:overflow-visible md:items-stretch"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-black hover:text-[#FF0000] transition-colors z-10"
            aria-label="Close product details"
          >
            <CloseIcon className="w-8 h-8" />
          </button>

          <div className="w-full md:w-1/2 bg-gray-200 relative shrink-0 aspect-square md:aspect-square">
            {isVideoMode && youtubeVideoId ? (
              <>
                <iframe
                  key={`video-${youtubeVideoId}-${isMuted}`}
                  ref={iframeRef}
                  className="w-full h-full aspect-square cursor-pointer"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&showinfo=0`}
                  title={`${product.name} video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: 'none' }}
                  onClick={() => setIsVideoFullscreen(true)}
                />
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute top-3 left-3 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors z-10"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  <VolumeIcon className="w-5 h-5" muted={isMuted} />
                </button>
                <button
                  onClick={() => setIsVideoFullscreen(true)}
                  className="absolute bottom-3 right-3 bg-[#FF0000] hover:bg-[#FF3333] text-white p-3 border-4 border-black transition-colors z-10 font-bold uppercase text-sm"
                  aria-label="Expand video to fullscreen"
                >
                  Expand
                </button>
                <button
                  onClick={() => {
                    setIsVideoMode(false);
                    setIsMuted(true); // Reset mute when switching back to image
                  }}
                  className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors z-10"
                  aria-label="Switch to image"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                {imageError ? (
                  <div className="w-full aspect-square md:aspect-square md:h-auto flex items-center justify-center bg-gray-200" role="img" aria-label="Product image not available">
                    <span className="text-gray-400 text-sm" aria-hidden="true">Image not available</span>
                  </div>
                ) : (
                  <img 
                    src={product.imageUrl} 
                    alt={`${product.name} product image`}
                    className="w-full aspect-square object-cover md:aspect-square md:h-auto"
                    onError={() => setImageError(true)}
                  />
                )}
                {youtubeVideoId && (
                  <button
                    onClick={() => setIsVideoMode(true)}
                    className="absolute top-3 left-3 bg-[#FF0000] hover:bg-[#FFD700] text-white hover:text-black border-4 border-black transition-colors z-10 flex items-center justify-center w-12 h-12 btn-pop hover:transform-none"
                    aria-label="Play video"
                  >
                    <PlayIcon className="w-6 h-6" />
                  </button>
                )}
              </>
            )}
          </div>

        <div className="w-full md:w-1/2 p-4 sm:p-6 md:p-8 flex flex-col gap-3 sm:gap-4 h-full md:h-auto md:max-h-[min(50vw,576px)]">
          <div className="flex-1 overflow-y-auto min-h-0">
            <h2 id="product-modal-title" className="text-2xl sm:text-3xl md:text-5xl font-display text-black leading-tight truncate whitespace-nowrap overflow-hidden">{product.name}</h2>
            <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm">
              {product.goldCoins && product.goldCoins > 0 && (
                <div className="bg-[#FFD700] text-black text-xs font-bold px-2 py-1 border-2 border-black flex items-center gap-1">
                  <CoinIcon className="w-4 h-4" />
                  <span>+{product.goldCoins}</span>
                </div>
              )}
              {isBundle && (
                <div className="bg-black text-white text-xs font-bold uppercase px-3 py-1 tracking-[0.3em] border-2 border-black">
                  Bundle
                </div>
              )}
              {product.tags?.includes('sale') && (
                <div className="bg-[#FF0000] text-white text-xs font-bold uppercase px-3 py-1 tracking-wider border-2 border-black">
                  Sale
                </div>
              )}
            </div>
            
            <p id="product-modal-description" className="text-black/80 text-sm sm:text-base leading-relaxed py-[2px]">
              {product.description}
            </p>

            {isBundle && (
              <div className="border-2 border-dashed border-black/30 p-3 bg-black/5">
                <h3 className="text-lg sm:text-xl font-display uppercase text-black mb-2 sm:mb-3">Bundle Includes</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 bundle-scroll">
                  {bundleItemsDetailed.map(item => {
                    const justAddedPrice = product.price - (individualTotal - item.price);
                    const itemDiscount = item.price - Math.max(0, justAddedPrice);
                    const percent = item.price > 0 ? Math.round((itemDiscount / item.price) * 100) : 0;
                    return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        openProductModal(item);
                      }}
                      className="w-full flex items-center gap-3 text-left group bg-white hover:bg-[#FFD700] transition-all border-2 border-black hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-2"
                    >
                      <div className="w-14 h-14 bg-gray-200 border-2 border-black flex-shrink-0">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-black group-hover:text-black">{item.name}</p>
                        <p className="text-xs text-black/70 group-hover:text-black">
                          вместо ${safePrice(item.price).toFixed(2)} — 
                          <span className="text-[#FF0000] font-bold">
                            ${Math.max(0, (safePrice(item.price) - itemDiscount)).toFixed(2)}
                          </span>
                          {percent > 0 && (
                            <span className="text-[#107C10] font-black ml-1">You save {percent}%!</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/60 group-hover:text-black">View</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-start items-center gap-2 flex-wrap text-sm">
               {(() => {
                  // Упрощенная логика, как в ProductCard
                  const genreGroup = filterAssignments.genre;
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
                const platformGroup = filterAssignments.platform;
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
                        if (!addedNormalized.has(normalized)) {
                            allPlatforms.push(trimmed);
                            addedNormalized.add(normalized);
                        }
                    }
                });
                
                // Разделяем на родительские и дочерние значения
                const parentPlatforms = new Set<string>();
                const childPlatforms = new Set<string>();
                const parentToChildren = new Map<string, Set<string>>();
                
                allPlatforms.forEach((platform) => {
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
                        // Проверяем, не является ли это дочерним элементом
                        let isChild = false;
                        for (const [parentName, parentConfig] of Object.entries(platformConfig)) {
                            if (parentConfig.children && parentConfig.children[platform]) {
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
                
                // Дедупликация: используем Map для отслеживания уже показанных значений
                const shownPlatforms = new Map<string, string>();
                
                return Array.from(platformsToShow).map((platform, index) => {
                    if (!platform) return null;
                    
                    // Извлекаем имя для проверки дубликатов и отображения
                    const displayName = platform.includes(FILTER_CHILD_DELIMITER) 
                        ? platform.split(FILTER_CHILD_DELIMITER)[1] 
                        : platform;
                    
                    // Нормализуем имя для проверки дубликатов
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
                    
                    // Дедупликация: используем Map для отслеживания уже показанных значений
                    const shownValues = new Map<string, string>();
                    
                    valuesToShow.forEach((value, valueIndex) => {
                        // Извлекаем имя для проверки дубликатов и отображения
                        const displayName = value.includes(FILTER_CHILD_DELIMITER) 
                            ? value.split(FILTER_CHILD_DELIMITER)[1] 
                            : value;
                        
                        // Нормализуем имя для проверки дубликатов
                        const normalizedName = normalizeName(displayName);
                        
                        // Пропускаем, если уже показали это значение (глобально или в этой группе)
                        if (shownValues.has(normalizedName) || allShownNormalizedRef.current.has(normalizedName)) return;
                        shownValues.set(normalizedName, value);
                        allShownNormalizedRef.current.add(normalizedName);
                        
                        const config = getConfigForValue(groupConfig, value);
                        if (!config) return;
                        
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
                                key={`${groupId}-${value}-${valueIndex}`}
                                title={displayName} 
                                className={`${getBackgroundClassName(config.color)} ${config.textColor} w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-black`}
                                style={getBackgroundStyle(config.color)}
                                data-platform-chip 
                                role="img" 
                                aria-label={`${group.name || groupId}: ${displayName}`}
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
          <div className={`flex flex-col gap-4 md:gap-6 md:flex-row md:items-center md:justify-between pt-4 sm:pt-6 pb-4 sm:pb-6 md:pb-0 border-t-2 border-dashed border-[#FFD700] shrink-0 ${isBundle ? 'mt-auto' : ''}`}>
            <div className="flex items-center gap-1 justify-center md:justify-start">
              <span className="inline-flex items-center justify-center gap-1 sm:gap-1 bg-white text-xl sm:text-3xl font-black px-2 sm:px-2 py-2 sm:py-3 h-11 min-w-[130px]">
                {product.coinExclusive && product.coinPrice ? (
                  <>
                    <CoinIcon className="w-7 h-7 text-[#9333EA]" />
                    <span className="text-[#9333EA]">{product.coinPrice}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#107C10]">$</span>
                    <span className="text-[#107C10]">{safePrice(product.price).toFixed(2)}</span>
                  </>
                )}
              </span>
              {!product.coinExclusive && (
                <span className="text-base font-bold text-black line-through opacity-70">
                  ${ (safePrice(product.price) * 1.2).toFixed(2) }
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto px-4 sm:px-6 md:px-0">
               <button 
                  onClick={() => onToggleWishlist(product.id)}
                 className="w-12 h-12 flex items-center justify-center border-4 border-black bg-white transition-colors hover:bg-gray-100 btn-pop"
                  aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                  <HeartIcon className={`w-7 h-7 ${isInWishlist ? 'text-red-500' : 'text-black'}`} isFilled={isInWishlist} />
              </button>
              <button 
                onClick={() => onAddToCart(product)}
                className="btn-pop flex-1 md:flex-initial bg-[#FFD700] text-black font-bold py-3 px-6 sm:px-8 border-4 border-black transition-colors hover:bg-black hover:text-[#FFD700] h-12 flex items-center justify-center min-w-[140px]"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default ProductModal;
