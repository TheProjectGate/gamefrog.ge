import React, { useState, FormEvent, useEffect, useMemo, useRef } from 'react';
import { Product, FilterGroup } from '../../types';
import { PlusIcon, EditIcon, TrashIcon, CloseIcon, StarIcon, CoinIcon } from '../../components/Icons';
import useStore, { FILTER_CHILD_DELIMITER } from '../../store/useStore';
import * as LucideIcons from 'lucide-react';
import { sanitizeSVG } from '../../utils/sanitize';
import { getBackgroundStyle, getBackgroundClassName } from '../../utils/colorUtils';
import ConfirmDialog from '../../components/ConfirmDialog';
import { GripVertical } from 'lucide-react';
import { uploadImage } from '../../api/upload';
import { fetchOffers, createOffer, updateOffer, deleteOffer, LimitedTimeOffer, CreateOfferData, ShowFrequency } from '../../api/offers';
import { useTranslation } from 'react-i18next';

const availableTags = ['bestseller', 'new', 'sale', 'bundle', 'retro', 'merch'];

const getIconNode = (iconName?: string, className?: string) => {
    if (!iconName) return null;
    const raw = String(iconName).trim();
    const tryNames = [raw, raw.replace(/\s+/g, ''), raw.replace(/[^a-zA-Z0-9]/g, '')];
    for (const key of tryNames) {
      const CompA = (LucideIcons as any)[key];
      if (CompA) return <CompA className={className || 'w-5 h-5'} />;
      const pascal = key
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      const CompB = (LucideIcons as any)[pascal];
      if (CompB) return <CompB className={className || 'w-5 h-5'} />;
    }
    return null;
};

