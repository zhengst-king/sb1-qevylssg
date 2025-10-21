// src/components/landing/LandingFooter.tsx
import React from 'react';
import { Film, Twitter, Instagram, Facebook, Mail } from 'lucide-react';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openLegalPage = (page: 'privacy' | 'terms' | 'eula') => {
    // This will be updated to proper routing in Phase 6
    window.location.href = `/${page}`;
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Film className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-white">Tagflix</span>
            </div>
            <p className="text-sm text-slate-400">
              The smart way to track and organize your movie and TV show watchlist.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-blue-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-pink-400 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-blue-500 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="mailto:support@tagflix.com"
                className="text-slate-400 hover:text-green-400 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Pricing
                </button>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  About Us
                </button>
              </li>
              <li>
                <a
                  href="#blog"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="#careers"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Careers
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Download Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal & Apps</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => openLegalPage('privacy')}
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => openLegalPage('terms')}
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => openLegalPage('eula')}
                  className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  EULA
                </button>
              </li>
              <li className="pt-2">
                <p className="text-xs text-slate-500 mb-2">Coming Soon:</p>
                <a
                  href="#ios"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  iOS App
                </a>
              </li>
              <li>
                <a
                  href="#android"
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Android App
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-slate-500">
              © {currentYear} Tagflix. All rights reserved.
            </p>
            <p className="text-sm text-slate-500">
              Made with <span className="text-red-500">❤️</span> for movie lovers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}