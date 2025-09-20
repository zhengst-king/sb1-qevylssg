// src/components/MySpotsPage.tsx
import React from 'react';
import { MapPin } from 'lucide-react';

export function MySpotsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
          <MapPin className="h-8 w-8 text-red-500" />
          <span>My Spots</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Track your favorite stores, theaters, and collection locations
        </p>
      </div>
      
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <MapPin className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">My Spots Coming Soon</h2>
        <p className="text-slate-600">
          This page will help you manage your favorite movie stores, theaters, and collection spots.
          Features will include store maps, deals tracking, and location-based recommendations.
        </p>
      </div>
    </div>
  );
}