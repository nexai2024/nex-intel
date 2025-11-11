'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import CreditWidget from '@/app/components/CreditWidget';
import { AuthButton } from '@/app/components/AuthButton';
import { OnboardingModal } from '@/app/components/OnboardingModal';
import { MobileNavigation, MobileNavigationButton } from '@/app/components/MobileNavigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { LoadingProvider } from '@/app/hooks/useGlobalLoading';
import { GlobalLoadingOverlay } from '@/app/components/GlobalLoadingOverlay';
import { ErrorProvider } from '@/app/hooks/useGlobalError';
import { ErrorNotification } from '@/app/components/ErrorNotification';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { showOnboarding, closeOnboarding, user } = useOnboarding();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ErrorProvider>
      <ErrorBoundary>
        <LoadingProvider>
          <>
            <div className="min-h-screen grid grid-cols-[260px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block border-r border-black/10 bg-white">
          <div className="p-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600" />
              <div className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>CompeteIQ</div>
            </Link>
          </div>
          <nav className="px-3 space-y-1">
            <NavItem href="/dashboard">Dashboard</NavItem>
            <NavItem href="/projects">Projects</NavItem>
            <NavItem href="/teams">Teams</NavItem>
            <NavItem href="/runs">Runs</NavItem>
            <NavItem href="/reports">Reports</NavItem>
            <NavItem href="/ai-insights">AI Insights</NavItem>
            <NavItem href="/jobs">Jobs</NavItem>
            <NavItem href="/settings">Settings</NavItem>
          </nav>
          <div className="absolute bottom-4 left-4 right-4">
            <CreditWidget />
          </div>
        </aside>
        <div className="flex flex-col">
          <Topbar>
            <MobileNavigationButton onClick={() => setIsMobileMenuOpen(true)} />
          </Topbar>
          <main className="p-6">{children}</main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={closeOnboarding}
        userFirstName={user?.name?.split(' ')[0]}
      />

      {/* Global Loading Overlay */}
          <GlobalLoadingOverlay />

          {/* Error Notification */}
          <ErrorNotification />
          </>
        </LoadingProvider>
      </ErrorBoundary>
    </ErrorProvider>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-3 py-2 rounded-lg hover:bg-black/5">
      {children}
    </Link>
  );
}

function Topbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur header-gradient border-b border-black/10">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {children}
          <div className="text-sm text-gray-600">Evidence-first competitive intel</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a className="btn btn-ghost hidden sm:block" href="/projects/new">New Project</a>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}