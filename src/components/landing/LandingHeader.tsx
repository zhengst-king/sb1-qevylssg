// src/components/landing/LandingHeader.tsx
import React, { useState, useEffect } from 'react';
import { Film, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LandingHeaderProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingHeader({ onShowAuth }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Add background when scrolled
      setIsScrolled(currentScrollY > 50);

      // Hide/show header based on scroll direction
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Film className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tagflix
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/features"
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                Features
              </Link>
              <Link
                to="/how-it-works"
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                How It Works
              </Link>
              <Link
                to="/testimonials"
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                Testimonials
              </Link>
              <Link
                to="/pricing"
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                Pricing
              </Link>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => onShowAuth('signin')}
                className="px-4 py-2 text-slate-700 font-semibold hover:text-blue-600 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onShowAuth('signup')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Menu Slide-in */}
          <div className="fixed top-16 right-0 bottom-0 w-64 bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <nav className="flex flex-col p-6 space-y-4">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
              >
                Home
              </Link>
              <Link
                to="/features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
              >
                Features
              </Link>
              <Link
                to="/how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
              >
                How It Works
              </Link>
              <Link
                to="/testimonials"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
              >
                Testimonials
              </Link>
              <Link
                to="/pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors py-2"
              >
                Pricing
              </Link>

              {/* Mobile Auth Buttons */}
              <div className="pt-6 space-y-3 border-t border-slate-200">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onShowAuth('signin');
                  }}
                  className="w-full px-4 py-3 text-slate-700 font-semibold border-2 border-slate-300 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-all text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onShowAuth('signup');
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md text-center"
                >
                  Get Started
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}