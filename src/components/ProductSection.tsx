import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Product, FilterConfig } from '../types';
import ProductCard from './ProductCard';

interface ProductSectionProps {
  title: string;
  products: Product[];
  onProductClick: (product: Product) => void;
  onToggleWishlist: (productId: number) => void;
  wishlist: number[];
  genreConfig: FilterConfig;
  platformConfig: FilterConfig;
  itemsPerView?: number;
}

const ProductSection: React.FC<ProductSectionProps> = ({ title, products, onProductClick, onToggleWishlist, wishlist, genreConfig, platformConfig, itemsPerView }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const didDrag = useRef(false);

  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const isScrollable = el.scrollWidth > el.clientWidth;
      const pageWidth = el.clientWidth;
      if (isScrollable && pageWidth > 0) {
        const calculatedTotalPages = Math.ceil(el.scrollWidth / pageWidth);
        const calculatedCurrentPage = Math.round(el.scrollLeft / pageWidth);
        
        setTotalPages(calculatedTotalPages);
        setCurrentPage(calculatedCurrentPage);
      } else {
        setTotalPages(0);
        setCurrentPage(0);
      }
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      updateScrollState();
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(el);
      el.addEventListener('scroll', updateScrollState, { passive: true });

      return () => {
        resizeObserver.unobserve(el);
        el.removeEventListener('scroll', updateScrollState);
      };
    }
  }, [products, updateScrollState]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDown.current = true;
    didDrag.current = false;
    const el = scrollContainerRef.current!;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
  };

  const handlePointerLeave = () => {
    isDown.current = false;
  };
  
  const handlePointerUp = () => {
    isDown.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDown.current) return;
    e.preventDefault();
    const el = scrollContainerRef.current!;
    const x = e.pageX - el.offsetLeft;
    const walk = x - startX.current;
    
    if (Math.abs(walk) > 3) {
      didDrag.current = true;
    }
    
    el.scrollLeft = scrollLeftStart.current - walk;
  };


  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mb-12 relative group">
      <h2 className="text-4xl font-display text-black mb-6 uppercase border-b-4 border-black pb-2">
        {title}
      </h2>
      
      <div 
        ref={scrollContainerRef}
        className="flex w-full min-w-0 overflow-x-auto gap-8 py-4 no-scrollbar cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
      >
        {products.map((product) => {
          const isBundle = (product.bundleItems?.length || 0) >= 2;
          const bundleStyle = !itemsPerView && isBundle
            ? { flex: '2 1 0%', minWidth: '26rem' }
            : undefined;
          const enforcedStyle = itemsPerView
            ? { flex: `0 0 ${100 / itemsPerView}%`, minWidth: `${100 / itemsPerView}%` }
            : undefined;
          const cardStyle = enforcedStyle || bundleStyle;
          const cardClassName = itemsPerView
            ? 'cursor-pointer flex-shrink-0'
            : `cursor-pointer ${isBundle ? 'flex-grow min-w-0' : 'flex-shrink-0 w-72'}`;
          return (
            <div 
              key={product.id} 
              className={cardClassName}
              style={cardStyle}
              onClick={() => !didDrag.current && onProductClick(product)}
            >
              <ProductCard
                product={product}
                isInWishlist={wishlist.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
                genreConfig={genreConfig}
                platformConfig={platformConfig}
              />
            </div>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
            {Array.from({ length: totalPages }).map((_, index) => (
                <div 
                    key={index} 
                    className={`w-4 h-4 border-2 border-black transition-colors duration-300 ${currentPage === index ? 'bg-[#FFD700]' : 'bg-white'}`}
                />
            ))}
        </div>
      )}
    </section>
  );
};

export default ProductSection;
