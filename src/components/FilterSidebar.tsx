import React from 'react';
import { CloseIcon } from './Icons';
import useStore, { FILTER_CHILD_DELIMITER } from '../store/useStore';
import { sanitizeSVG } from '../utils/sanitize';
import { getBackgroundStyle, getBackgroundClassName } from '../utils/colorUtils';
import * as LucideIcons from 'lucide-react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const FilterCheckbox: React.FC<{
  label: string;
  isChecked: boolean;
  isPartial?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}> = ({ label, isChecked, isPartial, onChange, className }) => (
  <label
    className={`flex items-center gap-3 cursor-pointer group ${className ?? ''}`}
    onClick={() => onChange(!isChecked)}
  >
    <div className="w-6 h-6 border-4 border-black flex-shrink-0 flex items-center justify-center transition-colors group-hover:border-[#0047AB] bg-white">
      {isChecked && <div className="w-3 h-3 bg-[#FFD700]" />}
      {!isChecked && isPartial && <div className="w-3 h-0.5 bg-[#FFD700]" />}
    </div>
    <span className="font-bold select-none text-black transition-colors group-hover:text-[#0047AB]">{label}</span>
  </label>
);

const ConditionCheckbox: React.FC<{
  label: string;
  isChecked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, isChecked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group" onClick={() => onChange(!isChecked)}>
    <div className="w-6 h-6 border-4 border-black flex-shrink-0 flex items-center justify-center transition-colors group-hover:border-[#0047AB]">
      {isChecked && <div className="w-3 h-3 bg-[#FFD700]" />}
    </div>
    <span className="font-bold select-none text-black transition-colors group-hover:text-[#0047AB]">{label}</span>
  </label>
);

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    filterGroups,
    filterGroupOrder,
    filters,
    setFilters,
    toggleParentFilterValue,
    toggleChildFilterValue,
    products,
  } = useStore();
  const [expandedParents, setExpandedParents] = React.useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});
  const maxProductPrice = React.useMemo(
    () => (products.length ? Math.ceil(products.reduce((max, product) => Math.max(max, product.price), 0) / 10) * 10 : 0),
    [products]
  );
  
  const getIconNode = React.useCallback((iconName?: string, className?: string) => {
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
  
  const handleGroupToggle = (groupId: string, value: string) => {
    toggleParentFilterValue(groupId, value);
  };

  const handleChildToggle = (groupId: string, parentId: string, childId: string) => {
    toggleChildFilterValue(groupId, parentId, childId);
  };

  const toggleParentCollapse = (groupId: string, parentId: string) => {
    const key = `${groupId}:${parentId}`;
    setExpandedParents(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleConditionChange = (checked: boolean, option: 'all' | 'new' | 'used') => {
    if (checked) {
      setFilters({ condition: option });
    } else if (filters.condition === option) {
      setFilters({ condition: 'all' });
    }
  };
  
  const handlePriceChange = (price: number) => {
    const finalPrice = maxProductPrice && price > maxProductPrice ? maxProductPrice : price;
    setFilters({ price: finalPrice });
  };

  const conditionOptions: Array<'all' | 'new' | 'used'> = ['all', 'new', 'used'];

  const toggleGroupSection = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const content = (
    <div className="flex flex-col flex-1 space-y-4">
      <div className="flex justify-between items-center md:hidden pb-3 border-b-4 border-black flex-shrink-0">
          <h2 className="text-xl font-display uppercase text-black">Filters</h2>
          <button onClick={onClose} className="p-1"><CloseIcon className="w-6 h-6"/></button>
      </div>

      <div className="flex flex-col gap-3 flex-1 text-sm">
        {filterGroupOrder.map(groupId => {
          const group = filterGroups[groupId];
          if (!group) return null;
          const items = Object.keys(group.items);
          const activeSelections = filters.groupSelections[groupId] || [];
          const isGroupExpanded = expandedGroups[groupId] ?? true;
          return (
            <div className="mb-3 last:mb-0 border-2 border-black bg-white" key={group.id}>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 bg-black text-white font-display text-lg uppercase"
                onClick={() => toggleGroupSection(group.id)}
              >
                <span>{group.label}</span>
                <span className="text-sm font-sans tracking-widest">{isGroupExpanded ? '−' : '+'}</span>
              </button>
              {isGroupExpanded && (
                <div className="p-3 space-y-2">
                  {items.length > 0 ? (
                    items.map(item => {
                    const parentKey = `${group.id}:${item}`;
                    const childConfig = group.items[item]?.children;
                    const children = childConfig ? Object.keys(childConfig) : [];
                    const childSelectionKeys = children.map(child => `${item}${FILTER_CHILD_DELIMITER}${child}`);
                    const selectedChildCount = childSelectionKeys.filter(value => activeSelections.includes(value)).length;
                    const isParentChecked = activeSelections.includes(item);
                    const isPartial = !isParentChecked && selectedChildCount > 0;
                    const isExpanded = expandedParents[parentKey] ?? (children.length === 0);
                      return (
                        <div key={item} className="border-2 border-dashed border-black/20 p-2 bg-white">
                          <div className="flex items-center justify-between gap-2">
                            <FilterCheckbox
                              label={item}
                              isChecked={isParentChecked}
                              isPartial={isPartial}
                              onChange={() => handleGroupToggle(group.id, item)}
                            />
                            {children.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleParentCollapse(group.id, item); }}
                                className="text-xs font-bold uppercase border-2 border-black px-2 py-1 hover:bg-black hover:text-white transition-colors"
                              >
                                {isExpanded ? 'Hide' : 'Show'}
                              </button>
                            )}
                          </div>
                          {children.length > 0 && isExpanded && (
                            <div className="mt-2 space-y-1 pl-4">
                              {children.map(child => {
                                const key = `${item}${FILTER_CHILD_DELIMITER}${child}`;
                                return (
                                  <label
                                    key={child}
                                    className="flex items-center gap-3 cursor-pointer group text-sm"
                                    onClick={() => handleChildToggle(group.id, item, child)}
                                  >
                                    <div className="w-6 h-6 border-4 border-black flex-shrink-0 flex items-center justify-center transition-colors group-hover:border-[#0047AB] bg-white">
                                      {activeSelections.includes(key) && <div className="w-3 h-3 bg-[#FFD700]" />}
                                    </div>
                                    <span className="font-bold select-none text-black transition-colors group-hover:text-[#0047AB]">{child}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm font-semibold text-black/60">
                      No labels yet. Add them in the admin panel.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="mb-8">
          <h3 className="text-xl font-display uppercase border-b-4 border-black pb-2 mb-3 text-black">Condition</h3>
          <div className="space-y-2">
            {conditionOptions.map((option) => (
              <ConditionCheckbox
                key={option}
                label={option.charAt(0).toUpperCase() + option.slice(1)}
                isChecked={filters.condition === option}
                onChange={(checked) => handleConditionChange(checked, option)}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 space-y-5">
          <div>
            <h3 className="text-xl font-display uppercase border-b-4 border-black pb-2 mb-3 text-black">Special Filters</h3>
            <div className="space-y-2">
              <FilterCheckbox
                label="Coins Only"
                isChecked={filters.onlyCoins}
                onChange={(checked) => setFilters({ onlyCoins: checked })}
              />
              <FilterCheckbox
                label="Sales"
                isChecked={filters.onSale}
                onChange={(checked) => setFilters({ onSale: checked })}
              />
              <FilterCheckbox
                label="Bundles"
                isChecked={filters.bundlesOnly}
                onChange={(checked) => setFilters({ bundlesOnly: checked })}
              />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-display uppercase border-b-4 border-black pb-2 mb-3 text-black">Max Price</h3>
            <div className="space-y-2">
              <input 
                type="range"
                min="0"
                max={Math.max(100, maxProductPrice || 500)}
                step="10"
                value={filters.price}
                onChange={(e) => handlePriceChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-200 appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-[#FFD700] [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none"
              />
              <div className="text-center font-black text-2xl text-[#FF0000]">${filters.price.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
        <aside className="hidden md:flex flex-col w-full md:w-80 lg:w-96 flex-shrink-0 bg-white border-4 border-black p-4">
            {content}
        </aside>

        {isOpen && (
             <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden animate-fade-in"
                onClick={onClose}
            >
                <aside 
                    className="fixed inset-y-0 left-0 w-[78%] max-w-xs bg-white p-3 border-r-4 border-black flex flex-col overflow-y-auto space-y-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {content}
                </aside>
            </div>
        )}
    </>
  );
};

export default FilterSidebar;
