import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../types';
import FilterSidebar from '../components/FilterSidebar';
import ProductCard from '../components/ProductCard';
import { FilterIcon, GridIcon, ListIcon, CloseIcon } from '../components/Icons';
import useStore, { FILTER_CHILD_DELIMITER } from '../store/useStore';

type ActiveFilter =
    | { type: 'group'; value: string; label: string; groupId: string }
    | { type: 'condition'; value: 'new' | 'used'; label: string }
    | { type: 'onlyCoins'; value: string; label: string }
    | { type: 'onSale'; value: string; label: string }
    | { type: 'bundlesOnly'; value: string; label: string };

const CATALOG_CATEGORY_PRESETS: Array<{
    id: string;
    title: string;
    predicate: (product: Product) => boolean;
}> = [
    {
        id: 'bundles',
        title: 'Bundle Deals',
        predicate: product => (product.bundleItems?.length || 0) >= 2,
    },
    {
        id: 'consoles',
        title: 'Consoles & Hardware',
        predicate: product => {
            const genres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
            return genres.includes('Consoles');
        },
    },
    {
        id: 'retro',
        title: 'Retro Classics',
        predicate: product => product.tags?.includes('retro') || false,
    },
    {
        id: 'merch',
        title: 'Merch & Extras',
        predicate: product => {
            const genres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
            return product.tags?.includes('merch') || genres.includes('Merch');
        },
    },
    {
        id: 'games',
        title: 'Game Discs',
        predicate: () => true,
    },
];

