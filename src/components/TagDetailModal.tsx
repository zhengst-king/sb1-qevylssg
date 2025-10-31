// src/components/TagDetailModal.tsx
// Modal showing tag details and all associated content

import React, { useState, useEffect } from 'react';
import { X, Edit2, Share2, Trash2, ChevronRight, Star, FileText } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import { useContentTags } from '../hooks/useTags';
import type { Tag, TagWithContent } from '../types/tagging';

interface TagDetailModalProps {
  tag: Tag;
  isOpen: boolean;
  onClose: () => void;
}

export const TagDetailModal: React.FC<TagDetailModalProps> = ({
  tag,
  isOpen,
  onClose,
}) => {
  const { getTagWithContent, deleteTag } = useTags({ autoFetch: false });
  const { removeTagFromContent } = useContentTags({ autoFetch: false });
  
  const [tagWithContent, setTagWithContent] = useState<TagWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTagDetails();
    }
  }, [tag.id, isOpen]);

  const loadTagDetails = async () => {
    setLoading(true);
    const data = await getTagWithContent(tag.id);
    setTagWithContent(data);
    setLoading(false);
  };

  const handleDeleteTag = async () => {
    if (window.confirm(
      `Are you sure you want to delete "${tag.name}"? This will remove it from all ${tagWithContent?.content.length || 0} titles.`
    )) {
      const result = await deleteTag(tag.id);
      if (result.success) {
        onClose();
      }
    }
  };

  const handleRemoveFromTitle = async (contentTagId: string, title: string) => {
    if (window.confirm(`Remove "${tag.name}" from "${title}"?`)) {
      await removeTagFromContent(contentTagId);
      await loadTagDetails(); // Reload
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: tag.color }}
                />
                <h2 className="text-2xl font-bold text-slate-900">{tag.name}</h2>
              </div>
              
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>{tag.category?.name || 'Category'}</span>
                <ChevronRight className="h-4 w-4" />
                <span>{tag.subcategory?.name || 'Subcategory'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Edit tag"
              >
                <Edit2 className="h-5 w-5 text-slate-600" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Share tag"
              >
                <Share2 className="h-5 w-5 text-slate-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Description */}
          {tag.description && (
            <p className="text-slate-700 bg-slate-50 rounded-lg p-3">
              {tag.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-slate-600">Color: {tag.color}</span>
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-900">
                {tagWithContent?.content.length || 0}
              </span> titles tagged
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !tagWithContent || tagWithContent.content.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">{tag.category?.icon || '🏷️'}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No content tagged yet
              </h3>
              <p className="text-slate-600">
                This tag hasn't been applied to any movies or TV shows.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 mb-4">
                Tagged Content ({tagWithContent.content.length})
              </h3>
              
              {tagWithContent.content.map((item) => (
                <div
                  key={`${item.content_type}-${item.id}`}
                  className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                >
                  {/* Poster */}
                  <div className="flex-shrink-0 w-16 h-24 bg-slate-200 rounded overflow-hidden">
                    {item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <FileText className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 mb-1">
                      {item.title} {item.year && `(${item.year})`}
                    </h4>
                    
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="capitalize">{item.content_type}</span>
                      {item.user_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{item.user_rating}/10</span>
                        </div>
                      )}
                    </div>

                    {item.user_notes && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {item.user_notes}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => {
                      // Find the content_tag id
                      // This is a simplified version - you'd need the actual content_tag id
                      handleRemoveFromTitle('content-tag-id', item.title);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove from this title"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleDeleteTag}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Delete Tag Entirely
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};