import React from 'react';
import { CheckIcon } from './Icons';

interface ToastProps {
  message: string;
}

const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div 
      role="status"
      aria-live="polite"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black text-white py-3 px-6 border-4 border-[#FFD700] animate-toast"
    >
      <CheckIcon className="w-6 h-6 text-[#FFD700]" />
      <span className="font-bold text-lg">{message}</span>
    </div>
  );
};

export default Toast;
