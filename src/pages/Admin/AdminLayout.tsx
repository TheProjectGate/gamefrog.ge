import React, { useState, useEffect } from 'react';
import { DashboardIcon, PackageIcon, MenuIcon, CloseIcon, MailIcon, AnalyticsIcon, CogIcon } from '../../components/Icons';
import useStore from '../../store/useStore';
import DashboardPage from './DashboardPage';
import ProductsPage from './ProductsPage';
import MessagesPage from './MessagesPage';
import AnalyticsPage from './AnalyticsPage';
import SettingsPage from './SettingsPage';
import ErrorBoundary from '../../components/ErrorBoundary';

type AdminView = 'dashboard' | 'products' | 'messages' | 'analytics' | 'settings';

const AdminLayout: React.FC = () => {
  // Load activeView from localStorage or default to 'dashboard'
  const [activeView, setActiveView] = useState<AdminView>(() => {
    const saved = localStorage.getItem('adminActiveView');
    return (saved && ['dashboard', 'products', 'messages', 'analytics', 'settings'].includes(saved))
      ? (saved as AdminView)
      : 'dashboard';
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { navigate } = useStore();

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminActiveView', activeView);
  }, [activeView]);

  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search (only on the products page)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && activeView === 'products') {
        e.preventDefault();
        // The focus handler lives inside ProductsPage
      }
      // Escape closes the mobile menu
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeView, isMenuOpen]);

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'products':
        return <ProductsPage />;
      case 'messages':
        return <MessagesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen relative">
      {/* Desktop Sidebar (fixed) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 bg-black text-white p-6 flex-col z-20">
        <h1 className="text-4xl font-display uppercase tracking-wider text-[#FFD700] mb-12">
          Admin
        </h1>
        <nav className="space-y-4">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full text-left flex items-center gap-3 p-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
              activeView === 'dashboard' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#FF6B6B] hover:text-white'
            }`}
          >
            <DashboardIcon className="w-6 h-6"/>
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('products')}
            className={`w-full text-left flex items-center gap-3 p-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
              activeView === 'products' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#00C2FF] hover:text-black'
            }`}
          >
            <PackageIcon className="w-6 h-6"/>
            Products
          </button>
          <button
            onClick={() => setActiveView('messages')}
            className={`w-full text-left flex items-center gap-3 p-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
              activeView === 'messages' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#FF00A8] hover:text-white'
            }`}
          >
            <MailIcon className="w-6 h-6"/>
            Messages
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`w-full text-left flex items-center gap-3 p-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
              activeView === 'analytics' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#00C2FF] hover:text-black'
            }`}
          >
            <AnalyticsIcon className="w-6 h-6"/>
            Analytics
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`w-full text-left flex items-center gap-3 p-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
              activeView === 'settings' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#782cf6] hover:text-black'
            }`}
          >
            <CogIcon className="w-6 h-6"/>
            Settings
          </button>
        </nav>
        <button
            onClick={() => navigate('home')}
            className="mt-auto bg-white text-black font-bold py-3 px-6 border-4 border-black transition-colors hover:bg-gray-300 btn-pop"
        >
            Return to Store
        </button>
      </aside>

      {/* Mobile Header with Burger Menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-black text-white border-b-4 border-white">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-display uppercase tracking-wider text-[#FFD700]">
            Admin
          </h1>
          <button
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center border-4 border-white bg-black hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Mobile Burger Menu */}
      {isMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div 
            className="lg:hidden fixed inset-y-0 left-0 w-80 max-w-[min(320px,calc(100vw-2rem))] bg-white border-r-4 border-black z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <h2 className="text-3xl font-display uppercase text-black">Admin Menu</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-gray-200 transition-colors"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-7 h-7" />
                </button>
              </div>
              <nav className="space-y-2">
                <button
                  onClick={() => {
                    setActiveView('dashboard');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 p-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                    activeView === 'dashboard' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#FF6B6B] hover:text-white'
                  }`}
                >
                  <DashboardIcon className="w-6 h-6"/>
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    setActiveView('products');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 p-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                    activeView === 'products' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#00C2FF] hover:text-black'
                  }`}
                >
                  <PackageIcon className="w-6 h-6"/>
                  Products
                </button>
                <button
                  onClick={() => {
                    setActiveView('messages');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 p-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                    activeView === 'messages' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#FF00A8] hover:text-white'
                  }`}
                >
                  <MailIcon className="w-6 h-6"/>
                  Messages
                </button>
                <button
                  onClick={() => {
                    setActiveView('analytics');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 p-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                    activeView === 'analytics' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#00C2FF] hover:text-black'
                  }`}
                >
                  <AnalyticsIcon className="w-6 h-6"/>
                  Analytics
                </button>
                <button
                  onClick={() => {
                    setActiveView('settings');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center gap-3 p-4 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
                    activeView === 'settings' ? 'bg-[#FFD700] text-black' : 'bg-white text-black hover:bg-[#7CFF00] hover:text-black'
                  }`}
                >
                  <CogIcon className="w-6 h-6"/>
                  Settings
                </button>
                <button
                  onClick={() => {
                    navigate('home');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-3 p-4 font-bold text-lg border-4 border-black bg-white text-black hover:bg-gray-200 transition-colors mt-8"
                >
                  Return to Store
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto lg:ml-72 mt-16 lg:mt-0">
        <ErrorBoundary>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;
