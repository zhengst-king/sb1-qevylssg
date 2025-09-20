// src/components/CalendarsPage.tsx
import React from 'react';
import { Calendar } from 'lucide-react';

export function CalendarsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
          <Calendar className="h-8 w-8 text-green-500" />
          <span>Calendars</span>
        </h1>
        <p className="text-slate-600 mt-2">
          Track release dates, viewing schedules, and collection goals
        </p>
      </div>
      
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <Calendar className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Calendars Coming Soon</h2>
        <p className="text-slate-600">
          This page will help you track important dates like release dates, viewing goals, and collection milestones.
          Features will include release calendars, viewing schedules, and reminder notifications.
        </p>
      </div>
    </div>
  );
}