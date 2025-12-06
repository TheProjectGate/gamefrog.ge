import React, { createContext, useContext, useMemo } from 'react';
import { platform, PlatformTarget, platformTokens, isAndroidPlatform } from '../platform';

interface PlatformContextValue {
  platform: PlatformTarget;
  isAndroid: boolean;
  tokens: typeof platformTokens;
}

const PlatformContext = createContext<PlatformContextValue>({
  platform,
  isAndroid: isAndroidPlatform,
  tokens: platformTokens
});

export const PlatformProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const value = useMemo(
    () => ({
      platform,
      isAndroid: isAndroidPlatform,
      tokens: platformTokens
    }),
    []
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export const usePlatform = () => useContext(PlatformContext);

