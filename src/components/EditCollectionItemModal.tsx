// src/EditCollectionItemModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Star, 
  Disc,
  Edit3,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { PhysicalMediaCollection } from '../lib/supabase';

interface EditCollectionItemModalProps {
  item: PhysicalMediaCollection | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface UpdateData {
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;
  personal_rating?: number;
  notes?: string;
}

export function EditCollectionItemModal({ 
  item, 
  isOpen, 
  onClose, 
  onUpdate 
}: EditCollectionItemModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [format, setFormat] = useState<'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('Blu-ray');
  const [condition, setCondition] = useState<'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'>('New');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseLocation, setPurchaseLocation] = useState('');
  const [personalRating, setPersonalRating] = useState('');
  const [notes, setNotes] = useState('');

  // Store original values for comparison
  const [originalValues, setOriginalValues] = useState<UpdateData | null>(null);

  // Initialize form with item data when modal opens
  useEffect(() => {
    if (item && isOpen) {
      const formData = {
        format: item.format,
        condition: item.condition,
        purchase_date: item.purchase_date || '',
        purchase_price: item.purchase_price || '',
        purchase_location: item.purchase_location || '',
        personal_rating: item.personal_rating || '',
        notes: item.notes || ''
      };

      setFormat(formData.format);
      setCondition(formData.condition);
      setPurchaseDate(formData.purchase_date);
      setPurchasePrice(formData.purchase_price.toString());
      setPurchaseLocation(formData.purchase_location);
      setPersonalRating(formData.personal_rating.toString());
      setNotes(formData.notes);

      setOriginalValues({
        format: formData.format,
        condition: formData.condition,
        purchase_date: formData.purchase_date || undefined,
        purchase_price: formData.purchase_price ? Number(formData.purchase_price) : undefined,
        purchase_location: formData.purchase_location || undefined,
        personal_rating: formData.personal_rating ? Number(formData.personal_rating) : undefined,
        notes: formData.notes || undefined
      });

      setHasChanges(false);
      setUpdateSuccess(false);
      setError(null);
    }
  }, [item, isOpen]);

  // Check for changes whenever form values change
  useEffect(() => {
    if (!originalValues) return;

    const currentValues: UpdateData = {
      format,
      condition,
      purchase_date: purchaseDate || undefined,
      purchase_price: purchasePrice ? Number(purchasePrice) : undefined,
      purchase_location: purchaseLocation || undefined,
      personal_rating: personalRating ? Number(personalRating) : undefined,
      notes: notes || undefined
    };

    const changed = JSON.stringify(currentValues) !== JSON.stringify(originalValues);
    setHasChanges(changed);
  }, [format, condition, purchaseDate, purchasePrice, purchaseLocation, personalRating, notes, originalValues]);

  if (!isOpen || !item) return null;

  const handleReset = () => {
    if (!originalValues) return;

    setFormat(originalValues.format);
    setCondition(originalValues.condition);
    setPurchaseDate(originalValues.purchase_date || '');
    setPurchasePrice(originalValues.purchase_price?.toString() || '');
    setPurchaseLocation(originalValues.purchase_location || '');
    setPersonalRating(originalValues.personal_rating?.toString() || '');
    setNotes(originalValues.notes || '');
  };

  const handleUpdate = async () => {
    if (!item || !hasChanges) return;

    try {
      setIsUpdating(true);
      setError(null);

      const updateData: Partial<PhysicalMediaCollection> = {
        format,
        condition,
        purchase_date: purchaseDate || null,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
        purchase_location: purchaseLocation || null,
        personal_rating: personalRating ? parseInt(personalRating) : null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('physical_media_collections')
        .update(updateData)
        .eq('id', item.id);

      if (updateError) {
        throw updateError;
      }

      setUpdateSuccess(true);
      setHasChanges(false);
      onUpdate(); // Refresh the collection data

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Edit3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Edit Collection Item</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Movie Info (Read-only) */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-4">
              {item.poster_url && (
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-16 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900">{item.title}</h3>
                <p className="text-slate-600">{item.year}</p>
                {item.director && (
                  <p className="text-sm text-slate-500">Directed by {item.director}</p>
                )}
                {item.genre && (
                  <p className="text-sm text-slate-500">{item.genre}</p>
                )}
              </div>
            </div>
          </div>

          {/* Success Message */}
          {updateSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Collection item updated successfully!</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Editable Form */}
          <div className="space-y-4">
            {/* Physical Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Disc className="inline h-4 w-4 mr-1" />
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DVD">DVD</option>
                  <option value="Blu-ray">Blu-ray</option>
                  <option value="4K UHD">4K UHD</option>
                  <option value="3D Blu-ray">3D Blu-ray</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
            </div>

            {/* Purchase Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Purchase Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Star className="inline h-4 w-4 mr-1" />
                  Personal Rating
                </label>
                <select
                  value={personalRating}
                  onChange={(e) => setPersonalRating(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No rating</option>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => (
                    <option key={rating} value={rating}>{rating}/10</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Purchase Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Purchase Location
              </label>
              <input
                type="text"
                placeholder="e.g., Amazon, Best Buy, Target"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special edition details, condition notes, etc."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="inline-flex items-center space-x-1 px-3 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
            )}
            {hasChanges && (
              <span className="text-sm text-orange-600 font-medium">Unsaved changes</span>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={!hasChanges || isUpdating || updateSuccess}
              className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isUpdating ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}