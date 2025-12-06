import React from 'react';
import { CloseIcon } from './Icons';

interface BurgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BurgerMenu: React.FC<BurgerMenuProps> = ({ isOpen, onClose, children, maxWidth = 'full' }) => {
  const widthClass = maxWidth === 'container' 
    ? 'w-80 max-w-[min(320px,calc(100vw-2rem))]' 
    : 'w-80 max-w-[calc(100vw-2rem)]';
  
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
          onClick={onClose}
        />
      )}
      <div 
        className={`fixed inset-y-0 left-0 ${widthClass} burger-menu-pop-art-light border-r-4 border-black z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
            <h2 className="text-2xl font-display uppercase text-black">Menu</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 transition-colors"
              aria-label="Close menu"
            >
              <CloseIcon className="w-7 h-7" />
            </button>
          </div>
          <nav className="space-y-2">
            {children}
          </nav>
        </div>
      </div>
    </>
  );
};

export default BurgerMenu;

