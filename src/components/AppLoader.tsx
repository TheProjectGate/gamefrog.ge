import React from 'react';

const AppLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-dots flex flex-col justify-center items-center z-50">
      <h1 className="text-6xl font-display text-black mb-8 uppercase animate-pulse">
        Pixel Palace
      </h1>
      <div className="flex items-center gap-4">
        <div className="w-6 h-6 bg-black animate-loader-dot"></div>
        <div className="w-6 h-6 bg-black animate-loader-dot"></div>
        <div className="w-6 h-6 bg-black animate-loader-dot"></div>
      </div>
    </div>
  );
};

export default AppLoader;
