import React, { useMemo, useState } from 'react';
import { CartIcon, ChevronLeftIcon, CheckIcon } from '../components/Icons';
import useStore from '../store/useStore';
import ProductCard from '../components/ProductCard';

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

    const openProductModal = useStore(state => state.openProductModal);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {sortedWishlistProducts.map(product => {
            const isInCart = cart.some(item => item.id === product.id);
            const isBundle = (product.bundleItems?.length || 0) >= 2;
            
            return (
                <div 
                    key={product.id} 
                    className={`relative group flex flex-col h-full ${isBundle ? 'sm:col-span-2 lg:col-span-2 xl:col-span-2' : ''}`}
                >
                    <div className="flex-grow flex flex-col h-full">
                        <ProductCard
                            product={product}
                            isInWishlist={wishlist.includes(product.id)}
                            onToggleWishlist={toggleWishlist}
                            genreConfig={genreConfig}
                            platformConfig={platformConfig}
                            onProductClick={openProductModal}
                        />
                    </div>
                    <div className="mt-2 border-t-2 border-dashed border-black/10 pt-2 flex flex-col gap-2">
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
                    </div>
                </div>
            );
            })}
        </div>
        </div>
    );
};

export default WishlistPage;
