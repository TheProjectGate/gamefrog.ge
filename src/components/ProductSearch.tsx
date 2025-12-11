import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { Product } from '../types';
import { SearchIcon, CloseIcon } from './Icons';

interface ProductSearchProps {
  onSelectProduct?: (product: Product) => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ onSelectProduct }) => {
  const { t } = useTranslation();
  const { products } = useStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = products.filter(product => {
      // Search in name
      if (product.name.toLowerCase().includes(searchTerm)) return true;
      
      // Search in description
      if (product.description?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in genre
      const genres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
      if (genres.some(g => g.toLowerCase().includes(searchTerm))) return true;
      
      // Search in tags
      if (product.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) return true;
      
      // Search in platforms
      if (product.platforms?.some(platform => platform.toLowerCase().includes(searchTerm))) return true;
      
      return false;
    });

    setResults(filtered.slice(0, 10)); // Limit to 10 results
    setIsOpen(filtered.length > 0);
    setSelectedIndex(-1);
  }, [query, products]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectProduct(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectProduct = (product: Product) => {
    if (onSelectProduct) {
      onSelectProduct(product);
    }
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-xl">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <SearchIcon className="w-5 h-5 text-black/60" />
        </div>
        <input
          ref={inputRef}
          id="product-search"
          name="product-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && results.length > 0 && setIsOpen(true)}
          placeholder={t('search.placeholder', 'Search games, consoles, genres...')}
          className="w-full pl-10 pr-10 py-2 border-4 border-black font-bold text-black placeholder-black/50 focus:outline-none focus:ring-4 focus:ring-[#FFD700]"
          aria-label="Search products"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:bg-black/10 rounded p-1 transition-colors"
            aria-label="Clear search"
          >
            <CloseIcon className="w-4 h-4 text-black/60" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div
          id="search-results"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] max-h-[400px] overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-black/60 font-bold">
              {t('search.noResults', 'No results found')}
            </div>
          ) : (
            results.map((product, index) => (
              <button
                key={product.id}
                role="option"
                aria-selected={selectedIndex === index}
                onClick={() => handleSelectProduct(product)}
                className={`w-full p-3 flex items-center gap-3 border-b-2 border-black/10 hover:bg-[#FFD700] transition-colors text-left ${
                  selectedIndex === index ? 'bg-[#FFD700]' : ''
                }`}
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover border-2 border-black flex-shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-black truncate">{product.name}</div>
                  <div className="text-sm text-black/70 flex items-center gap-2">
                    <span>${product.price.toFixed(2)}</span>
                    {(() => {
                      const genres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                      return genres.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{genres.join(', ')}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {product.coinExclusive && (
                  <div className="text-xs bg-[#FFD700] text-black px-2 py-1 border-2 border-black font-bold">
                    COINS
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;

