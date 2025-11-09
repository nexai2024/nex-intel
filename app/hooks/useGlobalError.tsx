'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ErrorContextType {
  error: Error | null;
  showError: (error: Error | string) => void;
  clearError: () => void;
  withErrorHandling: <T>(promise: Promise<T>) => Promise<T | null>;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<Error | null>(null);

  const showError = useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(async <T,>(promise: Promise<T>): Promise<T | null> => {
    try {
      return await promise;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      showError(error);
      return null;
    }
  }, [showError]);

  return (
    <ErrorContext.Provider value={{ error, showError, clearError, withErrorHandling }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}