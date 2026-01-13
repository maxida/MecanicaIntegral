import React, { createContext, useContext, useState } from 'react';
import LoadingOverlay from './LoadingOverlay';

type ContextType = { show: (msg?: string) => void; hide: () => void };
const ctx = createContext<ContextType | null>(null);

export const GlobalLoadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const show = (msg?: string) => { setMessage(msg); setCount(c => c + 1); };
  const hide = () => { setCount(c => Math.max(0, c - 1)); if (count <= 1) setMessage(undefined); };

  return (
    <ctx.Provider value={{ show, hide }}>
      {children}
      {count > 0 && <LoadingOverlay message={message} />}
    </ctx.Provider>
  );
};

export const useGlobalLoading = () => {
  const c = useContext(ctx);
  if (!c) throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  return c;
};

export default GlobalLoadingProvider;
