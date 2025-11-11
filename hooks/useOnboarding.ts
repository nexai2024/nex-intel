'use client';
import { useState, useEffect } from 'react';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('CompeteIQ-onboarding-completed') === 'true';

    // Fetch current user
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data);

        // Show onboarding if user exists and hasn't completed it
        if (data && !hasCompletedOnboarding) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        // User not authenticated, don't show onboarding
        setShowOnboarding(false);
      });
  }, []);

  const closeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('CompeteIQ-onboarding-completed', 'true');
  };

  return {
    showOnboarding,
    closeOnboarding,
    user
  };
}