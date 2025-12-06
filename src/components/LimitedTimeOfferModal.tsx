import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from './Icons';
import { LimitedTimeOffer } from '../api/offers';

interface LimitedTimeOfferModalProps {
  offer: LimitedTimeOffer;
  onClose: () => void;
  onNavigate?: () => void;
}

const LimitedTimeOfferModal: React.FC<LimitedTimeOfferModalProps> = ({ offer, onClose, onNavigate }) => {
  const [imageError, setImageError] = useState(false);
  const [imageKey, setImageKey] = useState(() => Date.now());
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const previousImageUrlRef = useRef<string | undefined>(offer.backgroundImageUrl);

  // Reset image error and force re-render when backgroundImageUrl changes
  useEffect(() => {
    const currentUrl = offer.backgroundImageUrl;
    const previousUrl = previousImageUrlRef.current;
    
    // Always update imageKey to force cache busting, even if URL is the same
    // This ensures the image reloads when the offer is updated
    setImageError(false);
    const newKey = Date.now();
    setImageKey(newKey);
    
    // Only update ref if URL actually changed
    if (currentUrl !== previousUrl) {
      previousImageUrlRef.current = currentUrl;
    }
    
    // Preload the image to check if it loads and force browser to reload
    if (currentUrl) {
      const img = new Image();
      const cacheBuster = `t=${newKey}`;
      const separator = currentUrl.includes('?') ? '&' : '?';
      const imageUrlWithCache = `${currentUrl}${separator}${cacheBuster}`;
      
      // Set src multiple times to force browser reload
      img.src = imageUrlWithCache;
      setTimeout(() => {
        img.src = imageUrlWithCache + '&_=' + Date.now();
      }, 10);
      
      img.onload = () => {
        setImageError(false);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        setImageError(true);
        setImageDimensions(null);
      };
    }
  }, [offer.backgroundImageUrl, offer.id]); // Depend on both to catch any offer changes

  // Memoize the background image URL with cache busting
  const backgroundImageUrlWithCache = useMemo(() => {
    if (!offer.backgroundImageUrl) return '';
    const separator = offer.backgroundImageUrl.includes('?') ? '&' : '?';
    const urlWithCache = `${offer.backgroundImageUrl}${separator}t=${imageKey}`;
    // Debug: log the URL to verify cache busting is working
    console.log('[LimitedTimeOfferModal] Background image URL with cache:', urlWithCache, 'Key:', imageKey);
    return urlWithCache;
  }, [offer.backgroundImageUrl, imageKey]);

  // Calculate container dimensions with max constraints while maintaining aspect ratio
  const containerStyle = useMemo(() => {
    if (!imageDimensions) {
      return { width: 'auto', height: 'auto', maxWidth: '90vw', maxHeight: '90vh' };
    }
    
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    const aspectRatio = imageDimensions.width / imageDimensions.height;
    
    let width = imageDimensions.width;
    let height = imageDimensions.height;
    
    // Scale down if exceeds max dimensions while maintaining aspect ratio
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: '90vw',
      maxHeight: '90vh'
    };
  }, [imageDimensions]);

  const handleNavigate = () => {
    onClose();
    
    // If productIds are set, navigate to sale page with highlighted products
    if (offer.productIds && offer.productIds.length > 0) {
      const productIdsParam = offer.productIds.join(',');
      // Use navigate function from store if available, otherwise use window.location
      if (onNavigate) {
        // Navigate to sale and then update hash
        onNavigate();
        setTimeout(() => {
          window.location.hash = `sale?highlight=${productIdsParam}`;
        }, 100);
      } else {
        window.location.hash = `sale?highlight=${productIdsParam}`;
      }
      return;
    }
    
    // Otherwise use redirectUrl or default navigation
    if (offer.redirectUrl) {
      window.location.href = offer.redirectUrl;
    } else if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <div 
        className="relative mx-4 rounded-none overflow-visible cursor-pointer"
        style={containerStyle}
        onClick={handleNavigate}
      >
        {/* Close button - inside container but with high z-index */}
        <div className="absolute -top-8 -right-8" style={{ zIndex: 100 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-12 h-12 bg-black text-white border-4 border-white flex items-center justify-center hover:bg-red-600 transition-colors"
            aria-label="Close offer"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        {/* Background Image */}
        {offer.backgroundImageUrl && backgroundImageUrlWithCache && !imageError && (
          <img 
            key={`offer-img-${offer.id}-${imageKey}-${offer.backgroundImageUrl}`}
            src={backgroundImageUrlWithCache}
            alt="" 
            className="block w-full h-full"
            style={{ display: 'block', objectFit: 'contain' }}
            onError={() => setImageError(true)}
            onLoad={(e) => {
              const img = e.currentTarget;
              setImageError(false);
              setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LimitedTimeOfferModal;

