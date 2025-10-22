// src/components/landing/LandingHeader.tsx
import React, { useState, useEffect } from 'react';
import { Film, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LandingHeaderProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingHeader({ onShowAuth }: LandingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Film className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tagflix
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/features"
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
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-slate-700 hover:text-blue-600 font-medium transition-colors"
            >
              Pricing
            </button>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => onShowAuth('signin')}
              className="px-4 py-2 text-slate-700 hover:text-blue-600 font-medium transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => onShowAuth('signup')}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              Sign Up
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-700 hover:text-blue-600"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-6 space-y-4">
            <Link
              to="/features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
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
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/testimonials"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
            >
              Testimonials
            </Link>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg font-medium transition-colors"
            >
              Pricing
            </button>
            
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <button
                onClick={() => onShowAuth('signin')}
                className="block w-full px-4 py-2 text-slate-700 font-medium border-2 border-slate-300 rounded-lg hover:border-slate-400 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => onShowAuth('signup')}
                className="block w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}