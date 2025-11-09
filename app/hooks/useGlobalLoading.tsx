'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  loadingText?: string;
  setLoading: (loading: boolean, text?: string) => void;
  withLoading: <T>(promise: Promise<T>, text?: string) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>();

  const setLoading = (loading: boolean, text?: string) => {
    setIsLoading(loading);
    setLoadingText(text);
  };

  const withLoading = async <T,>(promise: Promise<T>, text?: string): Promise<T> => {
    setLoading(true, text);
    try {
      const result = await promise;
      return result;
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingText, setLoading, withLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}