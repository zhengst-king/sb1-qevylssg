// src/components/AssignedTagDetailModal.tsx
// Modal for viewing and editing metadata of a tag assigned to specific content

import React, { useState, useEffect } from 'react';
import { X, Save, Clock, FileText, ChevronRight } from 'lucide-react';
import { getCategoryById } from '../data/taggingCategories';
import { useTagSubcategories } from '../hooks/useTagSubcategories';
import { contentTagsService } from '../services/contentTagsService';
import type { Tag } from '../types/customCollections';

interface AssignedTagDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag;
  contentId: number;
  contentType: 'movie' | 'tv';
  contentTitle: string;
  initialMetadata?: {
    content_tag_id: string;
    start_time?: string | null;
    end_time?: string | null;
    notes?: string | null;
  };
  onSaved?: () => void;
}

export const AssignedTagDetailModal: React.FC<AssignedTagDetailModalProps> = ({
  isOpen,
  onClose,
  tag,
  contentId,
  contentType,
  contentTitle,
  initialMetadata,
  onSaved,
}) => {
  const { subcategories } = useTagSubcategories();
  
  const [startTime, setStartTime] = useState(initialMetadata?.start_time || '');
  const [endTime, setEndTime] = useState(initialMetadata?.end_time || '');
  const [notes, setNotes] = useState(initialMetadata?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartTime(initialMetadata?.start_time || '');
      setEndTime(initialMetadata?.end_time || '');
      setNotes(initialMetadata?.notes || '');
      setTimeError(null);
    }
  }, [isOpen, initialMetadata]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const validateTimeFormat = (time: string): boolean => {
    if (!time) return true; // Empty is valid
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  const handleSave = async () => {
    // Validate time formats
    if (startTime && !validateTimeFormat(startTime)) {
      setTimeError('Start time must be in format HH:MM:SS');
      return;
    }
    if (endTime && !validateTimeFormat(endTime)) {
      setTimeError('End time must be in format HH:MM:SS');
      return;
    }

    // Validate that end time is after start time
    if (startTime && endTime) {
      const [startH, startM, startS] = startTime.split(':').map(Number);
      const [endH, endM, endS] = endTime.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60 + startS;
      const endSeconds = endH * 3600 + endM * 60 + endS;
      
      if (endSeconds <= startSeconds) {
        setTimeError('End time must be after start time');
        return;
      }
    }

    setTimeError(null);
    setIsSaving(true);

    try {
      if (!initialMetadata?.content_tag_id) {
        throw new Error('No content tag ID provided');
      }

      await contentTagsService.updateAssignedTagMetadata(
        initialMetadata.content_tag_id,
        {
          start_time: startTime || null,
          end_time: endTime || null,
          notes: notes || null,
        }
      );

      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving assigned tag metadata:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const category = getCategoryById(tag.category_id);
  const subcategory = subcategories?.find(s => s.id === tag.subcategory_id);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: tag.color }}
            />
            <h2 className="text-xl font-bold text-slate-900">Tag Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Generic Tag Info (Read-only) */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center space-x-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>Generic Tag Information</span>
            </h3>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
              <span className="flex items-center space-x-1">
                <span>{category?.icon}</span>
                <span className="font-medium">{category?.name || 'Unknown'}</span>
              </span>
              <ChevronRight className="h-4 w-4" />
              <span>{subcategory?.name || 'Unknown'}</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-semibold text-slate-900">{tag.name}</span>
            </div>

            {/* Description */}
            {tag.description && (
              <div className="text-sm text-slate-700 bg-white rounded p-3 border border-slate-200">
                {tag.description}
              </div>
            )}
          </div>

          {/* Section 2: Assigned Tag Info (Editable) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Assignment Details for "{contentTitle}"</span>
            </h3>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Start Time</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="HH:MM:SS (e.g., 01:23:45)"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Format: HH:MM:SS</p>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>End Time</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="HH:MM:SS (e.g., 01:25:30)"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Format: HH:MM:SS</p>
              </div>
            </div>

            {/* Time Error */}
            {timeError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {timeError}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                </div>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this tag assignment (e.g., why it applies, specific scenes, etc.)"
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                {notes.length}/1000 characters
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};