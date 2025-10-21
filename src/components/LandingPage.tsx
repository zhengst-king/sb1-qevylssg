// src/components/LandingPage.tsx
import React, { useState } from 'react';
import { LandingHeader } from './landing/LandingHeader';
import { LandingFooter } from './landing/LandingFooter';
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
      
      {/* Main Content - Will be populated in later phases */}
      <main className="pt-16">
        {/* Hero Section - Phase 2 */}
        <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="text-center px-4">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Coming Soon
            </h1>
            <p className="text-xl text-slate-600 mb-8">
              Your Movies & TV Shows, Organized Beautifully
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleShowAuth('signup')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Start Free
              </button>
              <button
                onClick={() => handleShowAuth('signin')}
                className="px-8 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

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