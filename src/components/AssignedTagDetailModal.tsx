// src/components/AssignedTagDetailModal.tsx
// Modal for viewing and editing metadata of a tag assigned to specific content

import React, { useState, useEffect } from 'react';
import { X, Clock, FileText, ChevronRight, Check, Edit2 } from 'lucide-react';
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

type EditingField = 'start_time' | 'end_time' | 'notes' | null;

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
  
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartTime(initialMetadata?.start_time || '');
      setEndTime(initialMetadata?.end_time || '');
      setNotes(initialMetadata?.notes || '');
      setEditingField(null);
      setError(null);
    }
  }, [isOpen, initialMetadata]);

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (editingField) {
          setEditingField(null);
          setError(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, editingField, onClose]);

  const validateTimeFormat = (time: string): boolean => {
    if (!time) return true;
    // Accept 6 digits (HHMMSS) or already formatted (HH:MM:SS)
    const digitRegex = /^[0-9]{6}$/;
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
    return digitRegex.test(time) || timeRegex.test(time);
  };

  const formatTimeInput = (input: string): string => {
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // If we have 6 digits, format as HH:MM:SS
    if (digits.length === 6) {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
    }
    
    // If already formatted correctly, return as is
    const timeRegex = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
    if (timeRegex.test(input)) {
      return input;
    }
    
    // Otherwise return the input as is (partial entry)
    return input;
  };

  const handleStartEdit = (field: EditingField, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setError(null);
  };

  const handleBlurSave = async (field: EditingField) => {
    // Only save if we're actually editing this field
    if (editingField !== field) return;
    
    // Call the save function
    await handleSaveField(field);
  };

  const handleSaveField = async (field: EditingField) => {
    console.log('[handleSaveField] Called with field:', field);
    console.log('[handleSaveField] editValue:', editValue);
    console.log('[handleSaveField] content_tag_id:', initialMetadata?.content_tag_id);
    
    if (!field || !initialMetadata?.content_tag_id) {
      console.log('[handleSaveField] Missing field or content_tag_id, aborting');
      return;
    }

    let trimmedValue = editValue.trim();
    
    // Format time fields if they're 6 digits
    if ((field === 'start_time' || field === 'end_time') && trimmedValue) {
      trimmedValue = formatTimeInput(trimmedValue);
      console.log('[handleSaveField] Formatted time value:', trimmedValue);
      
      if (!validateTimeFormat(trimmedValue)) {
        console.log('[handleSaveField] Invalid time format');
        setError('Time must be 6 digits (HHMMSS) or HH:MM:SS format');
        return;
      }
    }

    console.log('[handleSaveField] trimmedValue:', trimmedValue);

    // Validate end time is after start time
    if (field === 'end_time' && trimmedValue && startTime) {
      const [startH, startM, startS] = startTime.split(':').map(Number);
      const [endH, endM, endS] = trimmedValue.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60 + startS;
      const endSeconds = endH * 3600 + endM * 60 + endS;
      
      if (endSeconds <= startSeconds) {
        console.log('[handleSaveField] End time not after start time');
        setError('End time must be after start time');
        return;
      }
    }

    if (field === 'start_time' && trimmedValue && endTime) {
      const [startH, startM, startS] = trimmedValue.split(':').map(Number);
      const [endH, endM, endS] = endTime.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60 + startS;
      const endSeconds = endH * 3600 + endM * 60 + endS;
      
      if (endSeconds <= startSeconds) {
        console.log('[handleSaveField] Start time not before end time');
        setError('End time must be after start time');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      console.log('[handleSaveField] About to call updateAssignedTagMetadata...');
      console.log('[handleSaveField] Calling with:', {
        content_tag_id: initialMetadata.content_tag_id,
        start_time: field === 'start_time' ? (trimmedValue || null) : startTime || null,
        end_time: field === 'end_time' ? (trimmedValue || null) : endTime || null,
        notes: field === 'notes' ? (trimmedValue || null) : notes || null,
      });
      
      await contentTagsService.updateAssignedTagMetadata(
        initialMetadata.content_tag_id,
        {
          start_time: field === 'start_time' ? (trimmedValue || null) : startTime || null,
          end_time: field === 'end_time' ? (trimmedValue || null) : endTime || null,
          notes: field === 'notes' ? (trimmedValue || null) : notes || null,
        }
      );

      console.log('[handleSaveField] Update complete, updating local state...');
      // Update local state
      if (field === 'start_time') setStartTime(trimmedValue);
      if (field === 'end_time') setEndTime(trimmedValue);
      if (field === 'notes') setNotes(trimmedValue);

      console.log('[handleSaveField] Local state updated, closing edit field');
      setEditingField(null);
      // Don't call onSaved here - only when modal closes
    } catch (err) {
      console.error('[handleSaveField] Error saving field:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (field: EditingField) => {
    console.log('[handleSaveField] Called with field:', field);
    console.log('[handleSaveField] editValue:', editValue);
    console.log('[handleSaveField] content_tag_id:', initialMetadata?.content_tag_id);
    
    if (!field || !initialMetadata?.content_tag_id) {
      console.log('[handleSaveField] Missing field or content_tag_id, aborting');
      return;
    }

    let trimmedValue = editValue.trim();
    
    // Format time fields if they're 6 digits
    if ((field === 'start_time' || field === 'end_time') && trimmedValue) {
      trimmedValue = formatTimeInput(trimmedValue);
      console.log('[handleSaveField] Formatted time value:', trimmedValue);
      
      if (!validateTimeFormat(trimmedValue)) {
        console.log('[handleSaveField] Invalid time format');
        setError('Time must be 6 digits (HHMMSS) or HH:MM:SS format');
        return;
      }
    }

    // Validate end time is after start time
    if (field === 'end_time' && trimmedValue && startTime) {
      const [startH, startM, startS] = startTime.split(':').map(Number);
      const [endH, endM, endS] = trimmedValue.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60 + startS;
      const endSeconds = endH * 3600 + endM * 60 + endS;
      
      if (endSeconds <= startSeconds) {
        console.log('[handleSaveField] End time not after start time');
        setError('End time must be after start time');
        return;
      }
    }

    if (field === 'start_time' && trimmedValue && endTime) {
      const [startH, startM, startS] = trimmedValue.split(':').map(Number);
      const [endH, endM, endS] = endTime.split(':').map(Number);
      const startSeconds = startH * 3600 + startM * 60 + startS;
      const endSeconds = endH * 3600 + endM * 60 + endS;
      
      if (endSeconds <= startSeconds) {
        console.log('[handleSaveField] Start time not before end time');
        setError('End time must be after start time');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      console.log('[handleSaveField] About to call updateAssignedTagMetadata...');
      console.log('[handleSaveField] Calling with:', {
        content_tag_id: initialMetadata.content_tag_id,
        start_time: field === 'start_time' ? (trimmedValue || null) : startTime || null,
        end_time: field === 'end_time' ? (trimmedValue || null) : endTime || null,
        notes: field === 'notes' ? (trimmedValue || null) : notes || null,
      });
      
      await contentTagsService.updateAssignedTagMetadata(
        initialMetadata.content_tag_id,
        {
          start_time: field === 'start_time' ? (trimmedValue || null) : startTime || null,
          end_time: field === 'end_time' ? (trimmedValue || null) : endTime || null,
          notes: field === 'notes' ? (trimmedValue || null) : notes || null,
        }
      );

      console.log('[handleSaveField] Update complete, updating local state...');
      // Update local state
      if (field === 'start_time') setStartTime(trimmedValue);
      if (field === 'end_time') setEndTime(trimmedValue);
      if (field === 'notes') setNotes(trimmedValue);

      console.log('[handleSaveField] Local state updated, closing edit field');
      setEditingField(null);
      // Don't call onSaved here - only when modal closes
    } catch (err) {
      console.error('[handleSaveField] Error saving field:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
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
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <h2 className="text-xl font-bold text-slate-900">{tag.name}</h2>
            </div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="flex items-center space-x-1">
                <span>{category?.icon}</span>
                <span className="font-medium">{category?.name || 'Unknown'}</span>
              </span>
              <ChevronRight className="h-4 w-4" />
              <span>{subcategory?.name || 'Unknown'}</span>
            </div>
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
          {/* Error Display */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Start Time and End Time - Same Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Start Time */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4" />
                <span>Start Time</span>
              </label>
              
              {editingField === 'start_time' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleBlurSave('start_time')}
                    placeholder="012345 or 01:23:45"
                    maxLength={8}
                    autoFocus
                    disabled={saving}
                    className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    onClick={() => handleSaveField('start_time')}
                    disabled={saving}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    title="Save"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => handleStartEdit('start_time', startTime)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {startTime ? (
                    <span className="text-slate-900 font-mono">{startTime}</span>
                  ) : (
                    <span className="text-slate-400 italic">Click to add start time</span>
                  )}
                </div>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4" />
                <span>End Time</span>
              </label>
              
              {editingField === 'end_time' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleBlurSave('end_time')}
                    placeholder="012530 or 01:25:30"
                    maxLength={8}
                    autoFocus
                    disabled={saving}
                    className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    onClick={() => handleSaveField('end_time')}
                    disabled={saving}
                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    title="Save"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => handleStartEdit('end_time', endTime)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {endTime ? (
                    <span className="text-slate-900 font-mono">{endTime}</span>
                  ) : (
                    <span className="text-slate-400 italic">Click to add end time</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="h-4 w-4" />
              <span>Notes</span>
            </label>
            
            {editingField === 'notes' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleBlurSave('notes')}
                  placeholder="Add notes about this tag assignment..."
                  rows={4}
                  maxLength={1000}
                  autoFocus
                  disabled={saving}
                  className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">{editValue.length}/1000 characters</p>
                  <button
                    onClick={() => handleSaveField('notes')}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => handleStartEdit('notes', notes)}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors min-h-[100px]"
              >
                {notes ? (
                  <p className="text-slate-900 text-sm whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-slate-400 italic text-sm">Click to add notes</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Just Close button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={() => {
              if (onSaved) onSaved();
              onClose();
            }}
            className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};