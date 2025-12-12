import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import Header from './components/Header';
import ProductModal from './components/ProductModal';
import Toast from './components/Toast';
import RegisterModal from './components/RegisterModal';
import UserCabinetModal from './components/UserCabinetModal';
import Footer from './components/Footer';
import AppLoader from './components/AppLoader';
import LimitedTimeOfferModal from './components/LimitedTimeOfferModal';
import ChatAssistant from './components/ChatAssistant';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorLogger from './components/ErrorLogger';
import useStore from './store/useStore';
import i18n from './i18n/config';
import { fetchActiveOffer, LimitedTimeOffer } from './api/offers';

// Helper function to make dynamic imports more robust
// Retries the import if it fails (common issue with Vite dev server)
const lazyLoad = (importFn: () => Promise<any>, retries = 3): React.LazyExoticComponent<any> => {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Dynamic import failed (attempt ${i + 1}/${retries}):`, lastError.message);
        
        // Wait a bit before retrying (exponential backoff)
        if (i < retries - 1) {
          const delay = 100 * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all retries failed, try one more time with a longer delay
    // This handles cases where Vite server needs more time to initialize
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const module = await importFn();
      console.log('Module loaded successfully after extended retry');
      return module;
    } catch (finalError) {
      // If still failing, log detailed error info
      console.error('Failed to load module after all retries:', lastError);
      console.error('Final error:', finalError);
      console.error('This might indicate a Vite dev server configuration issue.');
      console.error('Try refreshing the page or restarting the dev server.');
      
      // In development, suggest a page reload as last resort
      if (process.env.NODE_ENV === 'development') {
        const reloadKey = 'vite-module-reload-attempted';
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, 'true');
          console.warn('Attempting page reload to fix module loading...');
          setTimeout(() => window.location.reload(), 2000);
        }
      }
      
      throw lastError || new Error('Failed to load module after retries');
    }
  });
};

// Lazy load pages for better performance
const HomePage = lazyLoad(() => import('./pages/HomePage'));
const BrowsePage = lazyLoad(() => import('./pages/BrowsePage'));
const CartPage = lazyLoad(() => import('./pages/CartPage'));
const WishlistPage = lazyLoad(() => import('./pages/WishlistPage'));
const AdminLayout = lazyLoad(() => import('./pages/Admin/AdminLayout'));
const SalePage = lazyLoad(() => import('./pages/SalePage'));
const PaymentStatusPage = lazyLoad(() => import('./pages/PaymentStatusPage'));
const PaymentSimulationPage = lazyLoad(() => import('./pages/PaymentSimulationPage'));

const App: React.FC = () => {
  // Оптимизация: используем один селектор вместо множества
  const {
    isLoading,
    fetchProducts,
    currentView,
    selectedProduct,
    closeProductModal,
    addToCart,
    wishlist,
    toggleWishlist,
    isRegisterModalOpen,
    closeRegisterModal,
    register,
    login,
    registerPrompt,
    isUserCabinetOpen,
    userEmail,
    userRole,
    userGoldCoins,
    userFirstName,
    userLastName,
    userAvatar,
    userPhone,
    userAddress,
    closeUserCabinet,
    logout,
    purchaseHistory,
    navigate,
    toastMessage,
    clearToast,
    navigateToBrowseWithFilter,
    userMessages,
    markMessageRead,
    setToast,
    filterGroups,
    filterAssignments,
    language,
    setPaymentStatus,
    consumeCheckoutSummary,
    finalizeSuccessfulCheckout,
    clearCart,
  } = useStore(state => ({
    isLoading: state.isLoading,
    fetchProducts: state.fetchProducts,
    currentView: state.currentView,
    selectedProduct: state.selectedProduct,
    closeProductModal: state.closeProductModal,
    addToCart: state.addToCart,
    wishlist: state.wishlist,
    toggleWishlist: state.toggleWishlist,
    isRegisterModalOpen: state.isRegisterModalOpen,
    closeRegisterModal: state.closeRegisterModal,
    register: state.register,
    login: state.login,
    registerPrompt: state.registerPrompt,
    isUserCabinetOpen: state.isUserCabinetOpen,
    userEmail: state.userEmail,
    userRole: state.userRole,
    userGoldCoins: state.userGoldCoins,
    userFirstName: state.userFirstName,
    userLastName: state.userLastName,
    userAvatar: state.userAvatar,
    userPhone: state.userPhone,
    userAddress: state.userAddress,
    closeUserCabinet: state.closeUserCabinet,
    logout: state.logout,
    purchaseHistory: state.purchaseHistory,
    navigate: state.navigate,
    toastMessage: state.toastMessage,
    clearToast: state.clearToast,
    navigateToBrowseWithFilter: state.navigateToBrowseWithFilter,
    userMessages: state.userMessages,
    markMessageRead: state.markMessageRead,
    setToast: state.setToast,
    filterGroups: state.filterGroups,
    filterAssignments: state.filterAssignments,
    language: state.language,
    setPaymentStatus: state.setPaymentStatus,
    consumeCheckoutSummary: state.consumeCheckoutSummary,
    finalizeSuccessfulCheckout: state.finalizeSuccessfulCheckout,
    clearCart: state.clearCart,
  }));

  const platformConfig = (filterAssignments.platform && filterGroups[filterAssignments.platform]?.items) || {};
  const isAdminView = currentView === 'admin';

  const [chatGreetingTrigger, setChatGreetingTrigger] = useState(0);
  const [activeOffer, setActiveOffer] = useState<LimitedTimeOffer | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const offerShownRef = useRef(false);

  // Синхронизируем язык из store с i18next при загрузке
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    // Обновляем атрибут lang на html элементе
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch active offer on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadActiveOffer = async () => {
      // #region agent log
      // Agent log disabled - service unavailable
      // #endregion
      try {
        const offer = await fetchActiveOffer();
        if (offer && isMounted) {
          const showFrequency = offer.showFrequency || 'once_per_day';
          const now = Date.now();
          
          // Check if modal is already open to prevent double showing
          if (isOfferModalOpen) {
            return;
          }
          
          let shouldShow = false;

          if (showFrequency === 'on_refresh') {
            // For on_refresh mode, use sessionStorage for justClosed (clears on page refresh)
            const justClosedKey = `offer_${offer.id}_just_closed`;
            const justClosed = sessionStorage.getItem(justClosedKey);
            
            if (justClosed && parseInt(justClosed) > now - 5000) {
              // User just closed this offer, don't show it again immediately
              // But on page refresh, sessionStorage clears, so offer can show again
              return;
            }
            // For on_refresh, show on every page refresh/reload
            // Check if user just navigated from this offer (within last 1 second)
            // This prevents showing offer immediately after clicking "Go To Offer"
            // Using 1 second instead of 2 to ensure offer shows on page refresh
            const navigatedFromOfferKey = `offer_${offer.id}_navigated`;
            const navigatedFromOffer = sessionStorage.getItem(navigatedFromOfferKey);
            
            if (navigatedFromOffer) {
              const navigatedTime = parseInt(navigatedFromOffer);
              const timeSinceNavigation = now - navigatedTime;
              
              // If user navigated less than 1 second ago, don't show offer
              // This prevents immediate re-showing after navigation
              // After 1 second or on page refresh, this check will pass
              if (timeSinceNavigation < 1000) {
                return;
              }
              
              // Clear the flag if enough time has passed
              sessionStorage.removeItem(navigatedFromOfferKey);
            }
            
            // Show offer on refresh (this will be true after 1 second or on page refresh)
            shouldShow = true;
          } else {
            // For once_per_day and every_hour modes, check if user just closed this offer
            // Use localStorage so it persists across page refreshes
            const justClosedKey = `offer_${offer.id}_just_closed`;
            const justClosed = localStorage.getItem(justClosedKey);
            
            if (justClosed && parseInt(justClosed) > now - 5000) {
              // User just closed this offer, don't show it again immediately
              return;
            }
            
            // Also check if user just navigated from this offer
            // This prevents showing offer immediately after clicking "Go To Offer"
            const navigatedFromOfferKey = `offer_${offer.id}_navigated`;
            const navigatedFromOffer = sessionStorage.getItem(navigatedFromOfferKey);
            
            if (navigatedFromOffer) {
              const navigatedTime = parseInt(navigatedFromOffer);
              const timeSinceNavigation = now - navigatedTime;
              
              // If user navigated less than 2 seconds ago, don't show offer
              if (timeSinceNavigation < 2000) {
                return;
              }
            }
            
            if (showFrequency === 'every_hour') {
              // Show every hour
              const lastShownKey = `offer_${offer.id}_last_shown`;
              const lastShown = localStorage.getItem(lastShownKey);
              const oneHourAgo = now - (60 * 60 * 1000);
              
              if (!lastShown || parseInt(lastShown) < oneHourAgo) {
                shouldShow = true;
                localStorage.setItem(lastShownKey, String(now));
              }
            } else {
              // Default: once_per_day
              const seenOfferId = localStorage.getItem('seenOfferId');
              const offerExpiry = localStorage.getItem('offerExpiry');
              
              // Show offer if:
              // 1. User hasn't seen this offer, OR
              // 2. The stored expiry has passed (new offer or offer was updated), OR
              // 3. It's a new day (check if last seen date is different from today)
              const today = new Date().toDateString();
              const lastSeenDate = localStorage.getItem('lastSeenOfferDate');
              
              if (seenOfferId !== String(offer.id) || 
                  !offerExpiry || 
                  parseInt(offerExpiry) < now ||
                  lastSeenDate !== today) {
                shouldShow = true;
                localStorage.setItem('seenOfferId', String(offer.id));
                localStorage.setItem('offerExpiry', String(new Date(offer.endsAt).getTime()));
                localStorage.setItem('lastSeenOfferDate', today);
              }
            }
          }

          if (shouldShow) {
            setActiveOffer(offer);
            setIsOfferModalOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch active offer:', error);
        // #region agent log
        // Agent log disabled - service unavailable
        // #endregion
      }
    };

    // Only load offer on home page (not on admin or other pages)
    if (currentView === 'home') {
      loadActiveOffer();
    } else {
      // Close offer modal if user navigated away from home page
      if (isOfferModalOpen) {
        setIsOfferModalOpen(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [currentView, isOfferModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    if (!paymentResult) return;

    const orderId = params.get('order') || undefined;
    const summary = orderId ? consumeCheckoutSummary(orderId) : null;
    const status = paymentResult === 'success' ? 'success' : 'cancel';
    const message =
      status === 'success' ? 'Payment completed successfully!' : 'Payment was cancelled.';

    if (status === 'success') {
      if (summary) {
        finalizeSuccessfulCheckout(summary).catch(error => {
          console.error('[App] Failed to finalize checkout:', error);
        });
      }
      clearCart();
    }
    setToast(message);
    setPaymentStatus({
      status,
      orderId,
      isSimulated: summary?.isSimulated,
      message,
      summary: summary || null,
    });
    navigate('payment-status');

    params.delete('payment');
    if (orderId) {
      params.delete('order');
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [
    setToast,
    setPaymentStatus,
    consumeCheckoutSummary,
    clearCart,
    navigate,
    finalizeSuccessfulCheckout,
  ]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);
  
  useEffect(() => {
    const shouldLockScroll =
      selectedProduct ||
      isRegisterModalOpen ||
      isUserCabinetOpen ||
      (!isAdminView && isOfferModalOpen);

    document.body.style.overflow = shouldLockScroll ? 'hidden' : 'auto';

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedProduct, isRegisterModalOpen, isUserCabinetOpen, isOfferModalOpen, isAdminView]);

  const triggerChatGreeting = () => {
    setChatGreetingTrigger(prev => prev + 1);
  };

  const handleOfferModalClose = () => {
    setIsOfferModalOpen(false);
    
    // Mark that user just closed this offer to prevent immediate reopening
    if (activeOffer) {
      const justClosedKey = `offer_${activeOffer.id}_just_closed`;
      const now = Date.now();
      
      // Use sessionStorage for on_refresh mode (clears on page refresh)
      // Use localStorage for other modes (persists across refreshes)
      const showFrequency = activeOffer.showFrequency || 'once_per_day';
      if (showFrequency === 'on_refresh') {
        sessionStorage.setItem(justClosedKey, String(now));
      } else {
        localStorage.setItem(justClosedKey, String(now));
      }
    }
    
    triggerChatGreeting();
  };

  const handleNavigateFromOffer = () => {
    handleOfferModalClose();
    
    // Mark that user navigated from offer to prevent showing it again
    // Use sessionStorage so it clears on page refresh
    if (activeOffer) {
      const navigatedFromOfferKey = `offer_${activeOffer.id}_navigated`;
      sessionStorage.setItem(navigatedFromOfferKey, String(Date.now()));
    }
    
    // If productIds are set, navigate to sale page with highlighted products
    if (activeOffer?.productIds && activeOffer.productIds.length > 0) {
      navigate('sale');
      const productIdsParam = activeOffer.productIds.join(',');
      setTimeout(() => {
        window.location.hash = `sale?highlight=${productIdsParam}`;
      }, 100);
    } else if (activeOffer?.redirectUrl) {
      window.location.href = activeOffer.redirectUrl;
    } else {
      navigate('sale');
    }
  };

  const renderCurrentView = () => {
    const PageComponent = (() => {
      switch (currentView) {
        case 'home':
          return HomePage;
        case 'browse':
          return BrowsePage;
        case 'cart':
          return CartPage;
        case 'wishlist':
          return WishlistPage;
        case 'sale':
          return SalePage;
        case 'admin':
          return AdminLayout;
        case 'payment-status':
          return PaymentStatusPage;
        case 'payment-sim':
          return PaymentSimulationPage;
        default:
          return HomePage;
      }
    })();

    return (
      <Suspense fallback={<AppLoader />}>
        <ErrorBoundary>
          <PageComponent />
        </ErrorBoundary>
      </Suspense>
    );
  };

  if (isLoading) {
    return <AppLoader />;
  }

  const content = isAdminView ? (
    <div className="app-shell min-h-screen bg-dots">
      <AdminLayout />
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  ) : (
    <div className="app-shell min-h-screen bg-dots flex flex-col">
      <Header />
      <main className="container mx-auto max-w-[1472px] px-4 py-8 sm:px-6 lg:px-8 flex-grow">
        {renderCurrentView()}
      </main>
      <Footer
        onNavigate={navigate}
        platformConfig={platformConfig}
        onPlatformClick={navigateToBrowseWithFilter}
      />
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={closeProductModal}
          onAddToCart={addToCart}
          isInWishlist={wishlist.includes(selectedProduct.id)}
          onToggleWishlist={toggleWishlist}
        />
      )}
      {isRegisterModalOpen && (
        <RegisterModal
          onClose={closeRegisterModal}
          onRegister={register}
          onLogin={login}
          promptMessage={registerPrompt}
        />
      )}
      {isUserCabinetOpen && (
        <UserCabinetModal
          userEmail={userEmail}
          userRole={userRole}
          userGoldCoins={userGoldCoins}
          userMessages={userMessages}
          userFirstName={userFirstName}
          userLastName={userLastName}
          userAvatar={userAvatar}
          userPhone={userPhone}
          userAddress={userAddress}
          onClose={closeUserCabinet}
          onLogout={logout}
          purchaseHistory={purchaseHistory}
          onNavigate={navigate}
          onOpenMessage={markMessageRead}
        />
      )}
      {isOfferModalOpen && activeOffer && (
        <LimitedTimeOfferModal
          offer={activeOffer}
          onClose={handleOfferModalClose}
          onNavigate={handleNavigateFromOffer}
        />
      )}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );

  return (
    <ErrorBoundary>
      {content}
      {!isAdminView && <ChatAssistant greetingTrigger={chatGreetingTrigger} />}
      <ErrorLogger />
    </ErrorBoundary>
  );
};

export default App;
