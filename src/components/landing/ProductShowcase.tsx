import React from 'react';
import TouchCarousel from './TouchCarousel';
import LazyImage from './LazyImage';
import { Smartphone, Tv, Film, TrendingUp, Search, BarChart3 } from 'lucide-react';

export default function ProductShowcase() {
  const features = [
    {
      icon: Smartphone,
      title: 'Mobile-First Design',
      description: 'Seamlessly access your watchlist on any device with our responsive interface',
      image: '/images/mobile-showcase.jpg',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Film,
      title: 'Smart Collections',
      description: 'Organize movies and TV shows with custom collections and tags',
      image: '/images/collections-showcase.jpg',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: TrendingUp,
      title: 'Personalized Recommendations',
      description: 'Get AI-powered suggestions based on your viewing history and preferences',
      image: '/images/recommendations-showcase.jpg',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Search,
      title: 'Advanced Search',
      description: 'Find exactly what you want with powerful filters and search options',
      image: '/images/search-showcase.jpg',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: BarChart3,
      title: 'Viewing Analytics',
      description: 'Track your watching habits with detailed statistics and insights',
      image: '/images/analytics-showcase.jpg',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: Tv,
      title: 'Streaming Integration',
      description: 'See which streaming services have your movies and TV shows',
      image: '/images/streaming-showcase.jpg',
      color: 'from-red-500 to-pink-500',
    },
  ];

  const slides = features.map((feature, index) => (
    <div key={index} className="w-full">
      {/* Desktop Layout - Side by Side */}
      <div className="hidden md:flex items-center gap-8 lg:gap-12 p-6 lg:p-12">
        {/* Content - Left Side */}
        <div className="flex-1 space-y-6">
          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.color}`}>
            <feature.icon className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-3xl lg:text-4xl font-bold text-slate-900">
            {feature.title}
          </h3>
          <p className="text-lg text-slate-600 leading-relaxed">
            {feature.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl">
              Try It Now
            </button>
            <button className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all">
              Learn More
            </button>
          </div>
        </div>

        {/* Image - Right Side */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-3xl" />
            <LazyImage
              src={feature.image}
              alt={feature.title}
              className="relative w-full h-auto rounded-2xl shadow-2xl"
              width={600}
              height={400}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout - Stacked */}
      <div className="md:hidden p-6 space-y-6">
        {/* Icon and Title */}
        <div className="space-y-4">
          <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color}`}>
            <feature.icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {feature.title}
          </h3>
        </div>

        {/* Image */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl blur-2xl" />
          <LazyImage
            src={feature.image}
            alt={feature.title}
            className="relative w-full h-auto rounded-xl shadow-xl"
            width={400}
            height={267}
          />
        </div>

        {/* Description */}
        <p className="text-base text-slate-600 leading-relaxed">
          {feature.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3">
          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg active:scale-95">
            Try It Now
          </button>
          <button className="w-full px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all active:scale-95">
            Learn More
          </button>
        </div>
      </div>
    </div>
  ));

  return (
    <section className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900">
            Everything You Need
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Powerful features designed to make managing your watchlist effortless and enjoyable
          </p>
        </div>

        {/* Carousel */}
        <TouchCarousel
          items={slides}
          autoPlay={true}
          autoPlayInterval={6000}
          showControls={true}
          showIndicators={true}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
        />

        {/* Feature Grid - Alternative to Carousel for Desktop */}
        <div className="mt-16 hidden lg:grid grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow group cursor-pointer"
            >
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">
                {feature.title}
              </h4>
              <p className="text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}