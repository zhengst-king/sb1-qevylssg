// src/components/TagCard.tsx
// Minimal card component for displaying a tag

import React from 'react';
import { Tag as TagIcon } from 'lucide-react';
import type { Tag, TagCategory } from '../types/tagging';

interface TagCardProps {
  tag: Tag;
  onClick: (tag: Tag) => void;
}

const getCategoryIcon = (categoryId: number, categories: TagCategory[] = []): string => {
  const category = categories.find(c => c.id === categoryId);
  return category?.icon || '🏷️';
};

export const TagCard: React.FC<TagCardProps> = ({ tag, onClick }) => {
  const usageCount = tag.usage_count || 0;
  const categoryIcon = tag.category?.icon || '🏷️';

  return (
    <div
      onClick={() => onClick(tag)}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
    >
      {/* Color Header with Icon */}
      <div
        className="h-32 flex items-center justify-center relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tag.color}20, ${tag.color}40)`,
        }}
      >
        <div className="text-5xl transition-transform group-hover:scale-110">
          {categoryIcon}
        </div>
        
        {/* Tag icon overlay */}
        <div
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80"
          style={{ color: tag.color }}
        >
          <TagIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h4 className="font-medium text-slate-900 line-clamp-2 min-h-[3rem]">
          {tag.name}
        </h4>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm text-slate-500">
            {usageCount} {usageCount === 1 ? 'title' : 'titles'}
          </p>
          
          {/* Color indicator */}
          <div
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: tag.color }}
            title={tag.color}
          />
        </div>

        {/* Subcategory badge */}
        {tag.subcategory && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {tag.subcategory.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};