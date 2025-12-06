import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CartIcon, SearchIcon, CloseIcon, HeartIcon, UserIcon, MenuIcon, DashboardIcon, PackageIcon, TagIcon } from './Icons';
import useStore from '../store/useStore';
import BurgerMenu from './BurgerMenu';
import LanguageSwitcher from './LanguageSwitcher';
import { getAvatar } from '../utils/avatars';

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { 
    searchQuery, 
    setSearchQuery,
    clearSearchQuery,
    cart, 
    wishlist, 
    navigate, 
    currentView,
    isLoggedIn,
    openRegisterModal,
    openUserCabinet,
    userAvatar,
    userMessages,
    badgeColors,
  } = useStore();
  
  // Calculate unread messages by type with memoization
  const messageTypesWithCounts = useMemo(() => {
    const unreadMessages = userMessages.filter(
      message => !message.isRead && !message.isArchived && !message.isDeleted
    );

    // Count messages by type
    const messagesByType = unreadMessages.reduce((acc, message) => {
      const type = message.type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create array of message types with counts for cycling
    return Object.entries(messagesByType).map(([type, count]) => ({
      type: type as 'order' | 'wishlist' | 'general',
      count,
    }));
  }, [userMessages]);

  const unreadMessageCount = messageTypesWithCounts.reduce((sum, item) => sum + item.count, 0);

  // State for cycling through different message type badges
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

  // Cycle through message types every 2 seconds if there are multiple types
  useEffect(() => {
    if (messageTypesWithCounts.length > 1) {
      setCurrentBadgeIndex(0); // Reset to first when types change
      const interval = setInterval(() => {
        setCurrentBadgeIndex(prev => (prev + 1) % messageTypesWithCounts.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setCurrentBadgeIndex(0);
    }
  }, [messageTypesWithCounts]);

  // Convert BadgeColor to Tailwind class
  const getBadgeColorClass = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      red: 'bg-red-600',
      green: 'bg-green-600',
      blue: 'bg-blue-600',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-600',
      pink: 'bg-pink-500',
      orange: 'bg-orange-500',
      cyan: 'bg-cyan-500',
    };
    return colorMap[colorName] || 'bg-red-600';
  };

  // Get current badge info (color and count)
  const getCurrentBadgeInfo = () => {
    if (messageTypesWithCounts.length === 0) {
      // Use default general color even when no messages
      const colorName = badgeColors.general;
      const color = getBadgeColorClass(colorName);
      return { color, count: 0 };
    }
    
    // Ensure index is within bounds
    const safeIndex = currentBadgeIndex % messageTypesWithCounts.length;
    const current = messageTypesWithCounts[safeIndex];
    
    if (!current) {
      const colorName = badgeColors.general;
      const color = getBadgeColorClass(colorName);
      return { color, count: 0 };
    }
    
    // Get color from user settings
    const colorName = badgeColors[current.type];
    const color = getBadgeColorClass(colorName);
    
    return { color, count: current.count };
  };

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isBrowseActive = currentView === 'browse';

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
  };
  
  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    clearSearchQuery();
  }, [clearSearchQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 300); 
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseSearch();
        setIsMenuOpen(false);
      }
    };
    
    if (isSearchOpen || isMenuOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isSearchOpen, isMenuOpen, handleCloseSearch]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      searchInputRef.current?.blur();
    }
  };

  const handleToggle = () => {
    navigate(isBrowseActive ? 'home' : 'browse');
  };

  return (
    <header className="bg-white text-black sticky top-0 z-20 border-b-4 border-black">
      <div className="container mx-auto max-w-[1472px] px-4 sm:px-6 lg:px-8 h-20 relative overflow-hidden">

        <div className={`flex items-center justify-between h-full transition-transform duration-300 ease-in-out ${isSearchOpen ? '-translate-x-full' : 'translate-x-0'}`}>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('home')} className="text-3xl font-display uppercase tracking-wider hover:text-[#0047AB] transition-colors">
              {t('header.title')}
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleOpenSearch}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors"
              aria-label={t('header.openSearch')}
            >
              <SearchIcon className="h-6 w-6" />
            </button>
            
            <div
                onClick={handleToggle}
                className="hidden sm:flex items-stretch border-4 border-black cursor-pointer group h-10 bg-white"
                role="switch"
                aria-checked={isBrowseActive}
                aria-label="Toggle browse view"
            >
                <span className="font-bold uppercase text-base text-black select-none px-4 flex items-center group-hover:text-[#0047AB] transition-colors">
                    {t('header.browse')}
                </span>
                <div className={`relative w-14 flex-shrink-0 border-l-4 border-black transition-colors duration-200 ${isBrowseActive ? 'bg-[#FFD700]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1/2 -translate-y-1/2 left-1 w-5 h-5 bg-black transition-transform duration-200 ease-in-out ${isBrowseActive ? 'translate-x-5' : 'translate-x-0'}`}>
                    </div>
                </div>
            </div>

            <button
              onClick={() => navigate('sale')}
              className={`hidden sm:flex items-center justify-center border-4 border-black h-10 px-4 font-bold uppercase text-base transition-colors ${
                currentView === 'sale'
                  ? 'bg-[#FFD700] text-black'
                  : 'bg-white text-black hover:text-[#0047AB]'
              }`}
              aria-label={t('header.viewSale')}
            >
              {t('header.sale')}
            </button>
            
            {isLoggedIn && (
              <button 
                onClick={() => navigate('wishlist')}
                className="hidden md:flex w-10 h-10 flex-shrink-0 items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors relative"
                aria-label={t('header.viewWishlist', { count: wishlist.length })}
              >
                <HeartIcon className={`h-6 w-6 ${currentView === 'wishlist' ? 'text-red-500' : 'text-black'}`} isFilled={currentView === 'wishlist'}/>
                {wishlist.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF0000] border-2 border-black text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                    {wishlist.length}
                  </span>
                )}
              </button>
            )}

            <button 
              onClick={() => navigate('cart')}
              className="hidden md:flex w-10 h-10 flex-shrink-0 items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors relative"
              aria-label={t('header.viewCart', { count: cart.length })}
            >
              <CartIcon className="h-6 w-6" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#FF0000] border-2 border-black text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                  {cart.length}
                </span>
              )}
            </button>

            <div className="hidden md:flex">
              <LanguageSwitcher />
            </div>

            <button 
              onClick={isLoggedIn ? openUserCabinet : () => openRegisterModal()}
              className="hidden md:flex w-10 h-10 flex-shrink-0 items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors overflow-visible relative"
              aria-label={isLoggedIn ? t('header.openUserCabinet') : t('header.openRegistration')}
            >
              {isLoggedIn && userAvatar !== undefined ? (
                <img 
                  src={getAvatar(userAvatar).image} 
                  alt={getAvatar(userAvatar).name}
                  className="w-full h-full object-cover relative z-0"
                />
              ) : (
                <UserIcon className="h-6 w-6 relative z-0"/>
              )}
              {isLoggedIn && unreadMessageCount > 0 && (() => {
                const badgeInfo = getCurrentBadgeInfo();
                return (
                  <span className={`absolute top-0 right-0 flex items-center justify-center min-w-[20px] h-[20px] px-1 ${badgeInfo.color} border-2 border-black text-white text-[11px] font-bold leading-none rounded-full z-20 shadow-lg transform translate-x-1/2 -translate-y-1/2 transition-all duration-500`}>
                    {badgeInfo.count > 9 ? '9+' : badgeInfo.count}
                  </span>
                );
              })()}
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden w-10 h-10 flex-shrink-0 flex items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors"
              aria-label={t('header.openMenu')}
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className={`absolute left-0 right-0 top-0 bottom-0 flex items-center px-4 sm:px-6 lg:px-8 bg-white transition-transform duration-300 ease-in-out ${isSearchOpen ? 'translate-x-0 z-10' : 'translate-x-full pointer-events-none'}`}>
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-6 h-6 text-black/50"/>
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-12 bg-transparent text-lg text-black placeholder:text-black/50 pl-12 pr-12 py-2 border-2 border-transparent focus:outline-none focus:ring-4 focus:ring-[#FFD700] focus:border-black transition"
              aria-label={t('header.searchPlaceholder')}
            />
            <button
              onClick={handleCloseSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/70 hover:text-black transition"
              aria-label={t('header.closeSearch')}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

      </div>
      <BurgerMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        maxWidth="container"
      >
        <button
          onClick={() => {
            navigate('home');
            setIsMenuOpen(false);
          }}
          className={`w-full text-left flex items-center gap-3 p-4 font-bold text-base border-4 border-black transition-colors ${
            currentView === 'home' 
              ? 'bg-[#FFD700] text-black' 
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          <DashboardIcon className="w-6 h-6 flex-shrink-0" />
          {t('footer.home')}
        </button>
        <button
          onClick={() => {
            navigate('browse');
            setIsMenuOpen(false);
          }}
          className={`w-full text-left flex items-center gap-3 p-4 font-bold text-base border-4 border-black transition-colors ${
            currentView === 'browse' 
              ? 'bg-[#FFD700] text-black' 
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          <PackageIcon className="w-6 h-6 flex-shrink-0" />
          {t('header.browse')}
        </button>
        <button
          onClick={() => {
            navigate('sale');
            setIsMenuOpen(false);
          }}
          className={`w-full text-left flex items-center gap-3 p-4 font-bold text-base border-4 border-black transition-colors ${
            currentView === 'sale' 
              ? 'bg-[#FFD700] text-black' 
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          <TagIcon className="w-6 h-6 flex-shrink-0" />
          {t('header.sale')}
        </button>
        <button
          onClick={() => {
            navigate('cart');
            setIsMenuOpen(false);
          }}
          className={`w-full text-left flex items-center gap-3 p-4 font-bold text-base border-4 border-black transition-colors relative ${
            currentView === 'cart' 
              ? 'bg-[#FFD700] text-black' 
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          <CartIcon className="w-6 h-6 flex-shrink-0" />
          {t('header.cart')}
          {cart.length > 0 && (
            <span className="ml-auto bg-[#FF0000] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
        {isLoggedIn && (
          <button
            onClick={() => {
              navigate('wishlist');
              setIsMenuOpen(false);
            }}
            className={`w-full text-left flex items-center gap-3 p-4 font-bold text-base border-4 border-black transition-colors relative ${
              currentView === 'wishlist' 
                ? 'bg-[#FFD700] text-black' 
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            <HeartIcon className="w-6 h-6 flex-shrink-0" isFilled={currentView === 'wishlist'} />
            {t('header.wishlist')}
            {wishlist.length > 0 && (
              <span className="ml-auto bg-[#FF0000] text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => {
            if (isLoggedIn) {
              openUserCabinet();
            } else {
              openRegisterModal();
            }
            setIsMenuOpen(false);
          }}
          className="w-full text-left flex items-center gap-3 p-4 font-bold text-base border-4 border-black bg-white text-black hover:bg-gray-200 transition-colors relative"
        >
          <UserIcon className="w-6 h-6 flex-shrink-0" />
          {isLoggedIn ? t('header.userCabinet') : t('header.loginRegister')}
          {isLoggedIn && unreadMessageCount > 0 && (
            <span className="ml-auto flex items-center justify-center min-w-[20px] h-[20px] px-1.5 bg-red-600 border-2 border-black text-white text-xs font-bold rounded-full">
              {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
            </span>
          )}
        </button>
        <div className="md:hidden px-4 pb-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </BurgerMenu>
    </header>
  );
};

export default Header;
