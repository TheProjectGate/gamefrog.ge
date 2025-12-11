import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FilterConfig } from '../types';
import { TwitterIcon, FacebookIcon, InstagramIcon, YouTubeIcon, ArrowUpIcon } from './Icons';

interface FooterProps {
  onNavigate: (view: 'home' | 'browse' | 'cart' | 'wishlist') => void;
  platformConfig: FilterConfig;
  onPlatformClick: (platform: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, platformConfig, onPlatformClick }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 200) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <>
      <footer className="bg-black text-white/80 border-t-8 border-[#FFD700]">
        <div className="container mx-auto max-w-[1472px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-display uppercase text-white tracking-wider">{t('header.title')}</h3>
              <p className="mt-2 max-w-sm">{t('footer.description')}</p>
              <div className="flex gap-4 mt-6">
                <a href="#" aria-label="Twitter" className="text-white/80 hover:text-white transition-colors"><TwitterIcon className="w-6 h-6"/></a>
                <a href="#" aria-label="Facebook" className="text-white/80 hover:text-white transition-colors"><FacebookIcon className="w-6 h-6"/></a>
                <a href="#" aria-label="Instagram" className="text-white/80 hover:text-white transition-colors"><InstagramIcon className="w-6 h-6"/></a>
                <a href="#" aria-label="YouTube" className="text-white/80 hover:text-white transition-colors"><YouTubeIcon className="w-6 h-6"/></a>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg uppercase text-white tracking-wider">{t('footer.navigate')}</h4>
              <ul className="mt-4 space-y-2">
                <li><button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">{t('footer.home')}</button></li>
                <li><button onClick={() => onNavigate('browse')} className="hover:text-white transition-colors">{t('footer.browse')}</button></li>
                <li><button onClick={() => onNavigate('cart')} className="hover:text-white transition-colors">{t('footer.cart')}</button></li>
                <li><button onClick={() => onNavigate('wishlist')} className="hover:text-white transition-colors">{t('footer.wishlist')}</button></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg uppercase text-white tracking-wider">{t('footer.platforms')}</h4>
              <ul className="mt-4 space-y-2">
                {platformConfig && typeof platformConfig === 'object' ? Object.keys(platformConfig).map(platform => (
                    <li key={platform}><button onClick={() => onPlatformClick(platform)} className="hover:text-white transition-colors">{platform}</button></li>
                )) : null}
              </ul>
            </div>
          </div>
          <div className="text-center mt-12 border-t border-white/20 pt-6">
            <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          </div>
        </div>
      </footer>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#FFD700] text-black border-4 border-black flex items-center justify-center btn-pop"
          aria-label={t('footer.goToTop')}
        >
          <ArrowUpIcon className="w-8 h-8"/>
        </button>
      )}
    </>
  );
};

export default Footer;
