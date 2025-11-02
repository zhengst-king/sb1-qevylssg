// src/components/TagDetailModal.tsx
// Modal showing tag details and all associated content

import React, { useState, useEffect } from 'react';
import { X, Edit2, Share2, Trash2, ChevronRight, Star, FileText, Calendar, Tag as TagIcon, Save, Lock, Globe, Download, Copy, Check } from 'lucide-react';
import { useTags } from '../hooks/useTags';
import { useContentTags } from '../hooks/useTags';
import { getCategoryById } from '../data/taggingCategories';
import type { Tag, TagWithContent } from '../types/tagging';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { tagsService } from '../services/tagsService';

interface TagDetailModalProps {
  tag: Tag;
  isOpen: boolean;
  onClose: () => void;
  onTagUpdated?: () => void;
}

export const TagDetailModal: React.FC<TagDetailModalProps> = ({
  tag,
  isOpen,
  onClose,
  onTagUpdated,
}) => {
  const { deleteTag, updateTag } = useTags();
  const { subcategories } = useTagSubcategories();

  // Add this line - keep local copy of tag
  const [currentTag, setCurrentTag] = useState<Tag>(tag);
  
  const [tagWithContent, setTagWithContent] = useState<TagWithContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(tag.name);
  const [editedDescription, setEditedDescription] = useState(tag.description || '');
  const [editedIsPublic, setEditedIsPublic] = useState(tag.is_public || false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentTag(tag); // Update local copy when modal opens
      loadTagDetails();
      setEditedName(tag.name);
      setEditedDescription(tag.description || '');
      setEditedIsPublic(tag.is_public || false);
    }
  }, [tag.id, isOpen]);

  // Add this new useEffect for Esc key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showShareMenu) {
          setShowShareMenu(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, showShareMenu, onClose]);

  const loadTagDetails = async () => {
    setLoading(true);
    try {
      const data = await tagsService.getTagWithContent(tag.id);
      setTagWithContent(data);
    } catch (error) {
      console.error('Error loading tag details:', error);
      setTagWithContent({ ...tag, content: [] } as TagWithContent);
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
      console.log('Updating tag with is_public:', editedIsPublic); // Debug log
      
      // updateTag returns Tag directly and throws on error
      const updatedTag = await updateTag(tag.id, {
        name: editedName.trim(),
        description: editedDescription.trim() || null,
        is_public: editedIsPublic,
      });

      console.log('Updated tag received:', updatedTag); // Debug log

      setEditMode(false);
      // Update the local tag object
      setCurrentTag(updatedTag);

      // Notify parent component to refresh its tags
      if (onTagUpdated) {
        onTagUpdated();
      }
    
      // Reload
      await loadTagDetails();
    } catch (error) {
      console.error('Error updating tag:', error);
      alert(`Error: ${(error as Error).message || 'Failed to update tag'}`);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedName(currentTag.name);
    setEditedDescription(currentTag.description || '');
    setEditedIsPublic(currentTag.is_public || false);
  };

  const handleDeleteTag = async () => {
    if (window.confirm(
      `Are you sure you want to delete "${currentTag.name}"? This will remove it from all ${tagWithContent?.content.length || 0} titles.`
    )) {
      try {
        // deleteTag returns void and throws on error
        await deleteTag(tag.id);
        onClose();
      } catch (error) {
        console.error('Error deleting tag:', error);
        alert(`Error: ${(error as Error).message || 'Failed to delete tag'}`);
      }
    }
  };

  const handleRemoveFromTitle = async (contentTagId: string, title: string) => {
    if (window.confirm(`Remove "${currentTag.name}" from "${title}"?`)) {
      try {
        await tagsService.removeTagFromContent(contentTagId);
        await loadTagDetails(); // Reload to update the list
      } catch (error) {
        console.error('Error removing tag:', error);
        alert(`Error: ${(error as Error).message || 'Failed to remove tag'}`);
      }
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const exportData = await tagsService.exportTag(tag.id);
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadJSON = async () => {
    try {
      const exportData = await tagsService.exportTag(tag.id);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tag-${currentTag.name.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowShareMenu(false);
    } catch (error) {
      console.error('Error downloading JSON:', error);
      alert('Failed to download tag data');
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
  };

  if (!isOpen) return null;

  // Get category and subcategory info
  const category = getCategoryById(currentTag.category_id);

  // Find subcategory from the subcategories list
  const subcategory = subcategories?.find(sub => sub.id === currentTag.subcategory_id);
  const subcategoryName = subcategory?.name || currentTag.subcategory?.name || 'Unknown Subcategory';

  // Format creation date
  const createdDate = currentTag.created_at 
    ? new Date(currentTag.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    : 'Unknown';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300] p-4"
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: currentTag.color }}
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
                  <h2 className="text-2xl font-bold text-slate-900">{currentTag.name}</h2>
                )}

                {/* Public/Private Badge */}
                {!editMode && (
                  <span className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                    ${currentTag.is_public 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-100 text-slate-700'
                    }
                  `}>
                    {currentTag.is_public ? (
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
                    <span className="font-semibold text-slate-900">{currentTag.usage_count || 0}</span> uses
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
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Share tag"
                    >
                      <Share2 className="h-5 w-5 text-slate-600" />
                    </button>
                    
                    {/* Share Menu Dropdown */}
                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
                        <button
                          onClick={handleCopyToClipboard}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy as JSON</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleDownloadJSON}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download JSON</span>
                        </button>
                      </div>
                    )}
                  </div>
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
            currentTag.description && (
              <p className="text-slate-700 bg-slate-50 rounded-lg p-3">
                {currentTag.description}
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