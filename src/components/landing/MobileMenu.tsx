import React, { useEffect } from 'react';
import { X, Home, Zap, DollarSign, Users, FileText, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export default function MobileMenu({ isOpen, onClose, onLoginClick, onSignUpClick }: MobileMenuProps) {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const menuItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Features', href: '/features', icon: Zap },
    { label: 'Pricing', href: '/pricing', icon: DollarSign },
    { label: 'About', href: '/about', icon: Users },
    { label: 'FAQ', href: '/faq', icon: FileText },
  ];

  const legalItems = [
    { label: 'EULA', href: '/eula', icon: Shield },
    { label: 'Privacy Policy', href: '/privacy', icon: Shield },
  ];

  const handleAuthClick = (callback: () => void) => {
    onClose();
    setTimeout(callback, 300); // Delay to allow slide-out animation
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="h-6 w-6 text-slate-600" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex flex-col h-[calc(100%-80px)] overflow-y-auto">
          {/* Main Navigation */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.label}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-slate-100 transition-colors group"
                    >
                      <Icon className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      <span className="text-slate-700 group-hover:text-slate-900 font-medium">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Legal Links */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 mb-2">
                Legal
              </h3>
              <ul className="space-y-2">
                {legalItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label}>
                      <Link
                        to={item.href}
                        onClick={onClose}
                        className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm group"
                      >
                        <Icon className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        <span className="text-slate-600 group-hover:text-slate-900">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* CTA Buttons - Fixed at Bottom */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
            <button
              onClick={() => handleAuthClick(onLoginClick)}
              className="w-full px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-all active:scale-95"
            >
              Log In
            </button>
            <button
              onClick={() => handleAuthClick(onSignUpClick)}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg active:scale-95"
            >
              Sign Up Free
            </button>
          </div>
        </div>
      </div>
    </>
  );
}