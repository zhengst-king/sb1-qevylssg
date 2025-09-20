// src/components/MyStarsPage.tsx
import React from 'react';
import { Star } from 'lucide-react';

export function MyStarsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
          <Star className="h-8 w-8 text-yellow-500" />
          <span>My Stars</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Manage your favorite actors, directors, and creators
        </p>
      </div>
      
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <Star className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">My Stars Coming Soon</h2>
        <p className="text-slate-600">
          This page will allow you to track your favorite actors, directors, and creators.
          Features will include star ratings, follow notifications, and personalized recommendations.
        </p>
      </div>
    </div>
  );
}