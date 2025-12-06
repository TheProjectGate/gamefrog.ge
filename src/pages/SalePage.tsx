import React, { useMemo, useEffect, useState } from 'react';
import useStore from '../store/useStore';
import ProductRow from '../components/ProductRow';
import ProductSection from '../components/ProductSection';
import { fetchActiveOffers, LimitedTimeOffer } from '../api/offers';

const SalePage: React.FC = () => {
  const products = useStore(state => state.products);
  const openProductModal = useStore(state => state.openProductModal);
  const wishlist = useStore(state => state.wishlist);
  const toggleWishlist = useStore(state => state.toggleWishlist);
  const filters = useStore(state => state.filters);
  const setFilters = useStore(state => state.setFilters);
  const clearFilters = useStore(state => state.clearFilters);
  const filterGroups = useStore(state => state.filterGroups);
  const filterAssignments = useStore(state => state.filterAssignments);
  const genreConfig = filterGroups[filterAssignments.genre]?.items || {};
  const platformConfig = filterGroups[filterAssignments.platform]?.items || {};
  const navigate = useStore(state => state.navigate);

  const [highlightedProductIds, setHighlightedProductIds] = useState<Set<number>>(new Set());
  const [hasHighlighted, setHasHighlighted] = useState(false);
  const [offers, setOffers] = useState<LimitedTimeOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  // Fetch offers on component mount
  useEffect(() => {
    const loadOffers = async () => {
      try {
        setIsLoadingOffers(true);
        const activeOffers = await fetchActiveOffers();
        setOffers(activeOffers);
      } catch (error) {
        console.error('Failed to load offers:', error);
        setOffers([]);
      } finally {
        setIsLoadingOffers(false);
      }
    };
    loadOffers();
  }, []);

  useEffect(() => {
    // Parse highlight parameter from URL hash
    // Only highlight once when coming from offer
    const hash = window.location.hash;
    if (hash.includes('highlight=') && !hasHighlighted) {
      const params = new URLSearchParams(hash.split('?')[1] || '');
      const highlightParam = params.get('highlight');
      if (highlightParam) {
        const ids = highlightParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        setHighlightedProductIds(new Set(ids));
        setHasHighlighted(true);
        
        // Scroll to first highlighted product after a short delay
        setTimeout(() => {
          const firstHighlighted = document.querySelector(`[data-product-id="${ids[0]}"]`);
          if (firstHighlighted) {
            firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
        
        // Remove highlight parameter from URL after showing once
        // This prevents re-highlighting on page refresh
        setTimeout(() => {
          const newHash = hash.split('?')[0]; // Keep only the route part
          window.history.replaceState(null, '', newHash || '#/sale');
          
          // Clear highlight after animation (5 seconds)
          setTimeout(() => {
            setHighlightedProductIds(new Set());
          }, 5000);
        }, 100);
      }
    }
  }, [hasHighlighted]);

  const saleProducts = useMemo(
    () => products.filter((product) => product.tags?.includes('sale')),
    [products]
  );

  // Get all product IDs that are in offers
  const offerProductIds = useMemo(() => {
    const ids = new Set<number>();
    offers.forEach(offer => {
      if (offer.productIds) {
        offer.productIds.forEach(id => ids.add(id));
      }
    });
    return ids;
  }, [offers]);

  // Get products for each offer
  const offerProductsMap = useMemo(() => {
    const map = new Map<number, typeof products>();
    offers.forEach(offer => {
      if (offer.productIds && offer.productIds.length > 0) {
        const offerProducts = products.filter(p => offer.productIds?.includes(p.id));
        if (offerProducts.length > 0) {
          map.set(offer.id, offerProducts);
        }
      }
    });
    return map;
  }, [offers, products]);

  // Get products not in any offer (for Full Sale Catalog)
  const productsNotInOffers = useMemo(
    () => saleProducts.filter(product => !offerProductIds.has(product.id)),
    [saleProducts, offerProductIds]
  );

  const coinExclusiveProducts = useMemo(
    () => products.filter((product) => product.coinExclusive),
    [products]
  );

  const handleShowAll = () => {
    clearFilters();
    setFilters({ sortBy: 'price-asc' });
  };

  if (saleProducts.length === 0) {
    return (
      <div className="text-center py-20 bg-white border-4 border-black">
        <h1 className="text-5xl font-display uppercase text-black">Sale Is Coming Soon!</h1>
        <p className="mt-4 text-black/70 text-lg font-semibold">
          Stay tuned for our next wave of deals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="bg-white border-4 border-black p-8 text-center space-y-4">
        <span className="inline-block px-4 py-2 bg-[#FF3131] text-white font-black uppercase tracking-[0.4em]">
          Hot Deals
        </span>
        <h1 className="text-5xl sm:text-6xl font-display uppercase text-black">
          Mega Sale Showcase
        </h1>
        <p className="text-black/70 text-lg sm:text-xl max-w-2xl mx-auto">
          Explore massive discounts on best-selling games, consoles, and exclusive merch.
        </p>
        <button
          onClick={handleShowAll}
          className="mt-4 inline-flex items-center justify-center px-6 py-3 font-bold uppercase tracking-[0.3em] bg-[#FFD700] text-black border-4 border-black hover:bg-black hover:text-[#FFD700] transition-colors"
        >
          Reset Filters &amp; Browse All Deals
        </button>
      </div>

      <ProductSection
        title="Featured Sale Picks"
        products={saleProducts.slice(0, 8)}
        onProductClick={openProductModal}
        onToggleWishlist={toggleWishlist}
        wishlist={wishlist}
        genreConfig={genreConfig}
        platformConfig={platformConfig}
      />

      {coinExclusiveProducts.length > 0 && (
        <ProductSection
          title="Coins Exclusive"
          products={coinExclusiveProducts}
          onProductClick={openProductModal}
          onToggleWishlist={toggleWishlist}
          wishlist={wishlist}
          genreConfig={genreConfig}
          platformConfig={platformConfig}
        />
      )}

      {/* Offer Sections */}
      {!isLoadingOffers && offers.map((offer) => {
        const offerProducts = offerProductsMap.get(offer.id) || [];
        if (offerProducts.length === 0) return null;

        return (
          <div 
            key={offer.id} 
            className="border-4 border-black p-6 relative overflow-hidden"
            style={{ 
              backgroundColor: offer.backgroundColor || '#FFFFFF'
            }}
          >
            {/* Background image with opacity */}
            {offer.backgroundImageUrl && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  backgroundImage: `url(${offer.backgroundImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.2,
                  zIndex: 0
                }}
              />
            )}
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-3xl font-display uppercase text-black">
                  {offer.name || 'Special Offer'}
                </h2>
                <p className="text-black/70 font-semibold">
                  {offerProducts.length} {offerProducts.length === 1 ? 'product' : 'products'} in this offer
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {offerProducts.map((product) => {
                  const isHighlighted = highlightedProductIds.has(product.id);
                  return (
                    <div
                      key={product.id}
                      data-product-id={product.id}
                      className={isHighlighted ? 'ring-4 ring-[#FFD700] ring-offset-4 bg-[#FFFC33] p-2 transition-all duration-500' : ''}
                    >
                      <ProductRow
                        product={product}
                        onProductClick={openProductModal}
                        isInWishlist={wishlist.includes(product.id)}
                        onToggleWishlist={toggleWishlist}
                        genreConfig={genreConfig}
                        platformConfig={platformConfig}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Full Sale Catalog - products not in any offer */}
      {productsNotInOffers.length > 0 && (
        <div className="bg-white border-4 border-black p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-3xl font-display uppercase text-black">Full Sale Catalog</h2>
            <p className="text-black/70 font-semibold">
              {productsNotInOffers.length} {productsNotInOffers.length === 1 ? 'product' : 'products'} on sale · Sorted by {filters.sortBy.replace('-', ' ')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {productsNotInOffers.map((product) => {
              const isHighlighted = highlightedProductIds.has(product.id);
              return (
                <div
                  key={product.id}
                  data-product-id={product.id}
                  className={isHighlighted ? 'ring-4 ring-[#FFD700] ring-offset-4 bg-[#FFFC33] p-2 transition-all duration-500' : ''}
                >
                  <ProductRow
                    product={product}
                    onProductClick={openProductModal}
                    isInWishlist={wishlist.includes(product.id)}
                    onToggleWishlist={toggleWishlist}
                    genreConfig={genreConfig}
                    platformConfig={platformConfig}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalePage;

