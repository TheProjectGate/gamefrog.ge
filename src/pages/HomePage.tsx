import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ProductSection from '../components/ProductSection';
import ProductCard from '../components/ProductCard';
import useStore from '../store/useStore';
import { HeartIcon, CoinIcon } from '../components/Icons';
import * as LucideIcons from 'lucide-react';
import { FilterConfig } from '../types';
import { getBackgroundStyle, getBackgroundClassName } from '../utils/colorUtils';
import { sanitizeSVG } from '../utils/sanitize';

const ALL_PLATFORMS_VALUE = '__all__';

interface HomeSection {
    key: string;
    order: number;
    enabled: boolean;
}

const HomePage: React.FC = () => {
    const { t } = useTranslation();
    const products = useStore(state => state.products);
    const searchQuery = useStore(state => state.searchQuery);
    const openProductModal = useStore(state => state.openProductModal);
    const toggleWishlist = useStore(state => state.toggleWishlist);
    const wishlist = useStore(state => state.wishlist);
    const filterGroups = useStore(state => state.filterGroups);
    const filterAssignments = useStore(state => state.filterAssignments);
    const genreConfig = filterGroups[filterAssignments.genre]?.items || {};
    const platformConfig = filterGroups[filterAssignments.platform]?.items || {};

    const [selectedPlatform, setSelectedPlatform] = useState<string>(ALL_PLATFORMS_VALUE);
    const [sectionsOrder, setSectionsOrder] = useState<HomeSection[]>([]);
    
    const platformFilters = useMemo(() => [
        {
            value: ALL_PLATFORMS_VALUE,
            label: t('home.all'),
            color: 'bg-[#FFD700]',
            textColor: 'text-black'
        },
        ...Object.entries(platformConfig).map(([name, config]) => ({
            value: name,
            label: name,
            color: config.color,
            textColor: config.textColor,
        })),
    ], [platformConfig, t]);
    
    const filteredByPlatformProducts = useMemo(() => {
        if (selectedPlatform === ALL_PLATFORMS_VALUE) return products;

        const selectedPlatformConfig = platformConfig[selectedPlatform];
        const childPlatforms = selectedPlatformConfig?.children
            ? Object.keys(selectedPlatformConfig.children)
            : [];
        const allowedPlatforms = new Set([selectedPlatform, ...childPlatforms]);

        return products.filter(product => {
            let platforms: string[] = [];
            if (Array.isArray(product.platforms)) {
                platforms = product.platforms;
            } else if (typeof product.platforms === 'string') {
                try {
                    const parsed = JSON.parse(product.platforms);
                    if (Array.isArray(parsed)) {
                        platforms = parsed;
                    }
                } catch (e) { /* ignore */ }
            }
            return platforms.some(platform => allowedPlatforms.has(platform));
        });
    }, [products, selectedPlatform, platformConfig]);

    const globallyFilteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        const lowercasedQuery = searchQuery.toLowerCase().trim();
        return filteredByPlatformProducts.filter(product => 
            product.name.toLowerCase().startsWith(lowercasedQuery)
        );
    }, [searchQuery, filteredByPlatformProducts]);
    
    // Load sections order
    useEffect(() => {
        const fetchSectionsOrder = async () => {
            const defaultOrder = [
                { key: 'coinsExclusive', order: 1, enabled: true },
                { key: 'bundleDeals', order: 2, enabled: true },
                { key: 'newReleases', order: 3, enabled: true },
                { key: 'bestSellers', order: 4, enabled: true },
                { key: 'retroCorner', order: 5, enabled: true },
                { key: 'merch', order: 6, enabled: true }
            ];

            try {
                // Используем относительный путь, так как Vite проксирует /api на бэкенд
                const API_BASE_URL = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${API_BASE_URL}/api/home-sections`);
                
                if (!response.ok) {
                    // If not OK, use default order silently
                    setSectionsOrder(defaultOrder);
                    return;
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    // If not JSON, use default order silently
                    setSectionsOrder(defaultOrder);
                    return;
                }
                
                try {
                    const sections = await response.json();
                    if (Array.isArray(sections) && sections.length > 0) {
                        setSectionsOrder(sections);
                    } else {
                        setSectionsOrder(defaultOrder);
                    }
                } catch (jsonError) {
                    // JSON parse error, use default order
                    setSectionsOrder(defaultOrder);
                }
            } catch (error) {
                // Any error, use default order silently
                setSectionsOrder(defaultOrder);
            }
        };
        fetchSectionsOrder();
    }, []);

    const getIconNode = useCallback((iconName?: string, className?: string) => {
        if (!iconName) return null;
        const raw = String(iconName).trim();
        const tryNames = [raw, raw.replace(/\s+/g, ''), raw.replace(/[^a-zA-Z0-9]/g, '')];
        for (const key of tryNames) {
            const CompA = (LucideIcons as any)[key];
            if (CompA) return <CompA className={className || 'w-3 h-3'} />;
            const pascal = key
                .split(/[^a-zA-Z0-9]+/)
                .filter(Boolean)
                .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                .join('');
            const CompB = (LucideIcons as any)[pascal];
            if (CompB) return <CompB className={className || 'w-3 h-3'} />;
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

    const coinExclusiveProducts = filteredByPlatformProducts.filter(p => p.coinExclusive);
    const bundleProducts = filteredByPlatformProducts.filter(p => (p.bundleItems?.length || 0) >= 2);
    const newReleases = filteredByPlatformProducts.filter(p => p.tags?.includes('new'));
    const bestSellers = filteredByPlatformProducts.filter(p => p.tags?.includes('bestseller'));
    const retroCorner = filteredByPlatformProducts.filter(p => p.tags?.includes('retro'));
    const merch = filteredByPlatformProducts.filter(p => p.tags?.includes('merch'));

    // Sort sections by order from database
    const sortedSections = useMemo(() => {
        const sectionsConfig = [
            { key: 'coinsExclusive', products: coinExclusiveProducts, title: t('home.coinsExclusive'), itemsPerView: undefined },
            { key: 'bundleDeals', products: bundleProducts, title: t('home.bundleDeals'), itemsPerView: 2 },
            { key: 'newReleases', products: newReleases, title: t('home.newReleases'), itemsPerView: undefined },
            { key: 'bestSellers', products: bestSellers, title: t('home.bestSellers'), itemsPerView: undefined },
            { key: 'retroCorner', products: retroCorner, title: t('home.retroCorner'), itemsPerView: undefined },
            { key: 'merch', products: merch, title: t('home.newMerch'), itemsPerView: undefined }
        ];

        if (sectionsOrder.length === 0) {
            // Return default order if not loaded yet
            return sectionsConfig;
        }
        return sectionsConfig
            .map(section => {
                const orderInfo = sectionsOrder.find(s => s.key === section.key);
                return {
                    ...section,
                    order: orderInfo?.order || 999,
                    enabled: orderInfo?.enabled !== false
                };
            })
            .filter(section => section.enabled)
            .sort((a, b) => a.order - b.order);
    }, [sectionsOrder, coinExclusiveProducts, bundleProducts, newReleases, bestSellers, retroCorner, merch, t]);

    if (searchQuery) {
        return globallyFilteredProducts.length > 0 ? (
            <div className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 pb-8">
            {globallyFilteredProducts.map((product) => {
                return (
                <div 
                key={product.id} 
                className="cursor-pointer group"
                onClick={() => openProductModal(product)}
                >
                <div className="bg-white border-4 border-black hover:border-[#FFD700] transition-all hover:-translate-y-1 btn-pop flex flex-col h-full">
                    <div className="relative aspect-square bg-gray-200 overflow-hidden flex-shrink-0">
                        <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.goldCoins && product.goldCoins > 0 && (
                            <div className="absolute top-1 left-1 bg-[#FFD700] text-black text-[8px] font-bold px-1 py-0.5 border-2 border-black flex items-center gap-0.5 z-10">
                                <CoinIcon className="w-2.5 h-2.5" />
                                <span>+{product.goldCoins}</span>
                            </div>
                        )}
                        {(product.bundleItems?.length || 0) >= 2 && (
                            <div className="absolute top-1 right-1 bg-black text-white text-[7px] font-black uppercase px-1 py-0.5 border-2 border-black tracking-wider z-10">
                                Bundle
                            </div>
                        )}
                        {product.tags?.includes('sale') && (
                            <div className="absolute bottom-1 left-1 bg-[#FF0000] text-white text-[7px] font-bold uppercase px-1 py-0.5 border-2 border-black tracking-wider z-10">
                                Sale
                            </div>
                        )}
                    </div>
                    <div className="p-1.5 sm:p-2 flex flex-col flex-grow min-h-0">
                        <h3 className="text-[10px] sm:text-xs font-bold text-black truncate mb-0.5" title={product.name}>
                            {product.name}
                        </h3>
                        {product.description && (
                            <p className="text-[9px] sm:text-[10px] text-black/70 line-clamp-2 mb-1 leading-tight">
                                {product.description}
                            </p>
                        )}
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] sm:text-xs font-black text-[#107C10]">
                                    ${(typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0).toFixed(2)}
                                </p>
                                {!product.coinExclusive && (
                                    <span className="text-[8px] sm:text-[9px] font-bold text-black line-through opacity-70">
                                        ${((typeof product.price === 'number' ? product.price : parseFloat(String(product.price)) || 0) * 1.2).toFixed(2)}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist(product.id);
                                }}
                                className="w-4 h-4 flex items-center justify-center border-2 border-black bg-white transition-colors hover:bg-gray-100 flex-shrink-0"
                                aria-label={wishlist.includes(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                            >
                                <HeartIcon className={`w-2.5 h-2.5 ${wishlist.includes(product.id) ? 'text-red-500' : 'text-black'}`} isFilled={wishlist.includes(product.id)} />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap mt-auto">
                            {(() => {
                                const baseGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                                const extraGenres = filterAssignments.genre ? (product.filterValues?.[filterAssignments.genre] || []) : [];
                                const allGenres = [...new Set([...baseGenres, ...extraGenres])];
                                return allGenres.map((genre, index) => {
                                    const config = getConfigForValue(genreConfig, genre);
                                    if (!config) return null;
                                    const displayContent = config.customSvg ? (
                                        <div className="w-3 h-3 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                                    ) : config.iconName ? (
                                        getIconNode(config.iconName, 'w-3 h-3')
                                    ) : config.symbol ? (
                                        <span className="text-[8px]">{config.symbol}</span>
                                    ) : null;
                                    if (!displayContent) return null;
                                    return (
                                        <div 
                                            key={`${genre}-${index}`}
                                            title={genre} 
                                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-4 h-4 flex items-center justify-center border-2 border-black`}
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
                                        }
                                    } catch (e) { /* ignore */ }
                                }
                                const extraPlatforms = filterAssignments.platform ? (product.filterValues?.[filterAssignments.platform] || []) : [];
                                const allPlatforms = [...new Set([...basePlatforms, ...extraPlatforms])];
                                
                                const platformIcons = allPlatforms.slice(0, 3).map(platform => {
                                    const config = getConfigForValue(platformConfig, platform);
                                    if (!config) return null;
                                    const displayContent = config.customSvg ? (
                                        <div className="w-3 h-3 svg-container" dangerouslySetInnerHTML={{ __html: sanitizeSVG(config.customSvg) }} />
                                    ) : config.iconName ? (
                                        getIconNode(config.iconName, 'w-3 h-3')
                                    ) : config.symbol ? (
                                        <span className="text-[8px]">{config.symbol}</span>
                                    ) : null;
                                    if (!displayContent) return null;
                                    return (
                                        <div 
                                            key={platform} 
                                            title={platform} 
                                            className={`${getBackgroundClassName(config.color)} ${config.textColor} w-4 h-4 flex items-center justify-center border-2 border-black`}
                                            style={getBackgroundStyle(config.color)}
                                        >
                                            {displayContent}
                                        </div>
                                    );
                                });

                                return (
                                    <>
                                        {platformIcons}
                                        {allPlatforms.length > 3 && (
                                            <div className="text-[8px] text-black/60 font-bold">
                                                +{allPlatforms.length - 3}
                                            </div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>
                </div>
                );
            })}
            </div>
            </div>
        ) : (
            <div className="text-center py-16 col-span-full">
            <h2 className="text-2xl font-semibold text-black">{t('home.noProductsFound')}</h2>
            <p className="text-black/80 mt-2">{t('home.tryAdjustingSearch')}</p>
            </div>
        );
    }

    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-display text-black mb-2 uppercase">{t('home.title')}</h1>
          <p className="text-lg text-black/80">{t('home.subtitle')}</p>
        </div>
        
        <div className="flex justify-center items-center gap-3 sm:gap-4 flex-wrap mb-12">
            {platformFilters.map(platform => (
                <button
                    key={platform.value}
                    onClick={() => setSelectedPlatform(platform.value)}
                    data-platform-button
                    className={`font-bold text-sm sm:text-base py-3 px-6 sm:px-8 border-4 border-black transition-all
                    ${selectedPlatform === platform.value 
                        ? `${platform.color} ${platform.textColor} transform translate-x-1 translate-y-1 shadow-none` 
                        : 'bg-white text-black hover:bg-gray-200 btn-pop'}`
                    }
                >
                    {platform.label}
                </button>
            ))}
        </div>
        
        {sortedSections.map(section => (
            <ProductSection
                key={section.key}
                title={section.title}
                products={section.products}
                onProductClick={openProductModal}
                onToggleWishlist={toggleWishlist}
                wishlist={wishlist}
                genreConfig={genreConfig}
                platformConfig={platformConfig}
                itemsPerView={section.itemsPerView}
            />
        ))}
      </>
    );
};

export default HomePage;
