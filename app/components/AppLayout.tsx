'use client';
import Link from 'next/link';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import CreditWidget from '@/app/components/CreditWidget';
import { AuthButton } from '@/app/components/AuthButton';
import { OnboardingModal } from '@/app/components/OnboardingModal';
import { useOnboarding } from '@/hooks/useOnboarding';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { showOnboarding, closeOnboarding, user } = useOnboarding();

  return (
    <>
      <div className="min-h-screen grid grid-cols-[260px_1fr]">
        <aside className="hidden md:block border-r border-black/10 bg-white">
          <div className="p-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600" />
              <div className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>IntelBox</div>
            </Link>
          </div>
          <nav className="px-3 space-y-1">
            <NavItem href="/dashboard">Dashboard</NavItem>
            <NavItem href="/projects">Projects</NavItem>
            <NavItem href="/runs">Runs</NavItem>
            <NavItem href="/reports">Reports</NavItem>
            <NavItem href="/jobs">Jobs</NavItem>
            <NavItem href="/settings">Settings</NavItem>
          </nav>
          <div className="absolute bottom-4 left-4 right-4">
            <CreditWidget />
          </div>
        </aside>
        <div className="flex flex-col">
          <Topbar />
          <main className="p-6">{children}</main>
        </div>
      </div>

      <OnboardingModal
        isOpen={showOnboarding}
        onClose={closeOnboarding}
        userFirstName={user?.name?.split(' ')[0]}
      />
    </>
  );
}

function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-3 py-2 rounded-lg hover:bg-black/5">
      {children}
    </Link>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur header-gradient border-b border-black/10">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="text-sm text-gray-600">Evidence-first competitive intel</div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a className="btn btn-ghost" href="/projects/new">New Project</a>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}