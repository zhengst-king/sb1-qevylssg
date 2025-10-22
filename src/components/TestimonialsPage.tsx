import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { LandingHeader } from './landing/LandingHeader';
import { LandingFooter } from './landing/LandingFooter';
import { Link } from 'react-router-dom';

interface TestimonialsPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  avatar?: string;
  rating: number;
  verified?: boolean;
}

function TestimonialCard({ quote, name, role, avatar, rating, verified = false }: Testimonial) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 h-full flex flex-col">
      <div className="mb-4">
        <Quote className="h-8 w-8 text-blue-600 opacity-50" />
      </div>

      <div className="flex items-center mb-4">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`h-5 w-5 ${
              index < rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>

      <blockquote className="text-gray-700 text-lg leading-relaxed mb-6 flex-grow">
        "{quote}"
      </blockquote>

      <div className="flex items-center">
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="ml-4">
          <div className="flex items-center">
            <p className="font-semibold text-gray-900">{name}</p>
            {verified && (
              <svg
                className="ml-1 h-4 w-4 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          {role && (
            <p className="text-sm text-gray-500">{role}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsPage({ onShowAuth }: TestimonialsPageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const testimonials: Testimonial[] = [
    {
      quote: "This app completely changed how I manage my movie collection. I never miss a great film anymore, and the recommendations are spot-on! It's like having a personal movie curator.",
      name: "Sarah Mitchell",
      role: "Film Enthusiast",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      rating: 5,
      verified: true
    },
    {
      quote: "As someone who watches 100+ movies a year, keeping track was a nightmare. This watchlist app is a game-changer - intuitive, beautiful, and powerful. Best investment I've made!",
      name: "Marcus Chen",
      role: "Movie Blogger",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      rating: 5,
      verified: true
    },
    {
      quote: "The smart recommendations helped me discover hidden gems I would have never found. Plus, the interface is gorgeous and so easy to use! My friends keep asking me what I'm using.",
      name: "Emily Rodriguez",
      role: "Casual Viewer",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      rating: 5,
      verified: false
    },
    {
      quote: "I've tried many watchlist apps, but this one stands out. The tracking features and custom lists make organizing my massive collection effortless. Syncing across devices works perfectly.",
      name: "David Thompson",
      role: "Collector",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      rating: 5,
      verified: true
    },
    {
      quote: "Finally, an app that understands what movie lovers need! Syncs perfectly across all my devices, and the progress tracking is brilliant. I can pick up right where I left off.",
      name: "Lisa Park",
      role: "TV Series Fan",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      rating: 4,
      verified: false
    },
    {
      quote: "The best watchlist app I've used. Period. Clean design, powerful features, and it just works. Highly recommend to anyone serious about movies! Worth every penny.",
      name: "James Wilson",
      role: "Cinema Professional",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
      rating: 5,
      verified: true
    },
    {
      quote: "Love how I can create separate lists for different moods and occasions. Movie night planning has never been easier. My family loves using it together!",
      name: "Rachel Green",
      role: "Family Movie Night Host",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
      rating: 5,
      verified: false
    },
    {
      quote: "The analytics feature is amazing! I can see my watching patterns and discover what genres I gravitate towards. It's helped me branch out and try new things.",
      name: "Michael Brown",
      role: "Data Enthusiast",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      rating: 5,
      verified: true
    },
    {
      quote: "Simple, elegant, and effective. Everything a watchlist app should be without any unnecessary bloat. Fast performance even with thousands of titles.",
      name: "Anna Schmidt",
      role: "Minimalist",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
      rating: 4,
      verified: false
    }
  ];

  const testimonialsPerView = 3;
  const maxIndex = Math.max(0, testimonials.length - testimonialsPerView);

  const nextTestimonials = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const prevTestimonials = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const visibleTestimonials = testimonials.slice(
    currentIndex,
    currentIndex + testimonialsPerView
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Use your existing LandingHeader */}
      <LandingHeader onShowAuth={onShowAuth} />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Loved By Movie Enthusiasts
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join thousands of happy users who've transformed how they manage their watchlists. 
            See what real users have to say about their experience.
          </p>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Desktop: 3-column grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
              {visibleTestimonials.map((testimonial, index) => (
                <TestimonialCard key={currentIndex + index} {...testimonial} />
              ))}
            </div>

            {/* Mobile: Single column */}
            <div className="md:hidden">
              <TestimonialCard {...testimonials[currentIndex]} />
            </div>

            {/* Navigation Arrows - Desktop */}
            {testimonials.length > testimonialsPerView && (
              <>
                <button
                  onClick={prevTestimonials}
                  disabled={currentIndex === 0}
                  className={`hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all duration-200 ${
                    currentIndex === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-50 hover:scale-110'
                  }`}
                  aria-label="Previous testimonials"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextTestimonials}
                  disabled={currentIndex >= maxIndex}
                  className={`hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all duration-200 ${
                    currentIndex >= maxIndex
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-50 hover:scale-110'
                  }`}
                  aria-label="Next testimonials"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Mobile Navigation Arrows */}
            <div className="md:hidden flex justify-center mt-6 space-x-4">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className={`bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all duration-200 ${
                  currentIndex === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                }`}
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(testimonials.length - 1, currentIndex + 1))}
                disabled={currentIndex >= testimonials.length - 1}
                className={`bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all duration-200 ${
                  currentIndex >= testimonials.length - 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                }`}
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: Math.ceil(testimonials.length / testimonialsPerView) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index * testimonialsPerView)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  Math.floor(currentIndex / testimonialsPerView) === index
                    ? 'w-8 bg-gradient-to-r from-blue-600 to-purple-600'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial set ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">4.8/5</div>
              <div className="text-gray-600">Average Rating</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">50K+</div>
              <div className="text-gray-600">Happy Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-pink-600 mb-2">1M+</div>
              <div className="text-gray-600">Movies Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">98%</div>
              <div className="text-gray-600">Would Recommend</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Join Our Community Today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start organizing your watchlist and discover why thousands of users love Tagflix
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onShowAuth('signup')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Start Your Free Trial
            </button>
            <Link 
              to="/how-it-works"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transform hover:scale-105 transition-all duration-200"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Use your existing LandingFooter */}
      <LandingFooter />
    </div>
  );
}