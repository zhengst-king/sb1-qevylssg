// src/components/TVSeriesWatchlistPage.tsx
// MINIMAL DEBUG VERSION - Let's isolate the issue step by step
import React, { useState } from 'react';
import { Tv, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function TVSeriesWatchlistPage() {
  const { isAuthenticated } = useAuth();

  // Step 1: Just render basic content
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Tv className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Sign in to view your TV series</h2>
          <p className="text-slate-600">You need to be signed in to manage your TV series watchlist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Basic Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="p-6">
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <Tv className="h-8 w-8 text-purple-600" />
              My TV Series - DEBUG VERSION
            </h1>
            <p className="text-slate-600 mt-2">
              If you can see this, the basic component structure works
            </p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold mb-4">🔍 Debug Status</h2>
          <div className="space-y-2">
            <p>✅ Component rendered successfully</p>
            <p>✅ useAuth hook working</p>
            <p>✅ Authentication status: {isAuthenticated ? 'Logged in' : 'Not logged in'}</p>
            <p>✅ Basic imports working (React, Lucide icons)</p>
            <p className="text-green-600 font-semibold">🎉 This means the issue is NOT in the basic component structure!</p>
          </div>
        </div>
      </div>
    </div>
  );
}