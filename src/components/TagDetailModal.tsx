// src/components/TagDetailModal.tsx
// Modal showing tag details and all associated content

import React, { useState, useEffect } from 'react';
import { X, Edit2, Share2, Trash2, ChevronRight, Star, FileText, Calendar, Tag as TagIcon, Save, Lock, Globe } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import { useContentTags } from '../hooks/useTags';
import { getCategoryById } from '../data/taggingCategories';
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
  const { getTagWithContent, deleteTag, updateTag } = useTags({ autoFetch: false });
  const { removeTagFromContent } = useContentTags({ autoFetch: false });
  
  const [tagWithContent, setTagWithContent] = useState<TagWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(tag.name);
  const [editedDescription, setEditedDescription] = useState(tag.description || '');
  const [editedIsPublic, setEditedIsPublic] = useState(tag.is_public || false);

  useEffect(() => {
    if (isOpen) {
      loadTagDetails();
      setEditedName(tag.name);
      setEditedDescription(tag.description || '');
      setEditedIsPublic(tag.is_public || false);
    }
  }, [tag.id, isOpen]);

  const loadTagDetails = async () => {
    setLoading(true);
    try {
      const data = await getTagWithContent(tag.id);
      setTagWithContent(data);
    } catch (error) {
      console.error('Error loading tag details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedName.trim()) {
      alert('Tag name cannot be empty');
      return;
    }

    try {
      const result = await updateTag(tag.id, {
        name: editedName.trim(),
        description: editedDescription.trim() || null,
        is_public: editedIsPublic,
      });

      if (result && result.success) {
        setEditMode(false);
        // Update the local tag object
        tag.name = editedName.trim();
        tag.description = editedDescription.trim() || null;
        tag.is_public = editedIsPublic;
        // Reload to get updated data
        await loadTagDetails();
      } else {
        alert(`Error: ${result?.error || 'Failed to update tag'}`);
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      alert(`Error: ${(error as Error).message || 'Failed to update tag'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedName(tag.name);
    setEditedDescription(tag.description || '');
    setEditedIsPublic(tag.is_public || false);
  };

  const handleDeleteTag = async () => {
    if (window.confirm(
      `Are you sure you want to delete "${tag.name}"? This will remove it from all ${tagWithContent?.content.length || 0} titles.`
    )) {
      const result = await deleteTag(tag.id);
      if (result.success) {
        onClose();
      } else {
        alert(`Error: ${result.error || 'Failed to delete tag'}`);
      }
    }
  };

  const handleRemoveFromTitle = async (contentTagId: string, title: string) => {
    if (window.confirm(`Remove "${tag.name}" from "${title}"?`)) {
      const result = await removeTagFromContent(contentTagId);
      if (result.success) {
        await loadTagDetails(); // Reload
      } else {
        alert(`Error: ${result.error || 'Failed to remove tag'}`);
      }
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
  };

  if (!isOpen) return null;

  // Get category and subcategory info
  const category = getCategoryById(tag.category_id);
  const subcategoryName = tag.subcategory?.name || 'Unknown Subcategory';

  // Format creation date
  const createdDate = tag.created_at 
    ? new Date(tag.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Unknown';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                
                {editMode ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold text-slate-900 border-b-2 border-blue-500 focus:outline-none flex-1"
                    maxLength={100}
                    autoFocus
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-slate-900">{tag.name}</h2>
                )}

                {/* Public/Private Badge */}
                {!editMode && (
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${tag.is_public 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-100 text-slate-700'
                    }
                  `}>
                    {tag.is_public ? (
                      <>
                        <Globe className="h-3 w-3" />
                        Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        Private
                      </>
                    )}
                  </span>
                )}
              </div>
              
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                <span>{category?.name || 'Unknown Category'}</span>
                <ChevronRight className="h-4 w-4" />
                <span>{subcategoryName}</span>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <TagIcon className="h-4 w-4" />
                  <span>
                    <span className="font-semibold text-slate-900">{tag.usage_count || 0}</span> uses
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created {createdDate}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title="Save changes"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <X className="h-5 w-5 text-slate-600" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
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
                </>
              )}
            </div>
          </div>

          {/* Edit Mode: Public/Private Selector */}
          {editMode && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Visibility
              </label>
              <select
                value={editedIsPublic ? 'public' : 'private'}
                onChange={(e) => setEditedIsPublic(e.target.value === 'public')}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="private">🔒 Private (only you can see)</option>
                <option value="public">🌐 Public (other users can see)</option>
              </select>
            </div>
          )}

          {/* Description */}
          {editMode ? (
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full text-slate-700 bg-slate-50 rounded-lg p-3 border-2 border-blue-500 focus:outline-none resize-none"
              rows={3}
              maxLength={500}
            />
          ) : (
            tag.description && (
              <p className="text-slate-700 bg-slate-50 rounded-lg p-3">
                {tag.description}
              </p>
            )
          )}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !tagWithContent || tagWithContent.content.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">{category?.icon || '🏷️'}</div>
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
                  key={item.content_tag_id}
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
                    
                    <div className="flex items-center gap-3 text-sm text-slate-600 mb-1">
                      <span className="capitalize">{item.content_type}</span>
                      {item.user_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{item.user_rating}/10</span>
                        </div>
                      )}
                    </div>

                    {item.user_notes && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {item.user_notes}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromTitle(item.content_tag_id, item.title)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
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
            disabled={editMode}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Delete Tag
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