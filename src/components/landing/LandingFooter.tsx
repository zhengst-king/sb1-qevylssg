// src/components/landing/LandingFooter.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Mail, MapPin, Phone, Facebook, Twitter, Instagram, Youtube, Github } from 'lucide-react';

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Film className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-bold text-white">Tagflix</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              The smart way to track and organize your movie and TV show watchlist. 
              Never miss a great show again.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href="mailto:support@tagflix.com" className="hover:text-white transition-colors">
                  support@tagflix.com
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href="tel:+1234567890" className="hover:text-white transition-colors">
                  +1 (234) 567-890
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">
                  San Francisco, CA
                </span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-white transition-colors text-left w-full"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('pricing')}
                  className="hover:text-white transition-colors text-left w-full"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="hover:text-white transition-colors text-left w-full"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('testimonials')}
                  className="hover:text-white transition-colors text-left w-full"
                >
                  Testimonials
                </button>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#roadmap" className="hover:text-white transition-colors">
                  Roadmap
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => scrollToSection('about')}
                  className="hover:text-white transition-colors text-left w-full"
                >
                  About Us
                </button>
              </li>
              <li>
                <a href="#blog" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#careers" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#press" className="hover:text-white transition-colors">
                  Press Kit
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#partners" className="hover:text-white transition-colors">
                  Partners
                </a>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support & Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#help" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#support" className="hover:text-white transition-colors">
                  Customer Support
                </a>
              </li>
              <li>
                <a href="#status" className="hover:text-white transition-colors">
                  System Status
                </a>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors font-semibold">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors font-semibold">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/eula" className="hover:text-white transition-colors font-semibold">
                  EULA
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Newsletter */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            {/* Newsletter Signup */}
            <div className="w-full md:w-auto">
              <h4 className="text-white font-semibold mb-3 text-center md:text-left">
                Stay Updated
              </h4>
              <div className="flex space-x-2 max-w-md">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                  Subscribe
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center md:text-left">
                Get updates on new features and releases
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400 mr-2">Follow Us:</span>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-blue-600 rounded-lg transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-blue-400 rounded-lg transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-pink-600 rounded-lg transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-600 rounded-lg transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <p className="text-sm text-slate-500 text-center md:text-left">
              © {currentYear} Tagflix. All rights reserved.
            </p>

            {/* Legal Links - Mobile Friendly */}
            <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 text-sm">
              <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <span className="text-slate-700">•</span>
              <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">
                Terms
              </Link>
              <span className="text-slate-700">•</span>
              <Link to="/eula" className="text-slate-400 hover:text-white transition-colors">
                EULA
              </Link>
              <span className="text-slate-700">•</span>
              <a href="#cookies" className="text-slate-400 hover:text-white transition-colors">
                Cookie Policy
              </a>
              <span className="text-slate-700">•</span>
              <a href="#accessibility" className="text-slate-400 hover:text-white transition-colors">
                Accessibility
              </a>
            </div>
          </div>

          {/* Additional Legal Notice */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              Movie and TV show information is provided by{' '}
              <a 
                href="https://www.themoviedb.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                The Movie Database (TMDB)
              </a>
              {' '}and other third-party sources. All content is subject to their respective terms and conditions.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}