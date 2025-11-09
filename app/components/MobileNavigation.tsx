'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const router = useRouter();

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Navigation panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600" />
              <div className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                IntelBox
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/dashboard"
              onClick={() => handleNavigation('/dashboard')}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/projects"
              onClick={() => handleNavigation('/projects')}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              📁 Projects
            </Link>
            <Link
              href="/runs"
              onClick={() => handleNavigation('/runs')}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              🔄 Runs
            </Link>
            <Link
              href="/reports"
              onClick={() => handleNavigation('/reports')}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              📄 Reports
            </Link>
            <Link
              href="/jobs"
              onClick={() => handleNavigation('/jobs')}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              ⚙️ Jobs
            </Link>
            <Link
              href="/settings"
              onClick={() => handleNavigation('/settings')}
              className="block px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              ⚙️ Settings
            </Link>
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              <Link
                href="/projects/new"
                onClick={() => handleNavigation('/projects/new')}
                className="block w-full btn btn-primary text-center"
              >
                New Project
              </Link>
              <Link
                href="/demo"
                onClick={() => handleNavigation('/demo')}
                className="block w-full btn btn-ghost text-center"
              >
                View Demo
              </Link>
            </div>
          </div>

          {/* Credit Widget (Mobile) */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Credits this month</div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-600 rounded-full" style={{ width: '42%' }}></div>
            </div>
            <div className="mt-1 text-xs text-gray-600 flex justify-between">
              <span>420</span>
              <span>1000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileNavigationButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
      aria-label="Open navigation menu"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}