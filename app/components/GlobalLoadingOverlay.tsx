'use client';

import { useLoading } from '@/app/hooks/useGlobalLoading';

export function GlobalLoadingOverlay() {
  const { isLoading, loadingText } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="text-sm font-medium text-gray-900">
          {loadingText || 'Loading...'}
        </span>
      </div>
    </div>
  );
}