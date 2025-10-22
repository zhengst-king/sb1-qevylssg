// src/components/LandingPage.tsx
import React, { useState } from 'react';
import { LandingHeader } from './landing/LandingHeader';
import { LandingFooter } from './landing/LandingFooter';
import { HeroSection } from './landing/HeroSection';
import { StatsBar } from './landing/StatsBar';
import { AuthModal } from './AuthModal';

export function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  const handleShowAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader onShowAuth={handleShowAuth} />
      
      <main className="pt-16">
        {/* Hero Section */}
        <HeroSection onShowAuth={handleShowAuth} />
        
        {/* Stats Bar */}
        <StatsBar />

        {/* Additional sections will be added in later phases */}
      </main>

      <LandingFooter />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authMode}
      />
    </div>
  );
}