const BundleFormModal: React.FC<{
    bundle: Product | null;
    onClose: () => void;
    onSave: (bundle: Product | Omit<Product, 'id'>) => void;
}> = ({ bundle, onClose, onSave }) => {
    const { products } = useStore();
    const safeProducts = Array.isArray(products) ? products : [];
    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        name: bundle?.name || '',
        price: bundle?.price || 0,
        description: bundle?.description || '',
        imageUrl: bundle?.imageUrl || 'https://picsum.photos/seed/bundle/800/800',
        genre: Array.isArray(bundle?.genre) ? bundle.genre : (bundle?.genre ? [bundle.genre] : ['Bundle']),
        condition: bundle?.condition || 'new',
        stock: bundle?.stock || 0,
        tags: bundle?.tags || ['bundle'],
        platforms: bundle?.platforms || [],
        goldCoins: bundle?.goldCoins || 0,
        bundleItems: bundle?.bundleItems || [],
        filterValues: bundle?.filterValues || {},
        youtubeVideoId: bundle?.youtubeVideoId || '',
    });
    const [imageInputMethod, setImageInputMethod] = useState<'url' | 'upload'>('url');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow || '';
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' || name === 'stock' || name === 'goldCoins' 
                ? parseFloat(value) || 0 
                : value,
        }));
    };

    const handleBundleToggle = (productId: number) => {
        setFormData(prev => {
            const current = prev.bundleItems || [];
            const updated = current.includes(productId)
                ? current.filter(id => id !== productId)
                : [...current, productId];
            return { ...prev, bundleItems: updated };
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, SVG).');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size too large. Maximum size is 10MB.');
            return;
        }

        setIsUploading(true);
        try {
            const response = await uploadImage(file);
            setFormData(prev => ({ ...prev, imageUrl: response.imageUrl }));
            setImageInputMethod('url'); // Switch to URL view after successful upload
        } catch (error: any) {
            alert(error.message || 'Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e?: FormEvent | React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (isSubmitting) {
            return; // Prevent double submission
        }
        
        if (!formData.name || !formData.imageUrl) {
            alert('Please fill in all required fields (Name and Image URL).');
            return;
        }

        if (!formData.bundleItems || formData.bundleItems.length < 2) {
            alert('Please select at least 2 products to create a bundle.');
            return;
        }

        setIsSubmitting(true);
        try {
            const dataToSave: Product | Omit<Product, 'id'> = bundle
                ? {
                    ...formData,
                    id: bundle.id,
                    tags: ['bundle', ...(formData.tags?.filter(t => t !== 'bundle') || [])],
                  }
                : {
                    ...formData,
                    tags: ['bundle', ...(formData.tags?.filter(t => t !== 'bundle') || [])],
                  };

            await onSave(dataToSave);
        } catch (error) {
            // Error is already handled in store
            console.error('Failed to save bundle:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const bundleCandidates = (Array.isArray(products) ? products : []).filter(p => !bundle || p.id !== bundle.id);
    const bundleCount = formData.bundleItems?.length || 0;
    const isBundleValid = bundleCount >= 2;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div 
                className="relative bg-white border-4 border-black w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-black hover:text-red-600 transition-colors z-10"
                    aria-label="Close"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>

                <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }} className="p-6 space-y-6">
                    <h2 className="text-2xl font-display uppercase border-b-4 border-black pb-2 mb-4">
                        {bundle ? 'Edit Bundle' : 'Create Bundle'}
                    </h2>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="bundle-name" className="block font-bold mb-1">Bundle Name *</label>
                            <input
                                id="bundle-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full border-2 border-black p-2"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="bundle-description" className="block font-bold mb-1">Description</label>
                            <textarea
                                id="bundle-description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full border-2 border-black p-2"
                            />
                        </div>

                        <div>
                            <label htmlFor="bundle-image-upload" className="block font-bold mb-1">Bundle Image *</label>
                            <div className="mb-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setImageInputMethod('upload')}
                                    className={`px-4 py-2 border-2 border-black font-bold text-sm ${
                                        imageInputMethod === 'upload'
                                            ? 'bg-[#FFD700] text-black'
                                            : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                                >
                                    Upload File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageInputMethod('url')}
                                    className={`px-4 py-2 border-2 border-black font-bold text-sm ${
                                        imageInputMethod === 'url'
                                            ? 'bg-[#FFD700] text-black'
                                            : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                                >
                                    Enter URL
                                </button>
                            </div>
                            
                            {imageInputMethod === 'upload' ? (
                                <div>
                                    <input
                                        id="bundle-image-upload"
                                        name="bundle-image-upload"
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                                        onChange={handleFileUpload}
                                        className="w-full border-2 border-black p-2"
                                        disabled={isUploading}
                                    />
                                    <p className="text-xs text-black/60 mt-1">
                                        Accepted formats: JPEG, PNG, GIF, WebP, SVG (Max 10MB)
                                    </p>
                                    {isUploading && (
                                        <p className="text-sm text-blue-600 mt-2">Uploading image...</p>
                                    )}
                                </div>
                            ) : (
                                <input
                                    id="bundle-image-url"
                                    type="text"
                                    name="imageUrl"
                                    value={formData.imageUrl}
                                    onChange={handleChange}
                                    className="w-full border-2 border-black p-2"
                                    placeholder="https://example.com/bundle-image.jpg"
                                    required
                                />
                            )}
                            
                            {formData.imageUrl && (
                                <div className="mt-2">
                                    <img 
                                        src={formData.imageUrl} 
                                        alt="Bundle preview" 
                                        className="w-32 h-32 object-cover border-2 border-black"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="bundle-youtube-video-id" className="block font-bold mb-1">YouTube Video (Optional)</label>
                            <input 
                                id="bundle-youtube-video-id"
                                type="text" 
                                name="youtubeVideoId" 
                                value={formData.youtubeVideoId || ''} 
                                onChange={handleChange} 
                                className="w-full border-2 border-black p-2" 
                                placeholder="YouTube URL or Video ID (e.g., https://youtube.com/watch?v=... or dQw4w9WgXcQ)"
                            />
                            <p className="text-xs text-black/60 mt-1">
                                Enter YouTube URL or Video ID. Video will be playable in product modal.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="bundle-price" className="block font-bold mb-1">Price</label>
                                <input
                                    id="bundle-price"
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full border-2 border-black p-2"
                                />
                            </div>
                            <div>
                                <label htmlFor="bundle-stock" className="block font-bold mb-1">Stock</label>
                                <input
                                    id="bundle-stock"
                                    type="number"
                                    name="stock"
                                    value={formData.stock}
                                    onChange={handleChange}
                                    min="0"
                                    className="w-full border-2 border-black p-2"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="bundle-gold-coins" className="block font-bold mb-1">Gold Coins</label>
                            <input
                                id="bundle-gold-coins"
                                type="number"
                                name="goldCoins"
                                value={formData.goldCoins || 0}
                                onChange={handleChange}
                                min="0"
                                className="w-full border-2 border-black p-2"
                            />
                        </div>
                    </div>

                    {/* Bundle Items Selection */}
                    <div className="border-4 border-black bg-white p-4 space-y-4">
                        <div>
                            <label className="block font-bold mb-1">Bundle Items *</label>
                            <p className="text-xs text-black/60 mb-2">
                                Select at least 2 products to include in this bundle. Each item will continue to sell separately.
                            </p>
                            <div className="border-2 border-black max-h-64 overflow-y-auto divide-y divide-dashed divide-black/20">
                                {bundleCandidates.map(candidate => (
                                    <label key={candidate.id} htmlFor={`bundle-item-${candidate.id}`} className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer">
                                        <input 
                                            id={`bundle-item-${candidate.id}`}
                                            name={`bundle-item-${candidate.id}`}
                                            type="checkbox" 
                                            checked={formData.bundleItems?.includes(candidate.id) || false} 
                                            onChange={() => handleBundleToggle(candidate.id)} 
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <img 
                                            src={candidate.imageUrl} 
                                            alt={candidate.name}
                                            className="w-12 h-12 object-cover border-2 border-black"
                                        />
                                        <div className="flex-1">
                                            <span className="font-semibold">{candidate.name}</span>
                                            <span className="text-black/60 ml-2">${candidate.price.toFixed(2)}</span>
                                        </div>
                                    </label>
                                ))}
                                {bundleCandidates.length === 0 && (
                                    <div className="p-3 text-sm text-black/60">Add more products to start building bundles.</div>
                                )}
                            </div>
                            <p className={`text-xs mt-2 font-bold ${isBundleValid ? 'text-green-600' : 'text-red-600'}`}>
                                {bundleCount === 0
                                    ? 'Please select at least 2 products'
                                    : bundleCount < 2
                                    ? `Selected ${bundleCount} item(s) - need at least 2`
                                    : `Selected ${bundleCount} items - bundle is valid`}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t-4 border-black">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-white text-black border-4 border-black font-bold uppercase hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-[#FFD700] text-black border-4 border-black font-bold uppercase hover:bg-black hover:text-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : (bundle ? 'Update Bundle' : 'Create Bundle')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProductFormModal: React.FC<{
    product: Product | null;
    onClose: () => void;
    onSave: (product: Product | Omit<Product, 'id'>) => void;
}> = ({ product, onClose, onSave }) => {
    const { allGenres, allPlatforms, products, filterGroups, filterGroupOrder, filterAssignments } = useStore();
    const [formData, setFormData] = useState<Omit<Product, 'id'>>({
        name: product?.name || '',
        price: product?.price || 0,
        description: product?.description || '',
        imageUrl: product?.imageUrl || 'https://picsum.photos/seed/new/800/800',
        genre: Array.isArray(product?.genre) ? product.genre : (product?.genre ? [product.genre] : (allGenres[0] ? [allGenres[0]] : [])),
        condition: product?.condition || 'new',
        stock: product?.stock || 0,
        tags: product?.tags || [],
        platforms: product?.platforms || [],
        goldCoins: product?.goldCoins || 0,
        coinExclusive: product?.coinExclusive || false,
        coinPrice: product?.coinPrice || 0,
        bundleItems: [],
        filterValues: product?.filterValues || {},
        youtubeVideoId: product?.youtubeVideoId || '',
    });
    const [imageInputMethod, setImageInputMethod] = useState<'url' | 'upload'>('url');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow || '';
        };
    }, []);

    const platformFilterGroup = React.useMemo(
        () => (filterAssignments.platform ? filterGroups[filterAssignments.platform] : undefined),
        [filterAssignments.platform, filterGroups]
    );

    const [expandedChildParents, setExpandedChildParents] = useState<Record<string, boolean>>({});
    const [expandedFilterGroups, setExpandedFilterGroups] = useState<Record<string, boolean>>({});

    const toggleChildExpansion = (groupId: string, parentId: string) => {
        const key = `${groupId}:${parentId}`;
        setExpandedChildParents(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleFilterGroupSection = (groupId: string) => {
        setExpandedFilterGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    const renderFilterAccordion = (
        group: FilterGroup,
        content: React.ReactNode,
        description?: string
    ) => {
        const isExpanded = expandedFilterGroups[group.id] ?? true;
        return (
            <div className="border-2 border-black bg-white" key={group.id}>
                <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-black text-white font-display text-base sm:text-lg uppercase"
                    onClick={() => toggleFilterGroupSection(group.id)}
                >
                    <div className="flex flex-col items-start">
                        <span>{group.label}</span>
                        {description && <span className="text-[11px] font-sans tracking-wide text-white/80 normal-case">{description}</span>}
                    </div>
                    <span className="text-2xl leading-none">{isExpanded ? '−' : '+'}</span>
                </button>
                {isExpanded && (
                    <div className="p-4 space-y-3">
                        {content}
                    </div>
                )}
            </div>
        );
    };

    const renderParentChildGroup = (
        group: FilterGroup,
        selections: string[],
        onParentToggle: (parentId: string, childNames: string[]) => void,
        onChildToggle: (parentId: string, childId: string, childNames: string[]) => void
    ) => {
        const items = Object.entries(group.items);
        if (!items.length) {
            return <p className="text-xs font-semibold text-black/60">No filters defined yet.</p>;
        }
        return (
            <div className="space-y-3">
                {items.map(([itemName, itemConfig]) => {
                    const childNames = itemConfig.children ? Object.keys(itemConfig.children) : [];
                    const parentSelected = selections.includes(itemName);
                    const childKeys = childNames.map(child => `${itemName}${FILTER_CHILD_DELIMITER}${child}`);
                    const selectedChildren = new Set(childKeys.filter(key => selections.includes(key)));
                    const isPartial = !parentSelected && selectedChildren.size > 0;
                    const parentKey = `${group.id}:${itemName}`;
                    const isExpanded = expandedChildParents[parentKey] ?? false;
                    return (
                        <div key={itemName} className="border border-dashed border-black/20 p-3 bg-white space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor={`filter-parent-${group.id}-${itemName}`} className="flex items-center gap-2 font-semibold text-sm">
                                    <input
                                        id={`filter-parent-${group.id}-${itemName}`}
                                        name={`filter-parent-${group.id}-${itemName}`}
                                        type="checkbox"
                                        checked={parentSelected}
                                        onChange={() => onParentToggle(itemName, childNames)}
                                    />
                                    {itemConfig && (
                                        <span 
                                            className={`${getBackgroundClassName(itemConfig.color || 'bg-white')} ${itemConfig.textColor || 'text-black'} w-7 h-7 flex items-center justify-center font-bold text-xs border-2 border-black flex-shrink-0`}
                                            style={getBackgroundStyle(itemConfig.color || 'bg-white')}
                                        >
                                            {itemConfig.customSvg ? (
                                                <div className="w-4 h-4" dangerouslySetInnerHTML={{ __html: sanitizeSVG(itemConfig.customSvg) }} />
                                            ) : (
                                                getIconNode(itemConfig.iconName, 'w-4 h-4') || itemConfig.symbol || itemName.charAt(0).toUpperCase()
                                            )}
                                        </span>
                                    )}
                                    <span>
                                        {itemName}
                                        {isPartial && (
                                            <span className="ml-2 text-xs uppercase tracking-wide text-black/60">
                                                (Partial)
                                            </span>
                                        )}
                                    </span>
                                </label>
                                {childNames.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => toggleChildExpansion(group.id, itemName)}
                                        className="text-xs font-bold uppercase border-2 border-black px-2 py-1 bg-white hover:bg-black hover:text-white transition-colors"
                                    >
                                        {isExpanded ? 'Hide Options' : 'Show Options'}
                                    </button>
                                )}
                            </div>
                            {childNames.length > 0 && isExpanded && (
                                <div className="pl-6 space-y-1">
                                    {childNames.map(child => {
                                        const childConfig = itemConfig.children?.[child];
                                        const childIcon = childConfig?.iconName;
                                        return (
                                            <label key={child} htmlFor={`filter-child-${group.id}-${itemName}-${child}`} className="flex items-center gap-2 text-xs font-semibold">
                                                <input
                                                    id={`filter-child-${group.id}-${itemName}-${child}`}
                                                    name={`filter-child-${group.id}-${itemName}-${child}`}
                                                    type="checkbox"
                                                    checked={selectedChildren.has(`${itemName}${FILTER_CHILD_DELIMITER}${child}`)}
                                                    onChange={() => onChildToggle(itemName, child, childNames)}
                                                />
                                                {childConfig && (
                                                    <span 
                                                        className={`${getBackgroundClassName(childConfig.color || 'bg-white')} ${childConfig.textColor || 'text-black'} w-6 h-6 flex items-center justify-center font-bold text-xs border-2 border-black flex-shrink-0`}
                                                        style={getBackgroundStyle(childConfig.color || 'bg-white')}
                                                    >
                                                        {childConfig.customSvg ? (
                                                            <div className="w-4 h-4" dangerouslySetInnerHTML={{ __html: sanitizeSVG(childConfig.customSvg) }} />
                                                        ) : (
                                                            getIconNode(childIcon, 'w-4 h-4') || childConfig.symbol || child.charAt(0).toUpperCase()
                                                        )}
                                                    </span>
                                                )}
                                                {child}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, SVG).');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size too large. Maximum size is 10MB.');
            return;
        }

        setIsUploading(true);
        try {
            const response = await uploadImage(file);
            setFormData(prev => ({ ...prev, imageUrl: response.imageUrl }));
            setImageInputMethod('url'); // Switch to URL view after successful upload
        } catch (error: any) {
            alert(error.message || 'Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleMultiSelectChange = (name: 'platforms' | 'tags', value: string) => {
        const currentValues = formData[name] as string[] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        setFormData(prev => ({ ...prev, [name]: newValues }));
    }


    const handleTagToggle = (tag: string) => {
        setFormData(prev => {
            const currentTags = prev.tags || [];
            const hasTag = currentTags.includes(tag);
            const updatedTags = hasTag ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
            return { ...prev, tags: updatedTags };
        });
    };

    const handleCoinExclusiveToggle = (checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            coinExclusive: checked,
            coinPrice: checked ? prev.coinPrice || 0 : 0,
        }));
    };

    const toggleParentFilterValue = (groupId: string, parentId: string, childNames: string[]) => {
        setFormData(prev => {
            const current = new Set(prev.filterValues?.[groupId] || []);
            const childKeys = childNames.map(child => `${parentId}${FILTER_CHILD_DELIMITER}${child}`);
            const hadParent = current.has(parentId);
            if (hadParent) {
                current.delete(parentId);
                childKeys.forEach(key => current.delete(key));
            } else {
                current.add(parentId);
                childKeys.forEach(key => current.add(key));
            }
            const nextFilterValues = { ...(prev.filterValues || {}) };
            const updated = Array.from(current);
            if (updated.length > 0) {
                nextFilterValues[groupId] = updated;
            } else {
                delete nextFilterValues[groupId];
            }
            let nextState: Omit<Product, 'id'> = { ...prev, filterValues: nextFilterValues };
            if (groupId === filterAssignments.platform) {
                const shouldHaveParent = current.has(parentId) || childKeys.some(key => current.has(key));
                const existingPlatforms = prev.platforms || [];
                nextState.platforms = shouldHaveParent
                    ? existingPlatforms.includes(parentId)
                        ? existingPlatforms
                        : [...existingPlatforms, parentId]
                    : existingPlatforms.filter(p => p !== parentId);
            }
            return nextState;
        });
    };

    const toggleChildFilterValue = (groupId: string, parentId: string, childId: string, childNames: string[]) => {
        setFormData(prev => {
            const current = new Set(prev.filterValues?.[groupId] || []);
            const childKey = `${parentId}${FILTER_CHILD_DELIMITER}${childId}`;
            const childKeys = childNames.map(child => `${parentId}${FILTER_CHILD_DELIMITER}${child}`);
            const hadChild = current.has(childKey);
            if (hadChild) {
                current.delete(childKey);
            } else {
                current.add(childKey);
            }
            current.delete(parentId);
            const selectedChildren = childKeys.filter(key => current.has(key));
            const allChildrenSelected = childKeys.length > 0 && selectedChildren.length === childKeys.length;
            if (allChildrenSelected) {
                current.add(parentId);
            }
            const nextFilterValues = { ...(prev.filterValues || {}) };
            const updated = Array.from(current);
            if (updated.length > 0) {
                nextFilterValues[groupId] = updated;
            } else {
                delete nextFilterValues[groupId];
            }
            let nextState: Omit<Product, 'id'> = { ...prev, filterValues: nextFilterValues };
            if (groupId === filterAssignments.platform) {
                const existingPlatforms = prev.platforms || [];
                const shouldHaveParent = current.has(parentId) || childKeys.some(key => current.has(key));
                nextState.platforms = shouldHaveParent
                    ? existingPlatforms.includes(parentId)
                        ? existingPlatforms
                        : [...existingPlatforms, parentId]
                    : existingPlatforms.filter(p => p !== parentId);
            }
            return nextState;
        });
    };


    const handleSubmit = async (e?: FormEvent | React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (isSubmitting) {
            return; // Prevent double submission
        }
        
        setIsSubmitting(true);
        try {
            const dataToSave: Omit<Product, 'id'> = {
                ...formData,
                price: parseFloat(String(formData.price)),
                stock: parseInt(String(formData.stock), 10),
                goldCoins: formData.goldCoins ? parseInt(String(formData.goldCoins), 10) : 0,
                coinExclusive: !!formData.coinExclusive,
                coinPrice: formData.coinExclusive ? parseInt(String(formData.coinPrice || 0), 10) : 0,
                filterValues: formData.filterValues || {},
            };
            // Remove bundleItems from regular products - bundles are now managed separately
            delete dataToSave.bundleItems;
            if (product) {
                await onSave({ ...dataToSave, id: product.id });
            } else {
                await onSave(dataToSave);
            }
        } catch (error) {
            // Error is already handled in store
            console.error('Failed to save product:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
      <div className="fixed inset-0 z-[100] flex">
        <div
          className="fixed inset-0 bg-black bg-opacity-70"
          onClick={onClose}
        />
        <div className="relative z-10 flex min-h-screen w-full justify-center items-center p-2 sm:p-4">
          <div className="bg-white border-4 border-black w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
           <div className="flex justify-between items-center p-3 sm:p-4 border-b-4 border-black">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-display uppercase">{product ? 'Edit Product' : 'Add Product'}</h2>
                <button onClick={onClose}><CloseIcon className="w-6 h-6 sm:w-7 sm:h-7"/></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }} className="p-4 sm:p-6 overflow-y-auto space-y-6">
                <section className="border-4 border-black bg-white p-4 space-y-4">
                    <header className="border-b-2 border-dashed border-black/30 pb-2">
                        <h3 className="text-xl font-display uppercase">Product Basics</h3>
                        <p className="text-xs text-black/60 font-semibold">Primary information shown to the customer</p>
                    </header>
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex-1 space-y-2">
                            <label htmlFor="product-name" className="block font-bold text-sm">Name</label>
                            <input id="product-name" type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border-2 border-black p-2" required />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="block font-bold text-sm">Product Image</label>
                            <div className="mb-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setImageInputMethod('upload')}
                                    className={`px-3 py-1 border-2 border-black font-bold text-xs ${
                                        imageInputMethod === 'upload'
                                            ? 'bg-[#FFD700] text-black'
                                            : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                                >
                                    Upload File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageInputMethod('url')}
                                    className={`px-3 py-1 border-2 border-black font-bold text-xs ${
                                        imageInputMethod === 'url'
                                            ? 'bg-[#FFD700] text-black'
                                            : 'bg-white text-black hover:bg-gray-200'
                                    }`}
                                >
                                    Enter URL
                                </button>
                            </div>
                            
                            {imageInputMethod === 'upload' ? (
                                <div>
                                    <input
                                        id="product-image-upload"
                                        name="product-image-upload"
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                                        onChange={handleFileUpload}
                                        className="w-full border-2 border-black p-2"
                                        disabled={isUploading}
                                    />
                                    <p className="text-xs text-black/60 mt-1">
                                        JPEG, PNG, GIF, WebP, SVG (Max 10MB)
                                    </p>
                                    {isUploading && (
                                        <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                                    )}
                                </div>
                            ) : (
                                <input 
                                    id="product-image-url"
                                    type="text" 
                                    name="imageUrl" 
                                    value={formData.imageUrl} 
                                    onChange={handleChange} 
                                    className="w-full border-2 border-black p-2" 
                                    required 
                                />
                            )}
                            {formData.imageUrl && (
                                <img 
                                    src={formData.imageUrl} 
                                    alt="Product preview" 
                                    className="mt-2 w-24 h-24 object-cover border-2 border-black"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <label htmlFor="product-youtube-video-id" className="block font-bold text-sm">YouTube Video (Optional)</label>
                            <input 
                                id="product-youtube-video-id"
                                type="text" 
                                name="youtubeVideoId" 
                                value={formData.youtubeVideoId || ''} 
                                onChange={handleChange} 
                                className="w-full border-2 border-black p-2" 
                                placeholder="YouTube URL or Video ID (e.g., https://youtube.com/watch?v=... or dQw4w9WgXcQ)"
                            />
                            <p className="text-xs text-black/60">
                                Enter YouTube URL or Video ID. Video will be playable in product modal.
                            </p>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="product-description" className="block font-bold text-sm mb-1">Description</label>
                        <textarea id="product-description" name="description" value={formData.description} onChange={handleChange} className="w-full border-2 border-black p-2" rows={4} required></textarea>
                    </div>
                </section>
                <section className="border-4 border-black bg-white p-4 space-y-4">
                    <header className="border-b-2 border-dashed border-black/30 pb-2">
                        <h3 className="text-xl font-display uppercase">Pricing & Availability</h3>
                        <p className="text-xs text-black/60 font-semibold">Manage pricing, availability, and rewards</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="product-price" className="block font-bold text-sm">Price</label>
                            <input id="product-price" type="number" name="price" value={formData.price} onChange={handleChange} className="w-full border-2 border-black p-2" required step="0.01" />
                        </div>
                        <div>
                            <label htmlFor="product-stock" className="block font-bold text-sm">Stock</label>
                            <input id="product-stock" type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full border-2 border-black p-2" required />
                        </div>
                        <div>
                            <label htmlFor="product-condition" className="block font-bold text-sm">Condition</label>
                            <select id="product-condition" name="condition" value={formData.condition} onChange={handleChange} className="w-full border-2 border-black p-2 bg-white">
                                <option value="new">New</option>
                                <option value="used">Used</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="product-gold-coins" className="block font-bold text-sm">Gold Coin Reward</label>
                            <input id="product-gold-coins" type="number" name="goldCoins" value={formData.goldCoins || 0} onChange={handleChange} className="w-full border-2 border-black p-2" min="0" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <label className="flex items-center gap-3 font-bold text-sm">
                            <input
                                id="product-coin-exclusive"
                                name="coinExclusive"
                                type="checkbox"
                                checked={!!formData.coinExclusive}
                                onChange={(e) => handleCoinExclusiveToggle(e.target.checked)}
                            />
                            Coin Exclusive Product
                        </label>
                        {formData.coinExclusive && (
                            <div className="flex-1 md:ml-6">
                                <label htmlFor="product-coin-price" className="block font-bold text-sm">Coin Price</label>
                                <input
                                    id="product-coin-price"
                                    type="number"
                                    name="coinPrice"
                                    value={formData.coinPrice || 0}
                                    onChange={handleChange}
                                    className="w-full border-2 border-black p-2"
                                    min="0"
                                />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-sm">Tags & Highlights</p>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => (
                                <label key={tag} className="flex items-center gap-2 text-xs font-bold uppercase border-2 border-black px-3 py-1 bg-white">
                                    <input
                                        id={`product-tag-${tag}`}
                                        name={`product-tag-${tag}`}
                                        type="checkbox"
                                        checked={Boolean(formData.tags?.includes(tag))}
                                        onChange={() => handleTagToggle(tag)}
                                    />
                                    {tag}
                                </label>
                            ))}
                        </div>
                        <div>
                            <label htmlFor="product-custom-tags" className="block font-bold text-xs mt-2">Custom Tags (comma separated)</label>
                            <input
                                id="product-custom-tags"
                                type="text"
                                name="tags"
                                value={formData.tags?.join(', ')}
                                onChange={(e) =>
                                    setFormData(p => ({
                                        ...p,
                                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                                    }))
                                }
                                className="w-full border-2 border-black p-2"
                            />
                        </div>
                    </div>
                </section>

                <section className="border-4 border-black bg-white p-4 space-y-4">
                    <header className="border-b-2 border-dashed border-black/30 pb-2">
                        <h3 className="text-xl font-display uppercase">Filters</h3>
                        <p className="text-xs text-black/60 font-semibold">Assign any label groups to this product</p>
                    </header>
                    <div className="space-y-4">
                        {filterGroupOrder.map(groupId => {
                            const group = filterGroups[groupId];
                            if (!group) return null;
                            const items = Object.keys(group.items);
                            const description = groupId === filterAssignments.genre ? 'Select one or more genres' : undefined;
                            const content = groupId === filterAssignments.genre ? (
                                items.length ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {items.map(itemName => (
                                            <label key={itemName} htmlFor={`product-genre-${itemName}`} className="flex items-center gap-2 text-sm font-semibold">
                                                <input
                                                    id={`product-genre-${itemName}`}
                                                    name={`product-genre-${itemName}`}
                                                    type="checkbox"
                                                    value={itemName}
                                                    checked={Array.isArray(formData.genre) ? formData.genre.includes(itemName) : false}
                                                    onChange={(e) => {
                                                        const currentGenres = Array.isArray(formData.genre) ? formData.genre : [];
                                                        if (e.target.checked) {
                                                            setFormData(prev => ({ ...prev, genre: [...currentGenres, itemName] }));
                                                        } else {
                                                            setFormData(prev => ({ ...prev, genre: currentGenres.filter(g => g !== itemName) }));
                                                        }
                                                    }}
                                                />
                                                {itemName}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs font-semibold text-black/60">No values yet. Add them in Labels & Filters.</p>
                                )
                            ) : (
                                renderParentChildGroup(
                                    group,
                                    formData.filterValues?.[group.id] || [],
                                    (parentId, childNames) => toggleParentFilterValue(group.id, parentId, childNames),
                                    (parentId, childId, childNames) => toggleChildFilterValue(group.id, parentId, childId, childNames)
                                )
                            );
                            return renderFilterAccordion(group, content, description);
                        })}
                    </div>
                </section>
                
                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="btn-pop bg-gray-200 text-black font-bold py-3 px-6 border-4 border-black w-full sm:w-auto">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn-pop bg-[#FFD700] text-black font-bold py-3 px-6 border-4 border-black w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </form>
          </div>
        </div>
      </div>
    );
};


interface HomeSection {
    key: string;
    order: number;
    enabled: boolean;
    label: string;
}

// Offer Form Modal Component
// Color picker modal component
const OfferFormModal: React.FC<{
    offer: LimitedTimeOffer | null;
    onClose: () => void;
    onSave: (data: CreateOfferData) => void;
}> = ({ offer, onClose, onSave }) => {
    const { t } = useTranslation();
    const { products } = useStore();
    const safeProducts = Array.isArray(products) ? products : [];
    
    // Get all products for offer selection (not just sale products)
    const allProductsForOffers = useMemo(() => {
        return safeProducts;
    }, [safeProducts]);
    
    // Helper function to convert database date to datetime-local format
    const convertDateToLocal = (dateString: string | undefined): string => {
        if (!dateString) {
            const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            return defaultDate.toISOString().slice(0, 16);
        }
        // Handle different date formats from database
        // Format 1: "2025-12-10T09:17:00.000Z" -> "2025-12-10T09:17"
        // Format 2: "2025-12-10 09:17:00" -> "2025-12-10T09:17"
        let date = dateString;
        // Replace space with T if needed
        if (date.includes(' ') && !date.includes('T')) {
            date = date.replace(' ', 'T');
        }
        // Remove milliseconds and Z
        date = date.replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');
        // Keep only yyyy-MM-ddThh:mm
        return date.slice(0, 16);
    };
    
    const [formData, setFormData] = useState<CreateOfferData>(() => {
        // Ensure all values are defined (not undefined) to avoid controlled/uncontrolled warning
        return {
            name: offer?.name ?? '',
            backgroundImageUrl: offer?.backgroundImageUrl ?? '',
            backgroundColor: offer?.backgroundColor ?? '#FFFFFF',
            discountPercent: offer?.discountPercent ?? 0,
            endsAt: convertDateToLocal(offer?.endsAt),
            isActive: offer?.isActive ?? true,
            redirectUrl: offer?.redirectUrl ?? '',
            productIds: offer?.productIds ?? [],
            showFrequency: offer?.showFrequency ?? 'once_per_day',
        };
    });
    const [imageInputMethod, setImageInputMethod] = useState<'url' | 'upload'>('url');
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    


    // Recalculate scale on window resize

    // Ensure all string fields are always strings (never undefined) to prevent controlled/uncontrolled warnings
    useEffect(() => {
        setFormData(prev => {
            const needsUpdate = 
                prev.backgroundImageUrl === undefined || 
                prev.backgroundImageUrl === null ||
                prev.redirectUrl === undefined || 
                prev.redirectUrl === null;
            
            if (!needsUpdate) return prev;
            
            return {
                ...prev,
                backgroundImageUrl: prev.backgroundImageUrl ?? '',
                redirectUrl: prev.redirectUrl ?? '',
            };
        });
    }, []);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow || '';
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newValue = name === 'discountPercent' 
                ? (value === '' ? 0 : parseFloat(value) || 0)
                : (value || ''); // Always ensure string values, never undefined
            return {
                ...prev,
                [name]: newValue,
            };
        });
    };

    // Handle inline editing in preview
    const handlePreviewTextChange = (fieldName: keyof CreateOfferData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value || '',
        }));
    };

    const handleImageInputMethodChange = (method: 'url' | 'upload') => {
        // Ensure backgroundImageUrl is always a string when switching methods
        setFormData(prev => ({
            ...prev,
            backgroundImageUrl: prev.backgroundImageUrl ?? '',
        }));
        setImageInputMethod(method);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size too large. Maximum size is 10MB.');
            return;
        }

        setIsUploading(true);
        try {
            const response = await uploadImage(file);
            console.log('Image uploaded successfully:', response.imageUrl);
            // Ensure the URL is always a string, never undefined or null
            const imageUrl = String(response.imageUrl || '').trim();
            if (!imageUrl) {
                throw new Error('Image URL is empty after upload');
            }
            // Use functional update to ensure we always have a valid state
            setFormData(prev => {
                const updated = {
                    ...prev,
                    backgroundImageUrl: imageUrl // Always a string
                };
                return updated;
            });
            setImageInputMethod('url');
            // Force re-render by updating formData again with a timestamp to trigger React update
            setTimeout(() => {
                setFormData(prev => ({
                    ...prev,
                    backgroundImageUrl: imageUrl
                }));
            }, 100);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert(error.message || 'Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.endsAt) {
            alert('Please fill in End Date.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Convert datetime-local format to MySQL datetime format (YYYY-MM-DD HH:MM:SS)
            // datetime-local gives us "YYYY-MM-DDTHH:MM", we need "YYYY-MM-DD HH:MM:SS"
            let endsAtValue = formData.endsAt;
            if (endsAtValue.includes('T')) {
                endsAtValue = endsAtValue.replace('T', ' ') + ':00';
            } else if (!endsAtValue.includes(':')) {
                // Fallback: create proper datetime
                const date = new Date(endsAtValue);
                endsAtValue = date.toISOString().slice(0, 19).replace('T', ' ');
            }
            
            const dataToSave = {
                ...formData,
                endsAt: endsAtValue,
                // Ensure backgroundImageUrl is always a string (never undefined)
                backgroundImageUrl: formData.backgroundImageUrl ?? '',
            };
            await onSave(dataToSave);
        } catch (error: any) {
            console.error('Error saving offer:', error);
            alert(error.message || 'Failed to save offer. Please check the date format.');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in overflow-y-auto">
            <div className="relative max-w-6xl w-full mx-4 my-8 bg-white border-8 border-black shadow-2xl">
                <div className="absolute -top-4 -right-4">
                    <button
                        onClick={onClose}
                        className="w-12 h-12 bg-black text-white border-4 border-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        aria-label="Close"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
                    {/* Preview Section - сверху */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-display uppercase border-b-4 border-black pb-2">
                            Preview
                        </h2>
                        <div className="relative flex items-center justify-center min-h-[400px] bg-gray-100 border-4 border-black p-4 overflow-auto max-h-[90vh]">
                            {/* Идентичная структура модального окна с сайта */}
                            {formData.backgroundImageUrl ? (
                                <div 
                                    ref={previewContainerRef}
                                    className="relative mx-4 rounded-none overflow-visible"
                                    style={{ 
                                        maxWidth: '90%',
                                        maxHeight: '90vh'
                                    }}
                                >
                                    <img 
                                        src={`${formData.backgroundImageUrl}?t=${Date.now()}`}
                                        alt="Offer preview"
                                        className="block w-full h-auto"
                                        style={{ display: 'block', objectFit: 'contain' }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 p-8">
                                    <p className="text-lg font-bold">No background image set</p>
                                    <p className="text-sm mt-2">Upload or enter an image URL to see preview</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Section - снизу */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-display uppercase border-b-4 border-black pb-2">
                            {offer ? 'Edit Offer' : 'Create New Offer'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            {/* Offer Name (for admin only) */}
                            <div>
                                <label htmlFor="offer-name" className="block font-bold mb-1">Offer Name (Admin Only)</label>
                                <input
                                    id="offer-name"
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    placeholder="e.g., Summer Sale 2025"
                                    className="w-full border-2 border-black p-2"
                                />
                                <p className="text-xs text-black/60 mt-1">
                                    This name is only visible in the admin panel for identification purposes.
                                </p>
                            </div>

                            {/* Background Color for Sale Page */}
                            <div>
                                <label htmlFor="offer-background-color" className="block font-bold mb-1">Background Color (Sale Page)</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        id="offer-background-color-picker"
                                        name="backgroundColor-picker"
                                        type="color"
                                        value={formData.backgroundColor || '#FFFFFF'}
                                        onChange={handleChange}
                                        className="w-16 h-10 border-2 border-black cursor-pointer"
                                    />
                                    <input
                                        id="offer-background-color"
                                        type="text"
                                        name="backgroundColor"
                                        value={formData.backgroundColor || '#FFFFFF'}
                                        onChange={handleChange}
                                        placeholder="#FFFFFF"
                                        className="flex-1 border-2 border-black p-2"
                                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                                    />
                                </div>
                                <p className="text-xs text-black/60 mt-1">
                                    Custom background color for this offer section on the Sale page.
                                </p>
                            </div>

                            {/* Background Image */}
                            <div>
                                <label className="block font-bold mb-1">Background Image</label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => handleImageInputMethodChange('url')}
                                        className={`px-4 py-2 border-2 border-black font-bold ${
                                            imageInputMethod === 'url' ? 'bg-[#FFD700]' : 'bg-white'
                                        }`}
                                    >
                                        URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleImageInputMethodChange('upload')}
                                        className={`px-4 py-2 border-2 border-black font-bold ${
                                            imageInputMethod === 'upload' ? 'bg-[#FFD700]' : 'bg-white'
                                        }`}
                                    >
                                        Upload
                                    </button>
                                </div>
                                {imageInputMethod === 'url' ? (
                                    <div>
                                        <input
                                            id="offer-background-image-url"
                                            key="background-image-url-input"
                                            type="text"
                                            name="backgroundImageUrl"
                                            value={formData.backgroundImageUrl ?? ''}
                                            onChange={handleChange}
                                            placeholder="https://example.com/image.jpg"
                                            className="w-full border-2 border-black p-2"
                                        />
                                        {formData.backgroundImageUrl && (
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-600 mb-1">Preview:</p>
                                                <img
                                                    key={`preview-img-${formData.backgroundImageUrl}`}
                                                    src={`${formData.backgroundImageUrl}?t=${Date.now()}`}
                                                    alt="Background preview"
                                                    className="w-full h-32 object-cover border-2 border-black"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            id="offer-background-image-upload"
                                            name="offer-background-image-upload"
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="w-full border-2 border-black p-2"
                                            disabled={isUploading}
                                        />
                                        {isUploading && <p className="text-sm mt-1 text-blue-600">Uploading...</p>}
                                        {formData.backgroundImageUrl && !isUploading && (
                                            <div className="mt-2">
                                                <p className="text-xs text-green-600 mb-1">✓ Image uploaded successfully!</p>
                                                <img
                                                    key={`uploaded-img-${formData.backgroundImageUrl}`}
                                                    src={`${formData.backgroundImageUrl}?t=${Date.now()}`}
                                                    alt="Uploaded background"
                                                    className="w-full h-32 object-cover border-2 border-black"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Discount & End Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="offer-discount-percent" className="block font-bold mb-1">Discount %</label>
                                    <input
                                        id="offer-discount-percent"
                                        type="number"
                                        name="discountPercent"
                                        value={formData.discountPercent}
                                        onChange={handleChange}
                                        min="0"
                                        max="100"
                                        className="w-full border-2 border-black p-2"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="offer-ends-at" className="block font-bold mb-1">Ends At *</label>
                                    <input
                                        id="offer-ends-at"
                                        type="datetime-local"
                                        name="endsAt"
                                        value={formData.endsAt}
                                        onChange={handleChange}
                                        className="w-full border-2 border-black p-2"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Show Frequency */}
                            <div>
                                <label htmlFor="offer-show-frequency" className="block font-bold mb-1">Show Frequency *</label>
                                <p className="text-xs text-black/60 mb-2">
                                    Control how often this offer appears to users
                                </p>
                                <select
                                    id="offer-show-frequency"
                                    name="showFrequency"
                                    value={formData.showFrequency || 'once_per_day'}
                                    onChange={(e) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            showFrequency: e.target.value as ShowFrequency
                                        }));
                                    }}
                                    className="w-full border-2 border-black p-2 bg-white"
                                >
                                    <option value="once_per_day">Once per day</option>
                                    <option value="every_hour">Every hour</option>
                                    <option value="on_refresh">Every time page refreshes</option>
                                </select>
                            </div>

                            {/* Product Selection */}
                            <div>
                                <label className="block font-bold mb-1">Link to Products (optional)</label>
                                <p className="text-xs text-black/60 mb-2">
                                    Select products. When user clicks "Go To Offer", they will be redirected to Sale page with these products highlighted.
                                </p>
                                <div className="border-2 border-black max-h-64 overflow-y-auto p-2 space-y-2">
                                    {allProductsForOffers.length === 0 ? (
                                        <p className="text-xs text-red-600">
                                            No products found.
                                        </p>
                                    ) : (
                                        allProductsForOffers.map(product => {
                                            const isSelected = formData.productIds?.includes(product.id) || false;
                                            return (
                                                <label key={product.id} htmlFor={`offer-product-${product.id}`} className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer border-2 border-transparent hover:border-black">
                                                    <input
                                                        id={`offer-product-${product.id}`}
                                                        name={`offer-product-${product.id}`}
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const currentIds = formData.productIds || [];
                                                            if (e.target.checked) {
                                                                setFormData(prev => ({ 
                                                                    ...prev, 
                                                                    productIds: [...currentIds, product.id]
                                                                }));
                                                            } else {
                                                                setFormData(prev => ({ 
                                                                    ...prev, 
                                                                    productIds: currentIds.filter(id => id !== product.id)
                                                                }));
                                                            }
                                                        }}
                                                        className="w-4 h-4"
                                                    />
                                                    <div className="flex-1">
                                                        <span className="font-semibold">{product.name}</span>
                                                        <span className="text-sm text-gray-600 ml-2">${product.price.toFixed(2)}</span>
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                                {formData.productIds && formData.productIds.length > 0 && (
                                    <p className="text-xs text-green-600 mt-2">
                                        {formData.productIds.length} product(s) selected
                                    </p>
                                )}
                            </div>

                            {/* Redirect URL */}
                            <div>
                                <label className="block font-bold mb-1">Redirect URL (optional)</label>
                                <p className="text-xs text-black/60 mb-2">
                                    Use this if you don't select products above. Will be ignored if products are selected.
                                </p>
                                <input
                                    type="url"
                                    name="redirectUrl"
                                    value={formData.redirectUrl || ''}
                                    onChange={handleChange}
                                    placeholder="https://example.com/sale"
                                    className="w-full border-2 border-black p-2"
                                    disabled={!!(formData.productIds && formData.productIds.length > 0)}
                                />
                            </div>

                            {/* Active Toggle */}
                            <div>
                                <label className="flex items-center gap-2 font-bold">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                    />
                                    Active (show on site entry)
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 btn-pop bg-gray-200 text-black font-bold py-3 px-6 border-4 border-black"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 btn-pop bg-[#FFD700] text-black font-bold py-3 px-6 border-4 border-black disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                                </div>
                                    </div>

        </div>
    );
};

type ProductTab = 'homepage' | 'products' | 'bundles' | 'offers';

const ProductsPage: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, setToast } = useStore();
    // Load activeTab from localStorage or default to 'homepage'
    const [activeTab, setActiveTab] = useState<ProductTab>(() => {
        const saved = localStorage.getItem('productsPageActiveTab');
        return (saved && ['homepage', 'products', 'bundles', 'offers'].includes(saved))
            ? (saved as ProductTab)
            : 'homepage';
    });
    
    // Save activeTab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('productsPageActiveTab', activeTab);
    }, [activeTab]);
    
    // Ensure products is always an array
    const safeProducts = Array.isArray(products) ? products : [];
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGenre, setFilterGenre] = useState<string>('all');
    const [filterTag, setFilterTag] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        productId?: number;
        productIds?: number[];
        action: 'delete' | 'bulkDelete';
    }>({ isOpen: false, action: 'delete' });
    const searchInputRef = useRef<HTMLInputElement>(null);
    const itemsPerPage = 10;
    
    // Home sections order management
    const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
    const [draggedSection, setDraggedSection] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    
    // Offers management
    const [offers, setOffers] = useState<LimitedTimeOffer[]>([]);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<LimitedTimeOffer | null>(null);
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    
    const sectionLabels: Record<string, string> = {
        'coinsExclusive': 'Coins Exclusive',
        'bundleDeals': 'Bundle Deals',
        'newReleases': 'New Releases',
        'bestSellers': 'Best Sellers',
        'retroCorner': 'Retro Corner',
        'merch': 'New Merch'
    };

    // Keyboard shortcut for search (Ctrl/Cmd + K)
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // Load home sections order
    useEffect(() => {
        const fetchSections = async () => {
            const defaultSections: HomeSection[] = [
                { key: 'coinsExclusive', order: 1, enabled: true, label: 'Coins Exclusive' },
                { key: 'bundleDeals', order: 2, enabled: true, label: 'Bundle Deals' },
                { key: 'newReleases', order: 3, enabled: true, label: 'New Releases' },
                { key: 'bestSellers', order: 4, enabled: true, label: 'Best Sellers' },
                { key: 'retroCorner', order: 5, enabled: true, label: 'Retro Corner' },
                { key: 'merch', order: 6, enabled: true, label: 'New Merch' }
            ];

            try {
                // Use relative path because Vite proxies /api to the backend
                const API_BASE_URL = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${API_BASE_URL}/api/home-sections`);
                
                if (!response.ok) {
                    // If not OK, use default order
                    setHomeSections(defaultSections);
                    return;
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    // If not JSON, use default order
                    setHomeSections(defaultSections);
                    return;
                }
                
                try {
                    const sections = await response.json();
                    if (Array.isArray(sections) && sections.length > 0) {
                        setHomeSections(sections.map((s: any) => ({
                            ...s,
                            label: sectionLabels[s.key] || s.key
                        })));
                    } else {
                        setHomeSections(defaultSections);
                    }
                } catch (jsonError) {
                    // JSON parse error, use default order
                    setHomeSections(defaultSections);
                }
            } catch (error) {
                // Any error, use default order
                setHomeSections(defaultSections);
            }
        };
        fetchSections();
    }, []);

    const handleDragStart = (sectionKey: string) => {
        setDraggedSection(sectionKey);
    };

    const handleDragOver = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (!draggedSection || draggedSection === targetKey) return;

        setHomeSections(prev => {
            const newSections = [...prev];
            const draggedIndex = newSections.findIndex(s => s.key === draggedSection);
            const targetIndex = newSections.findIndex(s => s.key === targetKey);

            if (draggedIndex === -1 || targetIndex === -1) return prev;

            const [removed] = newSections.splice(draggedIndex, 1);
            newSections.splice(targetIndex, 0, removed);

            // Update order numbers
            return newSections.map((section, index) => ({
                ...section,
                order: index + 1
            }));
        });
    };

    const handleDragEnd = () => {
        setDraggedSection(null);
    };

    const handleToggleSection = (sectionKey: string) => {
        setHomeSections(prev => prev.map(s => 
            s.key === sectionKey ? { ...s, enabled: !s.enabled } : s
        ));
    };

    const handleSaveOrder = async () => {
        setIsSavingOrder(true);
        try {
            // Use relative path because Vite proxies /api to the backend
            const API_BASE_URL = import.meta.env.VITE_API_URL || '';
            const url = `${API_BASE_URL}/api/home-sections/order`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: homeSections })
            });

            if (!response.ok) {
                // Check if it's a 404 - endpoint doesn't exist
                if (response.status === 404) {
                    throw new Error('API endpoint not found. Please restart the server after adding the home-sections router.');
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = await response.json();
                        throw new Error(errorData.message || errorData.error || 'Failed to save order');
                    } catch (jsonError) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                } else {
                    throw new Error(`HTTP error! status: ${response.status}. Server may not be running or endpoint not registered.`);
                }
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    const data = await response.json();
                    setToast('Sections order saved successfully!');
                } catch (jsonError) {
                    setToast('Sections order saved successfully!');
                }
            } else {
                setToast('Sections order saved successfully!');
            }
        } catch (error: any) {
            console.error('Error saving sections order:', error);
            const errorMessage = error.message || 'Error saving sections order';
            
            if (errorMessage.includes('404') || errorMessage.includes('not found')) {
                alert('API endpoint not found. Please restart the server:\n1. Stop the server (Ctrl+C)\n2. Run npm run dev again.');
            } else if (errorMessage.includes('Table does not exist')) {
                alert('Database table is missing. Please run the migration:\nmysql -u root -p gamefrog_db < server/migrations/add_home_sections_order.sql');
            } else {
                alert(`Error saving sections order: ${errorMessage}`);
            }
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Load offers when offers tab is active
    useEffect(() => {
        if (activeTab === 'offers') {
            loadOffers();
        }
    }, [activeTab]);

    const loadOffers = async () => {
        setIsLoadingOffers(true);
        try {
            const data = await fetchOffers();
            setOffers(data);
        } catch (error: any) {
            console.error('Error loading offers:', error);
            setToast(error.message || 'Failed to load offers');
        } finally {
            setIsLoadingOffers(false);
        }
    };

    const handleOpenOfferModal = (offer: LimitedTimeOffer | null = null) => {
        setEditingOffer(offer);
        setIsOfferModalOpen(true);
    };

    const handleCloseOfferModal = () => {
        setIsOfferModalOpen(false);
        setEditingOffer(null);
    };

    const handleSaveOffer = async (offerData: CreateOfferData) => {
        try {
            if (editingOffer) {
                await updateOffer(editingOffer.id, offerData);
                setToast('Offer updated successfully!');
            } else {
                await createOffer(offerData);
                setToast('Offer created successfully!');
            }
            
            // Automatically add "sale" tag to selected products
            if (offerData.productIds && offerData.productIds.length > 0) {
                for (const productId of offerData.productIds) {
                    const product = safeProducts.find(p => p.id === productId);
                    if (product && !product.tags?.includes('sale')) {
                        const newTags = [...(product.tags || []), 'sale'];
                        try {
                            await updateProduct({ ...product, tags: newTags });
                        } catch (error) {
                            console.error(`Failed to add sale tag to product ${productId}:`, error);
                        }
                    }
                }
            }
            
            await loadOffers();
            handleCloseOfferModal();
        } catch (error: any) {
            console.error('Error saving offer:', error);
            setToast(error.message || 'Failed to save offer');
        }
    };

    const handleDeleteOffer = async (id: number) => {
        if (!confirm('Are you sure you want to delete this offer?')) {
            return;
        }
        try {
            await deleteOffer(id);
            setToast('Offer deleted successfully!');
            await loadOffers();
        } catch (error: any) {
            console.error('Error deleting offer:', error);
            setToast(error.message || 'Failed to delete offer');
        }
    };

    const handleOpenProductModal = (product: Product | null = null) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleCloseProductModal = () => {
        setEditingProduct(null);
        setIsProductModalOpen(false);
    };

    const handleSaveProduct = async (productData: Product | Omit<Product, 'id'>) => {
        try {
            if ('id' in productData) {
                await updateProduct(productData);
            } else {
                await addProduct(productData);
            }
            handleCloseProductModal();
        } catch (error) {
            // Error is already handled in store
            console.error('Failed to save product:', error);
        }
    };

    const handleOpenBundleModal = (bundle: Product | null = null) => {
        setEditingBundle(bundle);
        setIsBundleModalOpen(true);
    };

    const handleCloseBundleModal = () => {
        setEditingBundle(null);
        setIsBundleModalOpen(false);
    };

    const handleSaveBundle = async (bundleData: Product | Omit<Product, 'id'>) => {
        try {
            if ('id' in bundleData) {
                await updateProduct(bundleData);
            } else {
                await addProduct(bundleData);
            }
            handleCloseBundleModal();
        } catch (error) {
            // Error is already handled in store
            console.error('Failed to save bundle:', error);
        }
    };

    // Filtering & search
    const filteredProducts = useMemo(() => {
        return safeProducts.filter(product => {
            const matchesSearch = !searchQuery || 
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Bundles should always be visible regardless of genre filter
            const isBundle = (product.bundleItems?.length || 0) >= 2;
            const productGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
            const matchesGenre = filterGenre === 'all' || productGenres.includes(filterGenre) || isBundle;
            const matchesTag = filterTag === 'all' || 
                (filterTag === 'bundle' && product.bundleItems && product.bundleItems.length >= 2) ||
                (filterTag !== 'bundle' && product.tags?.includes(filterTag));
            
            return matchesSearch && matchesGenre && matchesTag;
        });
    }, [safeProducts, searchQuery, filterGenre, filterTag]);

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, currentPage, itemsPerPage]);

    // Unique genres and tags for filters
    const uniqueGenres = useMemo(() => {
        const allGenres = safeProducts.flatMap(p => {
            if (Array.isArray(p.genre)) {
                return p.genre;
            }
            return p.genre ? [p.genre] : [];
        });
        return Array.from(new Set(allGenres)).filter(Boolean).sort();
    }, [safeProducts]);

    const handleDeleteProductClick = (productId: number) => {
        setConfirmDialog({ isOpen: true, productId, action: 'delete' });
    };

    const handleBulkDelete = () => {
        if (selectedProducts.size > 0) {
            setConfirmDialog({ 
                isOpen: true, 
                productIds: Array.from(selectedProducts), 
                action: 'bulkDelete' 
            });
        }
    };

    const confirmDelete = async () => {
        try {
            if (confirmDialog.action === 'bulkDelete' && confirmDialog.productIds) {
                // Delete all selected products sequentially
                for (const id of confirmDialog.productIds) {
                    await deleteProduct(id);
                }
                setSelectedProducts(new Set());
            } else if (confirmDialog.productId) {
                await deleteProduct(confirmDialog.productId);
            }
        } catch (error) {
            // Error is already handled in store
            console.error('Failed to delete product:', error);
        } finally {
            setConfirmDialog({ isOpen: false, action: 'delete' });
        }
    };

    const toggleProductSelection = (productId: number) => {
        setSelectedProducts(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedProducts.size === paginatedProducts.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
        }
    };

    const handleToggleSale = async (product: Product) => {
        const hasSaleTag = product.tags?.includes('sale');
        const newTags = hasSaleTag
        ? product.tags?.filter(t => t !== 'sale')
        : [...(product.tags || []), 'sale'];
        try {
            await updateProduct({ ...product, tags: newTags });
        } catch (error) {
            console.error('Failed to update product:', error);
        }
    };

    // Get all bundles (products with bundleItems)
    const bundles = useMemo(() => {
        return safeProducts.filter(p => {
            // Ensure bundleItems is an array and has at least 2 items
            if (!p.bundleItems) return false;
            if (!Array.isArray(p.bundleItems)) return false;
            return p.bundleItems.length >= 2;
        });
    }, [safeProducts]);

    return (
        <div>
            {isProductModalOpen && <ProductFormModal product={editingProduct} onClose={handleCloseProductModal} onSave={handleSaveProduct} />}
            {isBundleModalOpen && <BundleFormModal bundle={editingBundle} onClose={handleCloseBundleModal} onSave={handleSaveBundle} />}
            
            <h2 className="text-3xl sm:text-4xl font-display uppercase border-b-4 border-black pb-2 mb-4 sm:mb-6">
                Products
            </h2>

            {/* Tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveTab('homepage')}
                    className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                        activeTab === 'homepage'
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-white text-black hover:bg-[#FF6B6B] hover:text-white'
                    }`}
                >
                    Homepage Sections
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                        activeTab === 'products'
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-white text-black hover:bg-[#00C2FF] hover:text-black'
                    }`}
                >
                    Products
                </button>
                <button
                    onClick={() => setActiveTab('bundles')}
                    className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                        activeTab === 'bundles'
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-white text-black hover:bg-[#7CFF00] hover:text-black'
                    }`}
                >
                    Bundles
                </button>
                <button
                    onClick={() => setActiveTab('offers')}
                    className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                        activeTab === 'offers'
                            ? 'bg-[#FFD700] text-black'
                            : 'bg-white text-black hover:bg-[#FF00A8] hover:text-white'
                    }`}
                >
                    Limited Time Offers
                </button>
            </div>

            {/* Home Sections Order Management */}
            {activeTab === 'homepage' && (
            <section className="mb-8">
                <h3 className="text-2xl font-display uppercase mb-4 border-b-2 border-black pb-2">
                    Manage homepage section order
                </h3>
                <div className="bg-white border-4 border-black p-4 sm:p-6">
                    <p className="text-sm text-black/70 mb-4">
                        Drag sections to change their order on the homepage. Use the toggle to show or hide each section.
                    </p>
                    <div className="space-y-3 mb-4">
                        {homeSections
                            .sort((a, b) => a.order - b.order)
                            .map((section) => (
                                <div
                                    key={section.key}
                                    draggable
                                    onDragStart={() => handleDragStart(section.key)}
                                    onDragOver={(e) => handleDragOver(e, section.key)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center justify-between p-3 border-2 border-gray-200 hover:border-black transition-colors cursor-move ${
                                        draggedSection === section.key ? 'opacity-50' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <GripVertical className="w-5 h-5 text-black/40 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-bold text-lg">{section.label}</p>
                                            <p className="text-sm text-gray-600">Order: {section.order}</p>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={section.enabled}
                                            onChange={() => handleToggleSection(section.key)}
                                            className="w-5 h-5 cursor-pointer"
                                        />
                                        <span className="font-semibold text-sm">{section.enabled ? 'Visible' : 'Hidden'}</span>
                                    </label>
                                </div>
                            ))}
                    </div>
                    <button
                        onClick={handleSaveOrder}
                        disabled={isSavingOrder}
                        className="w-full px-6 py-3 bg-[#FFD700] text-black font-bold uppercase border-4 border-black hover:bg-black hover:text-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSavingOrder ? 'Saving...' : 'Save order'}
                    </button>
                </div>
            </section>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.action === 'bulkDelete' ? 'Delete Multiple Products' : 'Delete Product'}
                message={confirmDialog.action === 'bulkDelete' 
                    ? `Are you sure you want to delete ${confirmDialog.productIds?.length || 0} product(s)? This action cannot be undone.`
                    : 'Are you sure you want to delete this product? This action cannot be undone.'}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, action: 'delete' })}
            />
            
            {/* Products Management Section */}
            {activeTab === 'products' && (
            <section className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-2xl font-display uppercase border-b-2 border-black pb-2">
                        Product management ({filteredProducts.length})
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {selectedProducts.size > 0 && (
                            <button 
                                onClick={handleBulkDelete}
                                className="px-6 py-3 bg-red-600 text-white font-bold uppercase border-4 border-black hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                <TrashIcon className="w-5 h-5"/>
                                Delete selected ({selectedProducts.size})
                            </button>
                        )}
                        <button 
                            onClick={() => handleOpenProductModal()} 
                            className="px-6 py-3 bg-[#FFD700] text-black font-bold uppercase border-4 border-black hover:bg-black hover:text-[#FFD700] transition-colors flex items-center gap-2 w-full sm:w-auto"
                        >
                            <PlusIcon className="w-5 h-5"/>
                            Add product
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white border-4 border-black p-4 sm:p-6 mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block font-bold text-sm mb-2">Search Products</label>
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search by name or description... (Ctrl+K)"
                                className="w-full border-2 border-black p-2 pr-20"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200"
                                    aria-label="Clear search"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block font-bold text-sm mb-2">Filter by Genre</label>
                        <select
                            value={filterGenre}
                            onChange={(e) => {
                                setFilterGenre(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full border-2 border-black p-2 bg-white"
                        >
                            <option value="all">All Genres</option>
                            {uniqueGenres.map(genre => (
                                <option key={genre} value={genre}>{genre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-sm mb-2">Filter by Tag</label>
                        <select
                            value={filterTag}
                            onChange={(e) => {
                                setFilterTag(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full border-2 border-black p-2 bg-white"
                        >
                            <option value="all">All Tags</option>
                            <option value="bundle">Bundle</option>
                            {availableTags.map(tag => (
                                <option key={tag} value={tag}>{tag}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
                {/* Desktop Table */}
                <div className="hidden lg:block bg-white border-4 border-black overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 border-b-4 border-black">
                        <tr>
                            <th className="p-4 font-bold uppercase">
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 cursor-pointer"
                                />
                            </th>
                            <th className="p-4 font-bold uppercase">Image</th>
                            <th className="p-4 font-bold uppercase">Name</th>
                            <th className="p-4 font-bold uppercase">Price</th>
                            <th className="p-4 font-bold uppercase">Genre</th>
                            <th className="p-4 font-bold uppercase">Wishlist</th>
                            <th className="p-4 font-bold uppercase">Discount</th>
                            <th className="p-4 font-bold uppercase">Stock</th>
                            <th className="p-4 font-bold uppercase">Gold Coins</th>
                            <th className="p-4 font-bold uppercase">Bundle</th>
                            <th className="p-4 font-bold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedProducts.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="p-8 text-center text-black/60">
                                    {searchQuery || filterGenre !== 'all' || filterTag !== 'all' 
                                        ? 'No products match your filters.' 
                                        : 'No products found.'}
                                </td>
                            </tr>
                        ) : (
                            paginatedProducts.map(product => (
                            <tr key={product.id} className="border-b-2 border-dashed border-black/20 last:border-b-0 hover:bg-gray-50">
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedProducts.has(product.id)}
                                        onChange={() => toggleProductSelection(product.id)}
                                        className="w-5 h-5 cursor-pointer"
                                    />
                                </td>
                                <td className="p-4">
                                    <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover border-2 border-black" />
                                </td>
                                <td className="p-4 font-semibold">{product.name}</td>
                                <td className="p-4 font-bold text-[#FF0000]">${product.price.toFixed(2)}</td>
                                <td className="p-4">{Array.isArray(product.genre) ? product.genre.join(', ') : product.genre || ''}</td>
                                <td className="p-4 font-extrabold">{product.wishlistCount || 0}</td>
                                <td className="p-4 font-extrabold">{product.discountPercent ? `${product.discountPercent}%` : '—'}</td>
                                <td className="p-4 font-bold">{product.stock}</td>
                                <td className="p-4 font-bold text-[#9333EA] flex items-center gap-1">
                                    <CoinIcon className="w-5 h-5" />
                                    <span>{product.goldCoins || 0}</span>
                                </td>
                                <td className="p-4">
                                    {product.bundleItems && product.bundleItems.length >= 2 ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-[0.2em]">
                                            {product.bundleItems.length} Items
                                        </span>
                                    ) : (
                                        <span className="text-sm text-black/40">—</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleToggleSale(product)} className={`p-2 bg-white border-2 border-black hover:bg-gray-200 ${product.tags?.includes('sale') ? 'text-yellow-500' : 'text-black'}`} aria-label={product.tags?.includes('sale') ? 'Remove from sale' : 'Add to sale'}>
                                            <StarIcon className="w-5 h-5 text-current" isFilled={product.tags?.includes('sale')} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleOpenProductModal(product);
                                            }} 
                                            className="p-2 bg-white text-black border-2 border-black hover:bg-gray-200 cursor-pointer"
                                            type="button"
                                            aria-label="Edit product"
                                        >
                                            <EditIcon className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => handleDeleteProductClick(product.id)} className="p-2 bg-white text-black border-2 border-black hover:bg-red-500 hover:text-white">
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t-4 border-black bg-gray-100">
                        <div className="text-sm font-bold">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border-2 border-black bg-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`px-4 py-2 border-2 border-black font-bold ${
                                                currentPage === pageNum
                                                    ? 'bg-[#FFD700] text-black'
                                                    : 'bg-white text-black hover:bg-gray-200'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border-2 border-black bg-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                {paginatedProducts.length === 0 ? (
                    <div className="bg-white border-4 border-black p-8 text-center text-black/60">
                        {searchQuery || filterGenre !== 'all' || filterTag !== 'all' 
                            ? 'No products match your filters.' 
                            : 'No products found.'}
                    </div>
                ) : (
                    <>
                        {paginatedProducts.map(product => (
                    <div key={product.id} className="bg-white border-4 border-black p-4">
                        <div className="flex items-start gap-2 mb-2">
                            <input
                                type="checkbox"
                                checked={selectedProducts.has(product.id)}
                                onChange={() => toggleProductSelection(product.id)}
                                className="w-5 h-5 cursor-pointer mt-1"
                            />
                            <div className="flex-1">
                        <div className="flex gap-4 mb-4">
                            <img src={product.imageUrl} alt={product.name} className="w-20 h-20 sm:w-24 sm:h-24 object-cover border-2 border-black flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg sm:text-xl mb-2 break-words">{product.name}</h3>
                                <p className="font-bold text-[#FF0000] text-xl sm:text-2xl mb-1">${product.price.toFixed(2)}</p>
                                <p className="text-sm text-black/70 mb-1">Genre: {Array.isArray(product.genre) ? product.genre.join(', ') : product.genre || ''}</p>
                                <p className="text-sm font-bold mb-1">Stock: {product.stock}</p>
                                <div className="flex items-center gap-1 text-sm font-bold text-[#9333EA]">
                                    <CoinIcon className="w-4 h-4" />
                                    <span>{product.goldCoins || 0} Gold Coins</span>
                                </div>
                                {product.bundleItems && product.bundleItems.length >= 2 && (
                                    <p className="text-xs font-black uppercase tracking-[0.3em] mt-1">
                                        Bundle · {product.bundleItems.length} items
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4 border-t-2 border-dashed border-black/20">
                            <button onClick={() => handleToggleSale(product)} className={`flex-1 p-2 bg-white border-2 border-black hover:bg-gray-200 flex items-center justify-center gap-2 ${product.tags?.includes('sale') ? 'text-yellow-500' : 'text-black'}`} aria-label={product.tags?.includes('sale') ? 'Remove from sale' : 'Add to sale'}>
                                <StarIcon className="w-5 h-5 text-current" isFilled={product.tags?.includes('sale')} />
                                <span className="text-sm font-bold">Sale</span>
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenProductModal(product);
                                }} 
                                className="flex-1 p-2 bg-white text-black border-2 border-black hover:bg-gray-200 flex items-center justify-center gap-2 cursor-pointer"
                                type="button"
                                aria-label="Edit product"
                            >
                                <EditIcon className="w-5 h-5"/>
                                <span className="text-sm font-bold">Edit</span>
                            </button>
                            <button onClick={() => handleDeleteProductClick(product.id)} className="flex-1 p-2 bg-white text-black border-2 border-black hover:bg-red-500 hover:text-white flex items-center justify-center gap-2">
                                <TrashIcon className="w-5 h-5"/>
                                <span className="text-sm font-bold">Delete</span>
                            </button>
                        </div>
                            </div>
                        </div>
                    </div>
                        ))}
                        {/* Mobile Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-4 border-black bg-white">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border-2 border-black bg-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <span className="font-bold">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 border-2 border-black bg-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            </section>
            )}

            {/* Bundles Management Section */}
            {activeTab === 'bundles' && (
            <section className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-2xl font-display uppercase border-b-2 border-black pb-2">
                        Bundle Management ({bundles.length})
                    </h3>
                    <button 
                        onClick={() => handleOpenBundleModal()} 
                        className="px-6 py-3 bg-[#FFD700] text-black font-bold uppercase border-4 border-black hover:bg-black hover:text-[#FFD700] transition-colors flex items-center gap-2 w-full sm:w-auto"
                    >
                        <PlusIcon className="w-5 h-5"/>
                        Create Bundle
                    </button>
                </div>

                {/* Bundles List */}
                <div className="bg-white border-4 border-black p-4 sm:p-6">
                    {bundles.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No bundles created yet. Create your first bundle!</p>
                    ) : (
                        <div className="space-y-4">
                            {bundles.map(bundle => {
                                const bundleProducts = safeProducts.filter(p => bundle.bundleItems?.includes(p.id));
                                return (
                                    <div
                                        key={bundle.id}
                                        className="border-2 border-gray-200 p-4 hover:border-black transition-colors"
                                    >
                                        <div className="flex flex-col lg:flex-row gap-4">
                                            {/* Bundle Image */}
                                            <div className="w-full lg:w-32 h-32 flex-shrink-0">
                                                <img
                                                    src={bundle.imageUrl}
                                                    alt={bundle.name}
                                                    className="w-full h-full object-cover border-2 border-black"
                                                />
                                            </div>
                                            
                                            {/* Bundle Info */}
                                            <div className="flex-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-lg">{bundle.name}</h4>
                                                        <p className="text-sm text-gray-600">{bundle.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-xl text-[#FF0000]">${bundle.price.toFixed(2)}</p>
                                                        <p className="text-sm text-gray-600">Stock: {bundle.stock}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* Bundle Items */}
                                                <div className="mb-3">
                                                    <p className="text-sm font-bold mb-2">
                                                        Bundle Items ({bundleProducts.length}):
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {bundleProducts.map(item => (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center gap-2 px-2 py-1 bg-gray-100 border-2 border-gray-300"
                                                            >
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    className="w-8 h-8 object-cover border border-black"
                                                                />
                                                                <span className="text-sm font-semibold">{item.name}</span>
                                                                <span className="text-xs text-gray-600">${item.price.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex gap-2 pt-3 border-t-2 border-dashed border-black/20">
                                                    <button
                                                        onClick={() => handleOpenBundleModal(bundle)}
                                                        className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-gray-200 flex items-center gap-2"
                                                    >
                                                        <EditIcon className="w-4 h-4"/>
                                                        <span className="text-sm font-bold">Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProductClick(bundle.id)}
                                                        className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-red-500 hover:text-white flex items-center gap-2"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                        <span className="text-sm font-bold">Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
            )}

            {/* Offers Management */}
            {activeTab === 'offers' && (
            <section className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-2xl font-display uppercase border-b-2 border-black pb-2">
                        Limited Time Offers ({offers.length})
                    </h3>
                    <button 
                        onClick={() => handleOpenOfferModal(null)} 
                        className="px-6 py-3 bg-[#FFD700] text-black font-bold uppercase border-4 border-black hover:bg-black hover:text-[#FFD700] transition-colors flex items-center gap-2 w-full sm:w-auto"
                    >
                        <PlusIcon className="w-5 h-5"/>
                        Create Offer
                    </button>
                </div>

                {/* Offers List */}
                <div className="bg-white border-4 border-black p-4 sm:p-6">
                    {isLoadingOffers ? (
                        <p className="text-center py-8">Loading offers...</p>
                    ) : offers.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No offers created yet. Create your first limited time offer!</p>
                    ) : (
                        <div className="space-y-4">
                            {offers.map(offer => {
                                const isExpired = new Date(offer.endsAt) < new Date();
                                return (
                                    <div
                                        key={offer.id}
                                        className={`border-2 p-4 transition-colors ${
                                            offer.isActive && !isExpired
                                                ? 'bg-yellow-50'
                                                : isExpired
                                                ? 'border-gray-300 bg-gray-50'
                                                : 'border-gray-200'
                                        }`}
                                        style={offer.isActive && !isExpired ? { borderColor: '#ffd700' } : undefined}
                                    >
                                        <div className="flex flex-col lg:flex-row gap-4">
                                            {/* Mini Offer Preview */}
                                            <div className="w-full lg:w-48 lg:h-48 h-32 flex-shrink-0 relative rounded-none border-2 border-black overflow-hidden">
                                            {offer.backgroundImageUrl && (
                                                    <div
                                                        className="absolute inset-0"
                                                        style={{
                                                            backgroundImage: `url(${offer.backgroundImageUrl})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                            backgroundRepeat: 'no-repeat',
                                                            opacity: 1,
                                                            zIndex: 0
                                                        }}
                                                    />
                                                )}
                                                {/* Mini Preview Content - Empty, just image */}
                                            </div>
                                            
                                            {/* Offer Info */}
                                            <div className="flex-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-lg">{offer.name || 'Untitled Offer'}</h4>
                                                            {offer.isActive && !isExpired && (
                                                                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold uppercase">Active</span>
                                                            )}
                                                            {isExpired && (
                                                                <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold uppercase">Expired</span>
                                                            )}
                                                            {!offer.isActive && (
                                                                <span className="px-2 py-1 bg-gray-400 text-white text-xs font-bold uppercase">Inactive</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {offer.discountPercent > 0 && (
                                                            <p className="font-bold text-xl text-[#FF0000]">{offer.discountPercent}% OFF</p>
                                                        )}
                                                        <p className="text-sm text-gray-600">Ends: {new Date(offer.endsAt).toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-4">
                                                    <button
                                                        onClick={() => handleOpenOfferModal(offer)}
                                                        className="px-4 py-2 bg-gray-500 text-white font-bold uppercase border-2 border-black hover:bg-black transition-colors flex items-center gap-2"
                                                    >
                                                        <EditIcon className="w-4 h-4"/>
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOffer(offer.id)}
                                                        className="px-4 py-2 bg-red-600 text-white font-bold uppercase border-2 border-black hover:bg-black transition-colors flex items-center gap-2"
                                                    >
                                                        <TrashIcon className="w-4 h-4"/>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>
            )}

            {/* Offer Modal */}
            {isOfferModalOpen && (
                <OfferFormModal
                    offer={editingOffer}
                    onClose={handleCloseOfferModal}
                    onSave={handleSaveOffer}
                />
            )}

        </div>
    );
};

export default ProductsPage;
