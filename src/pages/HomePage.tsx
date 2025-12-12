import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ProductSection from '../components/ProductSection';
import ProductCard from '../components/ProductCard';
import useStore from '../store/useStore';

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
    const genreConfig = (filterAssignments.genre && filterGroups[filterAssignments.genre]?.items) || {};
    const platformConfig = (filterAssignments.platform && filterGroups[filterAssignments.platform]?.items) || {};

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
            // Получаем платформы из filterValues (новый формат)
            const platformGroup = filterAssignments.platform;
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
            
            // Объединяем все платформы
            const allPlatforms = [...new Set([...filterValuePlatforms, ...legacyPlatforms])];
            
            // Проверяем, есть ли совпадение с разрешенными платформами
            // Учитываем формат parent::child
            return allPlatforms.some(platform => {
                const trimmed = typeof platform === 'string' ? platform.trim() : String(platform).trim();
                if (!trimmed) return false;
                
                // Если платформа в формате parent::child
                if (trimmed.includes('::')) {
                    const [parentKey, childKey] = trimmed.split('::').map(s => s.trim());
                    // Проверяем, совпадает ли parent с выбранной платформой
                    if (parentKey === selectedPlatform) return true;
                    // Проверяем, совпадает ли child с выбранной платформой
                    if (childKey === selectedPlatform) return true;
                    // Проверяем, является ли parent дочерним элементом выбранной платформы
                    if (childPlatforms.includes(parentKey)) return true;
                    // Проверяем, является ли child дочерним элементом выбранной платформы
                    if (childPlatforms.includes(childKey)) return true;
                    // Проверяем прямое совпадение всей строки
                    if (allowedPlatforms.has(trimmed)) return true;
                }
                
                // Проверяем прямое совпадение
                if (trimmed === selectedPlatform) return true;
                if (allowedPlatforms.has(trimmed)) return true;
                
                // Проверяем, является ли это дочерним элементом выбранной платформы
                if (childPlatforms.includes(trimmed)) return true;
                
                return false;
            });
        });
    }, [products, selectedPlatform, platformConfig, filterAssignments.platform]);

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
                    <ProductCard
                key={product.id} 
                        product={product}
                        isInWishlist={wishlist.includes(product.id)}
                        onToggleWishlist={toggleWishlist}
                        genreConfig={genreConfig}
                        platformConfig={platformConfig}
                        onProductClick={openProductModal}
                    />
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
                        ? `bg-[#FFD700] text-black transform translate-x-1 translate-y-1 shadow-none` 
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
