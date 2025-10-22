// src/components/LandingPage.tsx
import React, { useState } from 'react';
import { LandingHeader } from './landing/LandingHeader';
import { LandingFooter } from './landing/LandingFooter';
import { HeroSection } from './landing/HeroSection';
import { StatsBar } from './landing/StatsBar';
import { FeaturesSection } from './landing/FeaturesSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { AuthModal } from './AuthModal';
import { Link } from 'react-router-dom';

interface LandingPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingPage({ onShowAuth }: LandingPageProps) {

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader onShowAuth={onShowAuth} />
      
      <main className="pt-16">
        {/* Hero Section */}
        <HeroSection onShowAuth={onShowAuth} />
        
        {/* Stats Bar */}
        <StatsBar />

        {/* Features Section */}
        <FeaturesSection />

        {/* How It Works Section */}
        <HowItWorksSection />

        {/* Additional sections will be added in later phases */}
      </main>

      <LandingFooter />
    </div>
  );
}