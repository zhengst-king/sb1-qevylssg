// src/components/landing/PricingSection.tsx
import React, { useState } from 'react';
import { Check, X, Zap } from 'lucide-react';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
  cta: string;
  color: string;
}

interface PricingSectionProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export function PricingSection({ onShowAuth }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const tiers: PricingTier[] = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with your watchlist",
      features: [
        "Unlimited movies & TV shows",
        "Basic watchlist tracking",
        "Search & discover titles",
        "Manual ratings & reviews",
        "Mobile app access",
        "Basic recommendations"
      ],
      notIncluded: [
        "Advanced analytics",
        "Custom collections",
        "Priority support"
      ],
      cta: "Start Free",
      color: "from-slate-600 to-slate-700"
    },
    {
      name: "Plus",
      price: billingCycle === 'monthly' ? "$4.99" : "$49.99",
      period: billingCycle === 'monthly' ? "per month" : "per year",
      description: "For enthusiasts who want more control",
      popular: true,
      features: [
        "Everything in Free",
        "Custom collections & playlists",
        "Advanced analytics & insights",
        "Smart recommendations",
        "Export your data",
        "Priority email support",
        "Ad-free experience",
        "Early access to new features"
      ],
      cta: "Start 14-Day Free Trial",
      color: "from-blue-600 to-purple-600"
    },
    {
      name: "Premium",
      price: billingCycle === 'monthly' ? "$9.99" : "$99.99",
      period: billingCycle === 'monthly' ? "per month" : "per year",
      description: "Ultimate experience for power users",
      features: [
        "Everything in Plus",
        "Unlimited custom collections",
        "Advanced filtering & sorting",
        "Bulk import/export",
        "API access",
        "Priority chat support",
        "Custom themes",
        "Family sharing (up to 5 users)",
        "Lifetime price lock"
      ],
      cta: "Start 14-Day Free Trial",
      color: "from-purple-600 to-pink-600"
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Start free and upgrade anytime. No hidden fees, cancel whenever you want.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full font-medium transition-all relative ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ${
                tier.popular
                  ? 'md:scale-105 border-2 border-blue-500 shadow-2xl'
                  : 'hover:shadow-xl'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  Most Popular
                </div>
              )}

              {/* Card Content */}
              <div className="p-8">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {tier.name}
                </h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-5xl font-bold text-slate-900">
                    {tier.price}
                  </span>
                  <span className="text-slate-600 ml-2">
                    {tier.period}
                  </span>
                </div>

                {/* Description */}
                <p className="text-slate-600 mb-6">
                  {tier.description}
                </p>

                {/* CTA Button */}
                <button
                  onClick={() => onShowAuth('signup')}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all mb-8 ${
                    tier.popular
                      ? `bg-gradient-to-r ${tier.color} text-white hover:shadow-lg transform hover:scale-105`
                      : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {tier.cta}
                </button>

                {/* Features List */}
                <div className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}

                  {/* Not Included Features */}
                  {tier.notIncluded && tier.notIncluded.map((feature, idx) => (
                    <div key={`not-${idx}`} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Info */}
        <div className="mt-16 text-center space-y-4">
          <p className="text-slate-600">
            All plans include a <span className="font-semibold text-slate-900">14-day free trial</span>. 
            No credit card required to start.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>No hidden fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Secure payment</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}