import React from 'react';
import { Check, X, Zap, Crown, Sparkles } from 'lucide-react';
import { LandingHeader } from './landing/LandingHeader';
import { LandingFooter } from './landing/LandingFooter';
import { Link } from 'react-router-dom';

interface PricingPageProps {
  onShowAuth: (mode: 'signin' | 'signup') => void;
}

export default function PricingPage({ onShowAuth }: PricingPageProps) {
  const plans = [
    {
      name: "Free",
      icon: Sparkles,
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with your watchlist",
      color: "from-blue-500 to-blue-600",
      features: [
        { included: true, text: "Unlimited movies & TV shows" },
        { included: true, text: "Basic recommendations" },
        { included: true, text: "5 custom collections" },
        { included: true, text: "Mobile & web access" },
        { included: false, text: "Advanced analytics" },
        { included: false, text: "Priority support" },
        { included: false, text: "Export data" },
        { included: false, text: "Ad-free experience" }
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      icon: Zap,
      price: "$9.99",
      period: "per month",
      description: "For serious movie enthusiasts who want more",
      color: "from-purple-500 to-purple-600",
      features: [
        { included: true, text: "Everything in Free" },
        { included: true, text: "AI-powered recommendations" },
        { included: true, text: "Unlimited collections" },
        { included: true, text: "Advanced analytics & insights" },
        { included: true, text: "Priority support" },
        { included: true, text: "Export your data" },
        { included: false, text: "Team collaboration" },
        { included: false, text: "API access" }
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Team",
      icon: Crown,
      price: "$29.99",
      period: "per month",
      description: "Perfect for families and groups",
      color: "from-pink-500 to-pink-600",
      features: [
        { included: true, text: "Everything in Pro" },
        { included: true, text: "Up to 5 team members" },
        { included: true, text: "Shared collections" },
        { included: true, text: "Team analytics" },
        { included: true, text: "API access" },
        { included: true, text: "Priority support" },
        { included: true, text: "Custom integrations" },
        { included: true, text: "Dedicated account manager" }
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Use your existing LandingHeader */}
      <LandingHeader onShowAuth={onShowAuth} />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Choose the perfect plan for your movie-watching needs. All plans include a 14-day free trial.
          </p>
          
          {/* Money-back guarantee badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
            <Check className="h-5 w-5 text-green-300" />
            <span>14-day money-back guarantee</span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <div
                  key={index}
                  className={`relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ${
                    plan.popular ? 'ring-4 ring-purple-500 scale-105' : ''
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-8">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-8">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-600 ml-2">/{plan.period}</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => onShowAuth('signup')}
                      className={`w-full py-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                          : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {plan.cta}
                    </button>

                    {/* Features List */}
                    <ul className="mt-8 space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          {feature.included ? (
                            <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately, and we'll prorate any differences.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and Apple Pay.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! All paid plans come with a 14-day free trial. No credit card required to start, and you can cancel anytime.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-gray-600">
                Your data is yours forever. You can export all your watchlists and data at any time. If you cancel, your account remains active until the end of your billing period, and your data is saved for 90 days if you want to reactivate.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Do you offer student or nonprofit discounts?
              </h3>
              <p className="text-gray-600">
                Yes! We offer 50% off Pro plans for students and verified nonprofit organizations. Contact our support team with proof of eligibility to get your discount code.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Can I use Tagflix on multiple devices?
              </h3>
              <p className="text-gray-600">
                Absolutely! All plans work across unlimited devices - web, iOS, and Android. Your data syncs automatically across all your devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Compare All Features
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl shadow-lg">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Free</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">Movies & TV Shows</td>
                  <td className="px-6 py-4 text-center text-sm">Unlimited</td>
                  <td className="px-6 py-4 text-center text-sm">Unlimited</td>
                  <td className="px-6 py-4 text-center text-sm">Unlimited</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">Custom Collections</td>
                  <td className="px-6 py-4 text-center text-sm">5</td>
                  <td className="px-6 py-4 text-center text-sm">Unlimited</td>
                  <td className="px-6 py-4 text-center text-sm">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">AI Recommendations</td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">Advanced Analytics</td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">Team Collaboration</td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm">Up to 5 members</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-700">API Access</td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-700">Priority Support</td>
                  <td className="px-6 py-4 text-center"><X className="h-5 w-5 text-gray-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="h-5 w-5 text-green-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users organizing their watchlists with Tagflix
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => onShowAuth('signup')}
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Start Free Trial
            </button>
            <Link 
              to="/features"
              className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transform hover:scale-105 transition-all duration-200"
            >
              See All Features
            </Link>
          </div>
        </div>
      </section>

      {/* Use your existing LandingFooter */}
      <LandingFooter />
    </div>
  );
}