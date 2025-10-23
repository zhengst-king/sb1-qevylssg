// src/components/landing/FeaturesSection.tsx
import React from 'react';
import { 
  Sparkles, 
  Folder, 
  CheckCircle, 
  Film, 
  TrendingUp, 
  Zap,
  Search,
  Tv
} from 'lucide-react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const features: Feature[] = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Smart Recommendations",
    description: "Get personalized suggestions based on your collection, viewing habits, and preferences. Our AI learns what you love.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Folder className="w-6 h-6" />,
    title: "Custom Collections",
    description: "Create custom collections, playlists, and categories. Organize by franchises, genres, or any way you like.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: <CheckCircle className="w-6 h-6" />,
    title: "Track Your Watchlist",
    description: "Mark titles as To Watch, Watching, or Watched. Add personal ratings, reviews, and watch dates to track your journey.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: <Film className="w-6 h-6" />,
    title: "Rich Metadata",
    description: "Automatic fetching of cast, crew, ratings, and technical specs. Everything you need to know about each title.",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Analytics & Insights",
    description: "Visualize your collection with genre breakdowns, viewing trends, and completion rates. Understand your habits.",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Cross-Platform Sync",
    description: "Access your watchlist from any device. Seamless sync across web and mobile keeps everything up to date.",
    color: "from-yellow-500 to-orange-500"
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "Powerful Search",
    description: "Find anything instantly with advanced filters by genre, year, rating, cast, director, and more.",
    color: "from-teal-500 to-cyan-500"
  },
  {
    icon: <Tv className="w-6 h-6" />,
    title: "Streaming Integration",
    description: "See which streaming services have your movies and TV shows. Never wonder where to watch again.",
    color: "from-rose-500 to-pink-500"
  }
];

export function FeaturesSection() {
  // Add intersection observer for scroll animations
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });

  return (
    <section 
      id="features" 
      ref={ref}
      className={`py-20 bg-white transition-all duration-700 ${isVisible ? 'fade-up' : 'opacity-0'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Everything You Need to Manage Your Watchlist
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Powerful features designed for movie and TV enthusiasts who want complete control over their entertainment.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card-hover group relative bg-white rounded-xl p-6 border border-slate-200 hover:border-transparent hover:shadow-xl transition-all duration-300"
            >
              {/* Gradient border effect on hover */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur`}></div>
              
              {/* Icon with bounce animation */}
              <div className={`icon-bounce w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-slate-600 mb-6">
            Ready to get started?
          </p>
          <a
            href="#hero"
            className="btn-hover-lift inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Start Free Today
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}