const BrowsePage: React.FC = () => {
    const products = useStore(state => state.products);
    const filters = useStore(state => state.filters);
    const searchQuery = useStore(state => state.searchQuery);
    const filterAssignments = useStore(state => state.filterAssignments);
    const setFilters = useStore(state => state.setFilters);
    const removeFilter = useStore(state => state.removeFilter);
    const clearFilters = useStore(state => state.clearFilters);
    const openProductModal = useStore(state => state.openProductModal);
    const wishlist = useStore(state => state.wishlist);
    const toggleWishlist = useStore(state => state.toggleWishlist);
    const filterGroups = useStore(state => state.filterGroups);
    const filterGroupOrder = useStore(state => state.filterGroupOrder);
    const genreConfig = (filterAssignments.genre && filterGroups[filterAssignments.genre]?.items) || {};
    const platformConfig = (filterAssignments.platform && filterGroups[filterAssignments.platform]?.items) || {};
    const startCategoryTime = useStore(state => state.startCategoryTime);
    const endCategoryTime = useStore(state => state.endCategoryTime);
    
    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
    const [browseView, setBrowseView] = useState<'grid' | 'list'>('grid');
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
      const handleResize = () => setIsMobileView(window.matchMedia('(max-width: 768px)').matches);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Отслеживание времени в категориях
    useEffect(() => {
      // Определяем активную категорию на основе фильтров
      const genreSelections = filters.groupSelections[filterAssignments.genre] || [];
      const platformSelections = filters.groupSelections[filterAssignments.platform] || [];
      
      // Приоритет: сначала platform, потом genre
      let activeCategoryId: string | null = null;
      let activeCategoryName: string | null = null;
      
      if (platformSelections.length > 0) {
        const firstSelection = platformSelections[0];
        if (firstSelection.includes(FILTER_CHILD_DELIMITER)) {
          const [parent, child] = firstSelection.split(FILTER_CHILD_DELIMITER);
          activeCategoryId = `platform:${parent}:${child}`;
          activeCategoryName = `${platformConfig[parent]?.symbol || parent} → ${platformConfig[parent]?.children?.[child]?.symbol || child}`;
        } else {
          activeCategoryId = `platform:${firstSelection}`;
          activeCategoryName = platformConfig[firstSelection]?.symbol || firstSelection;
        }
      } else if (genreSelections.length > 0) {
        const firstSelection = genreSelections[0];
        if (firstSelection.includes(FILTER_CHILD_DELIMITER)) {
          const [parent, child] = firstSelection.split(FILTER_CHILD_DELIMITER);
          activeCategoryId = `genre:${parent}:${child}`;
          activeCategoryName = `${genreConfig[parent]?.symbol || parent} → ${genreConfig[parent]?.children?.[child]?.symbol || child}`;
        } else {
          activeCategoryId = `genre:${firstSelection}`;
          activeCategoryName = genreConfig[firstSelection]?.symbol || firstSelection;
        }
      } else {
        activeCategoryId = 'all';
        activeCategoryName = 'Все категории';
      }

      if (activeCategoryId && activeCategoryName) {
        startCategoryTime(activeCategoryId, activeCategoryName);
      }

      return () => {
        endCategoryTime();
      };
    }, [filters.groupSelections, filterAssignments.genre, filterAssignments.platform, genreConfig, platformConfig, startCategoryTime, endCategoryTime]);

    const renderProductGrid = (productsToRender: Product[]) => (
        <div className={`grid ${browseView === 'list' ? 'grid-cols-1' : 'grid-cols-2'} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`}>
            {productsToRender.map((product) => {
                const isBundle = (product.bundleItems?.length || 0) >= 2;
                return (
                    <div
                        key={product.id}
                        className={`w-full ${isBundle ? 'sm:col-span-2' : ''}`}
                    >
                        <ProductCard
                            product={product}
                            isInWishlist={wishlist.includes(product.id)}
                            onToggleWishlist={toggleWishlist}
                            genreConfig={genreConfig}
                            platformConfig={platformConfig}
                            onProductClick={openProductModal}
                        />
                    </div>
                );
            })}
        </div>
    );

    const renderSearchResults = (productsToRender: Product[]) => {
        return productsToRender.length > 0 ? (
            renderProductGrid(productsToRender)
        ) : (
            <div className="text-center py-16 col-span-full">
                <h2 className="text-2xl font-semibold text-black">No products found</h2>
                <p className="text-black/80 mt-2">Try adjusting your filters or search terms.</p>
            </div>
        );
    };

    const activeFilters: ActiveFilter[] = [
      ...filterGroupOrder.flatMap(groupId => {
        const group = filterGroups[groupId];
        if (!group) return [];
        const selections = filters.groupSelections[groupId] || [];
        const parentSelections = selections.filter(value => !value.includes(FILTER_CHILD_DELIMITER));
        const childSelections = selections.filter(value => value.includes(FILTER_CHILD_DELIMITER));
        const childMap = childSelections.reduce<Record<string, string[]>>((acc, selection) => {
          const [parentValue, childValue] = selection.split(FILTER_CHILD_DELIMITER);
          if (!acc[parentValue]) acc[parentValue] = [];
          acc[parentValue].push(childValue);
          return acc;
        }, {});

        const chips: ActiveFilter[] = [];

        parentSelections.forEach(parentValue => {
          chips.push({
            type: 'group',
            value: parentValue,
            groupId,
            label: `${group.label}: ${parentValue}`,
          });
        });

        Object.entries(childMap).forEach(([parentValue, childValues]) => {
          const totalChildren = Object.keys(group.items[parentValue]?.children || {}).length;
          const parentSelected = parentSelections.includes(parentValue);
          const shouldShowChildren = !parentSelected || (totalChildren > 0 && childValues.length !== totalChildren);
          if (!shouldShowChildren) return;
          childValues.forEach(childValue => {
            chips.push({
              type: 'group',
              value: `${parentValue}${FILTER_CHILD_DELIMITER}${childValue}`,
              groupId,
              label: `${group.label}: ${parentValue} → ${childValue}`,
            });
          });
        });

        return chips;
      }),
      ...(filters.condition !== 'all'
        ? [{
            type: 'condition' as const,
            value: filters.condition,
            label: `Condition: ${filters.condition.charAt(0).toUpperCase() + filters.condition.slice(1)}`
          }]
        : []),
      ...(filters.onlyCoins ? [{ type: 'onlyCoins' as const, value: 'Coins Only', label: 'Coins Only' }] : []),
      ...(filters.onSale ? [{ type: 'onSale' as const, value: 'Sale', label: 'Sale' }] : []),
      ...(filters.bundlesOnly ? [{ type: 'bundlesOnly' as const, value: 'Bundles', label: 'Bundles' }] : []),
    ];

    const filteredProducts = useMemo(() => {
        let tempProducts = products
            .filter(p => p.price <= filters.price)
            .filter(p => filters.condition === 'all' || p.condition === filters.condition)
            .filter(p => !filters.onlyCoins || !!p.coinExclusive)
            .filter(p => !filters.onSale || p.tags?.includes('sale'))
            .filter(p => {
                // Filter bundles: check both tag and bundleItems
                if (!filters.bundlesOnly) return true;
                const isBundle = (p.bundleItems?.length || 0) >= 2;
                return p.tags?.includes('bundle') || isBundle;
            });

        Object.entries(filters.groupSelections).forEach(([groupId, selected]) => {
            if (!selected?.length) return;
            tempProducts = tempProducts.filter(product => {
                // Bundles should always be visible regardless of genre filter
                // (they can be filtered by bundlesOnly filter, but not by genre)
                const isBundle = (product.bundleItems?.length || 0) >= 2;
                if (isBundle && groupId === filterAssignments.genre) {
                    // Skip genre filtering for bundles - they should be visible
                    return true;
                }
                
                const values = (() => {
                    if (groupId === filterAssignments.genre) {
                        const baseGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
                        const extraGenres = product.filterValues?.[groupId] || [];
                        return [...baseGenres, ...extraGenres];
                    }
                    if (groupId === filterAssignments.platform) {
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
                        const extraPlatforms = product.filterValues?.[groupId] || [];
                        return [...new Set([...basePlatforms, ...extraPlatforms])];
                    }
                    return product.filterValues?.[groupId] || [];
                })();
                
                // Проверяем совпадения, включая дочерние элементы
                return selected.some(selectedValue => {
                    // Если выбран дочерний элемент (формат "Parent::Child")
                    if (selectedValue.includes(FILTER_CHILD_DELIMITER)) {
                        const [parentId, childId] = selectedValue.split(FILTER_CHILD_DELIMITER);
                        // Для дочернего элемента проверяем только точное совпадение дочернего элемента
                        // или наличие дочернего элемента в формате "Parent::Child" в filterValues
                        const childKey = `${parentId}${FILTER_CHILD_DELIMITER}${childId}`;
                        return values.includes(childKey) || values.includes(childId);
                    }
                    // Если выбран родительский элемент, проверяем точное совпадение
                    return values.includes(selectedValue);
                });
            });
        });

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase().trim();
            tempProducts = tempProducts.filter(product =>
                product.name.toLowerCase().startsWith(lowercasedQuery)
            );
        }

        return tempProducts.sort((a, b) => {
            switch (filters.sortBy) {
                case 'price-asc': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                default: return 0;
            }
        });
    }, [products, filters, searchQuery, filterAssignments]);

    const categorizedProducts = useMemo(() => {
        const assignedIds = new Set<number>();
        return CATALOG_CATEGORY_PRESETS.map(category => {
            const items = filteredProducts.filter(product => {
                if (assignedIds.has(product.id)) return false;
                const matches = category.predicate(product);
                if (matches) {
                    assignedIds.add(product.id);
                }
                return matches;
            });
            return { ...category, products: items };
        }).filter(category => category.products.length > 0);
    }, [filteredProducts]);

    const renderEmptyState = (
        <div className="text-center py-16 col-span-full bg-white border-4 border-black">
            <h2 className="text-2xl font-semibold text-black">No products found</h2>
            <p className="text-black/80 mt-2">Try adjusting your filters or search terms.</p>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            <FilterSidebar 
                isOpen={isFilterSidebarOpen}
                onClose={() => setIsFilterSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <div className="bg-white border-4 border-black p-4 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-display text-black uppercase">All Products</h1>
                            <p className="text-black/80 font-semibold mt-1 sm:mt-2">Showing {filteredProducts.length} results</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                             <select 
                                value={filters.sortBy}
                                onChange={(e) => setFilters({ sortBy: e.target.value })}
                                className="bg-white border-4 border-black px-3 py-2 font-bold text-base focus:outline-none focus:ring-4 focus:ring-[#FFD700] transition h-12 max-w-[200px] w-full"
                                aria-label="Sort products"
                            >
                                <option value="name-asc">Name (A-Z)</option>
                                <option value="name-desc">Name (Z-A)</option>
                                <option value="price-asc">Price (Low to High)</option>
                                <option value="price-desc">Price (High to Low)</option>
                            </select>
                            <div className="flex border-4 border-black overflow-hidden h-12">
                                <button
                                  onClick={() => setBrowseView('grid')}
                                  className={`flex items-center justify-center px-3 ${browseView === 'grid' ? 'bg-[#FFD700]' : 'bg-white hover:bg-gray-200'}`}
                                  aria-label="Show two products per row"
                                >
                                  <span className="hidden md:inline">
                                    <GridIcon className="w-5 h-5" />
                                  </span>
                                  <span className="md:hidden flex items-center gap-0.5" aria-hidden="true">
                                    <span className="w-3 h-3 border-2 border-black" />
                                    <span className="w-3 h-3 border-2 border-black" />
                                  </span>
                                </button>
                                <button
                                  onClick={() => setBrowseView('list')}
                                  className={`flex items-center justify-center px-3 ${browseView === 'list' ? 'bg-[#FFD700]' : 'bg-white hover:bg-gray-200'}`}
                                  aria-label="Show single product per row"
                                >
                                  <span className="hidden md:inline">
                                    <ListIcon className="w-5 h-5" />
                                  </span>
                                  <span className="md:hidden flex items-center gap-0.5" aria-hidden="true">
                                    <span className="w-3 h-3 border-2 border-black" />
                                  </span>
                                </button>
                            </div>
                        </div>
                    </div>
                     {activeFilters.length > 0 && (
                        <div className="mt-4 pt-4 border-t-2 border-dashed border-black/40">
                            <div className="flex items-center flex-wrap gap-2">
                                <span className="font-bold text-sm text-black">Active Filters:</span>
                                {activeFilters.map(filter => {
                                    const keySuffix = filter.type === 'group' ? `-${filter.groupId}` : '';
                                    const handleRemove = () => {
                                        if (filter.type === 'group') {
                                            removeFilter(filter.type, filter.value, filter.groupId);
                                        } else {
                                            removeFilter(filter.type, filter.value);
                                        }
                                    };
                                    return (
                                        <div key={`${filter.type}-${filter.value}${keySuffix}`} className="bg-black text-white font-semibold text-sm pl-3 pr-2 py-1 flex items-center gap-2">
                                            <span>{filter.label || filter.value}</span>
                                            <button onClick={handleRemove} className="text-white/70 hover:text-white" aria-label={`Remove ${filter.value} filter`}>
                                                <CloseIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                                <button onClick={clearFilters} className="text-sm font-bold text-[#E60012] hover:underline ml-auto sm:ml-2">Clear All</button>
                            </div>
                        </div>
                     )}
                </div>

                 <button 
                    onClick={() => setIsFilterSidebarOpen(true)}
                    className="md:hidden bg-[#0057D9] text-white font-bold py-3 px-4 border-4 border-black flex items-center gap-2 w-full justify-center mb-6 btn-pop"
                 >
                    <FilterIcon className="w-6 h-6" />
                    <span>Show Filters</span>
                 </button>

                <div className="flex-1">
                    {filteredProducts.length > 0 ? (
                            browseView === 'grid'
                          ? searchQuery
                              ? renderSearchResults(filteredProducts)
                              : categorizedProducts.length > 0
                                ? (
                                  <div className="space-y-12">
                                    {categorizedProducts.map(category => (
                                      <section key={category.id}>
                                        <div className="flex items-baseline justify-between border-b-4 border-black pb-2 mb-4">
                                          <h2 className="text-3xl font-display text-black uppercase">{category.title}</h2>
                                          <span className="text-black/60 font-semibold text-sm">{category.products.length} items</span>
                                        </div>
                                        {renderProductGrid(category.products)}
                                      </section>
                                    ))}
                                  </div>
                                )
                                : renderEmptyState
                          : (
                              isMobileView ? (
                                <div className="grid grid-cols-2 gap-4">
                                  {filteredProducts.map(product => (
                                    <ProductCard
                                      key={product.id}
                                      product={product}
                                      isInWishlist={wishlist.includes(product.id)}
                                      onToggleWishlist={toggleWishlist}
                                      genreConfig={genreConfig}
                                      platformConfig={platformConfig}
                                      onProductClick={openProductModal}
                                      variant="row"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-6">
                                  {filteredProducts.map(product => (
                                    <ProductCard
                                      key={product.id}
                                      product={product}
                                      onProductClick={openProductModal}
                                      isInWishlist={wishlist.includes(product.id)}
                                      onToggleWishlist={toggleWishlist}
                                      genreConfig={genreConfig}
                                      platformConfig={platformConfig}
                                      variant="row"
                                    />
                                  ))}
                                </div>
                              )
                            )
                    ) : (
                        renderEmptyState
                    )}
                </div>

            </div>
        </div>
    );
};

export default BrowsePage;
