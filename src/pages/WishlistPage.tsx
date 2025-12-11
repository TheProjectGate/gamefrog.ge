import React, { useMemo, useState } from 'react';
import { HeartIcon, CartIcon, ChevronLeftIcon, CheckIcon, CoinIcon } from '../components/Icons';
import useStore from '../store/useStore';
import * as LucideIcons from 'lucide-react';
import { getBackgroundStyle, getBackgroundClassName } from '../utils/colorUtils';
import { sanitizeSVG } from '../utils/sanitize';

const WishlistPage: React.FC = () => {
    const products = useStore(state => state.products);
    const wishlist = useStore(state => state.wishlist);
    const cart = useStore(state => state.cart);
    const toggleWishlist = useStore(state => state.toggleWishlist);
    const addToCart = useStore(state => state.addToCart);
    const navigate = useStore(state => state.navigate);
    const goBack = useStore(state => state.goBack);
    const filterGroups = useStore(state => state.filterGroups);
    const filterAssignments = useStore(state => state.filterAssignments);
    const genreConfig = (filterAssignments.genre && filterGroups[filterAssignments.genre]?.items) || {};
    const platformConfig = (filterAssignments.platform && filterGroups[filterAssignments.platform]?.items) || {};

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

    const getConfigForValue = (config: any, value: string) => {
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
    };
    const wishlistProducts = useMemo(() => {
        return products.filter(product => wishlist.includes(product.id));
    }, [products, wishlist]);
    const [sortBy, setSortBy] = useState('name-asc');

    const sortedWishlistProducts = useMemo(() => {
        const sorted = [...wishlistProducts];
        sorted.sort((a, b) => {
            switch(sortBy) {
                case 'price-asc': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                default: return 0;
            }
        });
        return sorted;
    }, [wishlistProducts, sortBy]);

    if (sortedWishlistProducts.length === 0) {
        return (
        <div className="bg-white border-4 border-black text-center p-12 animate-fade-in">
            <h1 className="text-5xl font-display text-black uppercase mb-4">Your Wishlist is Empty</h1>
            <p className="text-lg text-black/80 mb-8">Add your favorite items here to save them for later.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={goBack}
                    className="bg-white text-black font-bold text-lg py-4 px-10 border-4 border-black transition-colors hover:bg-gray-200 w-full sm:w-auto btn-pop"
                >
                    Go Back
                </button>
                <button
                onClick={() => navigate('browse')}
                className="bg-[#FFD700] text-black font-bold text-lg py-4 px-10 border-4 border-black transition-colors hover:bg-black hover:text-[#FFD700] w-full sm:w-auto btn-pop"
                >
                Discover Products
                </button>
            </div>
        </div>
        );
    }

    return (
        <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b-4 border-black pb-4">
            <div className="flex items-center gap-4">
            <button
                onClick={goBack}
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors"
                aria-label="Go back"
            >
                <ChevronLeftIcon className="w-7 h-7 text-black" />
            </button>
            <div>
                <h1 className="text-5xl font-display text-black uppercase">
                Your Wishlist
                </h1>
                <p className="font-semibold text-black/80 mt-1">{sortedWishlistProducts.length} items</p>
            </div>
            </div>
            <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border-4 border-black p-2 font-bold text-base focus:outline-none focus:ring-4 focus:ring-[#FFD700] transition h-full w-full sm:w-auto"
                aria-label="Sort wishlist items"
            >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="price-asc">Price (Low to High)</option>
                <option value="price-desc">Price (High to Low)</option>
            </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedWishlistProducts.map(product => {
            const isInCart = cart.some(item => item.id === product.id);
            
            return (
                <div key={product.id} className="bg-white border-4 border-black flex flex-col group relative">
                <div className="relative w-full aspect-square overflow-hidden bg-gray-200 py-4">
                    <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 flex-wrap">
                        {product.goldCoins && product.goldCoins > 0 && (
                            <div className="bg-[#FFD700] text-black text-xs font-bold px-2 py-1 border-2 border-black flex items-center gap-1">
                                <CoinIcon className="w-4 h-4" />
                                <span>+{product.goldCoins}</span>
                            </div>
                        )}
                        {product.bundleItems && product.bundleItems.length >= 2 && (
                            <div className="bg-black text-white text-[10px] font-black uppercase px-3 py-1 border-2 border-black tracking-[0.2em]">
                                Bundle
                            </div>
                        )}
                        {(product.tags?.includes('sale') || product.discountPercent) && (
                            <div className="bg-[#FF0000] text-white text-xs font-bold uppercase px-3 py-1 tracking-wider border-2 border-black">
                                {product.discountPercent ? `−${product.discountPercent}%` : 'Sale'}
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-5 text-center flex-grow flex flex-col">
                    <h3 className="text-xl font-bold text-black truncate">{product.name}</h3>
                    <div className="mt-2 flex items-center justify-center gap-3">
                        {product.coinExclusive && product.coinPrice ? (
                            <p className="text-2xl font-black flex items-center gap-2">
                                <CoinIcon className="w-6 h-6 text-[#9333EA]" />
                                <span className="text-[#9333EA]">{product.coinPrice}</span>
                            </p>
                        ) : product.discountPercent ? (
                            <>
                                <div className="text-sm font-bold text-black/60 line-through">
                                    ${product.price.toFixed(2)}
                                </div>
                                <div className="text-2xl font-black text-[#FF0000]">
                                    ${(product.price * (1 - product.discountPercent / 100)).toFixed(2)}
                                </div>
                            </>
                        ) : (
                            <p className="text-2xl font-black text-[#107C10]">
                                ${product.price.toFixed(2)}
                            </p>
                        )}
                    </div>
                    <div className="mt-4 flex justify-center items-center gap-2 flex-wrap">
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
                                        className={`${getBackgroundClassName(config.color)} ${config.textColor} h-7 px-2 flex items-center justify-center font-bold text-sm border-2 border-black`}
                                        style={getBackgroundStyle(config.color)}
                                    >
                                        {displayContent}
                                    </div>
                                );
                            });
                        })()}
                        {(() => {
                            const basePlatforms = product.platforms || [];
                            const extraPlatforms = filterAssignments.platform ? (product.filterValues?.[filterAssignments.platform] || []) : [];
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
                                    >
                                        {displayContent}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                    <div className="mt-auto pt-4 border-t-2 border-dashed border-black/10 flex flex-col gap-2">
                    <button 
                        onClick={() => !isInCart && addToCart(product)}
                        disabled={isInCart}
                        className={`w-full font-bold py-3 px-4 border-4 border-black flex items-center justify-center gap-2 transition-colors ${
                            isInCart
                            ? 'bg-gray-200 text-black/60 cursor-not-allowed'
                            : 'bg-[#FFD700] text-black hover:bg-black hover:text-[#FFD700] btn-pop'
                        }`}
                    >
                        {isInCart ? <CheckIcon className="w-5 h-5" /> : <CartIcon className="w-5 h-5" />}
                        <span>{isInCart ? 'Added to Cart' : 'Add to Cart'}</span>
                    </button>
                    <button 
                        onClick={() => toggleWishlist(product.id)}
                        className="w-full bg-white text-black font-bold py-3 px-4 border-4 border-black flex items-center justify-center gap-2 transition-colors hover:bg-red-500 hover:text-white btn-pop"
                    >
                        <HeartIcon className="w-5 h-5" />
                        <span>Remove</span>
                    </button>
                    </div>
                </div>
                </div>
            );
            })}
        </div>
        </div>
    );
};

export default WishlistPage;
