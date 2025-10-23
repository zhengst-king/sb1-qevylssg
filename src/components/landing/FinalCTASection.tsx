// src/components/landing/FinalCTASection.tsx
import React from 'react';
import { ArrowRight, Sparkles, Film, TrendingUp } from 'lucide-react';

interface FinalCTASectionProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function FinalCTASection({ onShowAuth }: FinalCTASectionProps) {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Icon Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6 animate-bounce">
          <Sparkles className="h-8 w-8 text-white" />
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Ready to Transform Your
          <br />
          <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            Watching Experience?
          </span>
        </h2>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
          Join thousands of movie and TV enthusiasts who never miss a must-watch title again.
        </p>

        {/* Stats Bar */}
        <div className="flex flex-wrap justify-center gap-8 mb-10">
          <div className="flex items-center space-x-2 text-white">
            <Film className="h-5 w-5 text-blue-200" />
            <div className="text-left">
              <div className="text-2xl font-bold">10,000+</div>
              <div className="text-sm text-blue-200">Active Users</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <TrendingUp className="h-5 w-5 text-blue-200" />
            <div className="text-left">
              <div className="text-2xl font-bold">1M+</div>
              <div className="text-sm text-blue-200">Titles Tracked</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <Sparkles className="h-5 w-5 text-blue-200" />
            <div className="text-left">
              <div className="text-2xl font-bold">4.9/5</div>
              <div className="text-sm text-blue-200">User Rating</div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
          <button
            onClick={() => onShowAuth('signup')}
            className="group px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
          >
            <span className="text-lg">Start Free Today</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => onShowAuth('signin')}
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold rounded-xl border-2 border-white/30 hover:bg-white/20 transition-all duration-300"
          >
            <span className="text-lg">Sign In</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-blue-100">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Free Forever Plan</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>No Credit Card Required</span>
          </div>
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Cancel Anytime</span>
          </div>
        </div>
      </div>

      {/* Bottom Wave Decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg 
          viewBox="0 0 1440 120" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path 
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" 
            fill="rgb(248 250 252)"
          />
        </svg>
      </div>
    </section>
  );
}