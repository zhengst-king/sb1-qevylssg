// src/components/LandingPage.tsx
import React, { useState } from 'react';
import { LandingHeader } from './landing/LandingHeader';
import { LandingFooter } from './landing/LandingFooter';
import { HeroSection } from './landing/HeroSection';
import { StatsBar } from './landing/StatsBar';
import { FeaturesSection } from './landing/FeaturesSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { FinalCTASection } from './landing/FinalCTASection';
import { AuthModal } from './AuthModal';
import { Link } from 'react-router-dom';

interface LandingPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingPage({ onShowAuth }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader 
        onLoginClick={() => onShowAuth('signin')}
        onSignUpClick={() => onShowAuth('signup')}
      />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section id="hero">
          <HeroSection onShowAuth={onShowAuth} />
        </section>
        
        {/* Stats Bar */}
        <StatsBar />
        
        {/* Features Section */}
        <section id="features" className="py-20">
          <FeaturesSection />
        </section>
        
        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <HowItWorksSection />
        </section>
        
        {/* Pricing Section - Coming Soon */}
        {/* <section id="pricing" className="py-20">
          <PricingSection />
        </section> */}
        
        {/* Testimonials Section - Coming Soon */}
        {/* <section id="testimonials" className="py-20">
          <TestimonialsSection />
        </section> */}
        
        {/* Final CTA Section */}
        <FinalCTASection onShowAuth={onShowAuth} />
      </main>
      
      <LandingFooter />
    </div>
  );
}