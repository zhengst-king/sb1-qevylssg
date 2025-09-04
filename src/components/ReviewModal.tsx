import React, { useState, useEffect } from 'react';
import { X, Sparkles, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { geminiApi } from '../lib/gemini';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  initialReview: string;
  onSave: (review: string) => void;
}

export function ReviewModal({ isOpen, onClose, movieTitle, initialReview, onSave }: ReviewModalProps) {
  const [review, setReview] = useState(initialReview);
  const [originalReview, setOriginalReview] = useState(initialReview);
  const [polishedReview, setPolishedReview] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReview(initialReview);
      setOriginalReview(initialReview);
      setPolishedReview('');
      setShowComparison(false);
      setError(null);
    }
  }, [isOpen, initialReview]);

  const handlePolishWithAI = async () => {
    if (!review.trim()) {
      setError('Please write a review first before polishing it.');
      return;
    }

    if (review.trim().length < 10) {
      setError('Review is too short to polish. Please write at least 10 characters.');
      return;
    }

    setIsPolishing(true);
    setError(null);

    try {
      const polished = await geminiApi.polishReview(review.trim());
      setPolishedReview(polished);
      setShowComparison(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to polish review');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleAcceptPolished = () => {
    setReview(polishedReview);
    setShowComparison(false);
    setPolishedReview('');
  };

  const handleRejectPolished = () => {
    setShowComparison(false);
    setPolishedReview('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(review.trim());
      onClose();
    } catch (err) {
      setError('Failed to save review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setReview(originalReview);
    onClose();
  };

  const characterCount = review.length;
  const isValidLength = characterCount >= 10 && characterCount <= 5000;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-slate-900">
              Review: {movieTitle}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {!showComparison ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your thoughts about this movie..."
                  className="w-full h-40 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  maxLength={5000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm ${
                    isValidLength ? 'text-slate-500' : 'text-red-500'
                  }`}>
                    {characterCount}/5000 characters
                    {characterCount < 10 && ' (minimum 10 characters)'}
                  </span>
                  
                  <button
                    onClick={handlePolishWithAI}
                    disabled={isPolishing || !review.trim() || review.trim().length < 10}
                    className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{isPolishing ? 'Polishing...' : 'Polish with AI'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">Original Review</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 h-32 overflow-y-auto">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{review}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-700 mb-2">AI-Polished Review</h4>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 h-32 overflow-y-auto">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{polishedReview}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleAcceptPolished}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>Use AI Version</span>
                </button>
                
                <button
                  onClick={handleRejectPolished}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Keep Original</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !isValidLength || showComparison}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Review'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}