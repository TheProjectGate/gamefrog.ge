import React, { useEffect, useState } from 'react';

interface ChatBubbleProps {
  text: string;
  onClose: () => void;
  duration?: number;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ text, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Анимация появления
    setIsVisible(true);
  }, [text]);

  return (
    <div
      className={`absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-white text-black text-xs sm:text-sm font-bold border-2 border-[#FFD700] shadow-[4px_4px_0_0_#FFD700] z-50 transition-all duration-300 rounded-full flex items-center justify-center ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-x-2 pointer-events-none'
      }`}
      style={{
        animation: isVisible ? 'bubblePop 0.3s ease-out' : 'none',
        width: '180px',
        height: '180px',
      }}
    >
      <div className="relative px-3 text-center">
        {text}
        {/* Стрелка вправо (указывает на аватар) */}
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent border-l-[#FFD700]"></div>
      </div>
      <style>{`
        @keyframes bubblePop {
          0% {
            transform: translate(-10px, -50%) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translate(2px, -50%) scale(1.05);
          }
          100% {
            transform: translate(0, -50%) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatBubble;
