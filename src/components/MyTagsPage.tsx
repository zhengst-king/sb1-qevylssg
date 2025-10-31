// src/components/MyTagsPage.tsx
import React, { useState } from 'react';
import { Tag, Settings } from 'lucide-react';
import { TagManagementModal } from './TagManagementModal';

export function MyTagsPage() {
  const [showTagManagementModal, setShowTagManagementModal] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
              <Tag className="h-8 w-8 text-blue-500" />
              <span>My Tags</span>
            </h1>
            <p className="text-slate-600 mt-2">
              Organize your collection with custom tags and labels
            </p>
          </div>

          {/* Manage Tags Button */}
          <button
            onClick={() => setShowTagManagementModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Manage Tags</span>
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <Tag className="h-16 w-16 text-blue-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">My Tags Coming Soon</h2>
        <p className="text-slate-600">
          This page will allow you to create and manage custom tags for your collection.
          Features will include tag hierarchies, smart tagging, and tag-based analytics.
        </p>
        <p className="text-slate-500 text-sm mt-4">
          Click "Manage Tags" above to start creating and organizing your tags.
        </p>
      </div>

      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={showTagManagementModal}
        onClose={() => setShowTagManagementModal(false)}
      />
    </div>
  );
}