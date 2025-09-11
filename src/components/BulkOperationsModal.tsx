import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Package, 
  CheckCircle,
  AlertCircle,
  Disc,
  Calendar,
  DollarSign,
  MapPin,
  Star
} from 'lucide-react';
import type { PhysicalMediaCollection } from '../lib/supabase';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: PhysicalMediaCollection[];
  onBulkUpdate: (updates: BulkUpdateData) => Promise<void>;
}

interface BulkUpdateData {
  format?: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  condition?: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  purchase_location?: string;
  // Note: We don't include purchase_date, purchase_price, personal_rating 
  // as these are typically unique per item
}

export function BulkOperationsModal({ 
  isOpen, 
  onClose, 
  selectedItems, 
  onBulkUpdate 
}: BulkOperationsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - using empty strings to represent "no change"
  const [format, setFormat] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [purchaseLocation, setPurchaseLocation] = useState('');

  if (!isOpen) return null;

  const handleBulkUpdate = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      // Build update object only with changed fields
      const updates: BulkUpdateData = {};
      
      if (format) updates.format = format as any;
      if (condition) updates.condition = condition as any;
      if (purchaseLocation.trim()) updates.purchase_location = purchaseLocation.trim();

      // Check if any updates were made
      if (Object.keys(updates).length === 0) {
        setError('Please select at least one field to update');
        return;
      }

      await onBulkUpdate(updates);
      
      setUpdateSuccess(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Bulk update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update items');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setFormat('');
    setCondition('');
    setPurchaseLocation('');
    setUpdateSuccess(false);
    setError(null);
    onClose();
  };

  const hasChanges = format || condition || purchaseLocation.trim();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Bulk Update ({selectedItems.length} items)
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success Message */}
          {updateSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  Successfully updated {selectedItems.length} items!
                </span>
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

          {/* Selected Items Preview */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-slate-900 mb-3">Selected Items:</h3>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {selectedItems.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center space-x-3 text-sm">
                  {item.poster_url && (
                    <img 
                      src={item.poster_url} 
                      alt={item.title}
                      className="w-8 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <span className="text-slate-500 ml-2">({item.year})</span>
                    <div className="text-xs text-slate-400">
                      {item.format} • {item.condition}
                    </div>
                  </div>
                </div>
              ))}
              {selectedItems.length > 10 && (
                <div className="text-sm text-slate-500 text-center py-2">
                  ... and {selectedItems.length - 10} more items
                </div>
              )}
            </div>
          </div>

          {/* Bulk Update Form */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center text-blue-800 text-sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Only fields you select will be updated. Leave fields empty to keep existing values.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Disc className="inline h-4 w-4 mr-1" />
                  Update Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Keep existing formats</option>
                  <option value="DVD">DVD</option>
                  <option value="Blu-ray">Blu-ray</option>
                  <option value="4K UHD">4K UHD</option>
                  <option value="3D Blu-ray">3D Blu-ray</option>
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Update Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Keep existing conditions</option>
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
            </div>

            {/* Purchase Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <MapPin className="inline h-4 w-4 mr-1" />
                Update Purchase Location
              </label>
              <input
                type="text"
                placeholder="Leave empty to keep existing locations"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            {hasChanges ? (
              <span className="text-orange-600 font-medium">Ready to update {selectedItems.length} items</span>
            ) : (
              <span>Select fields to update</span>
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
              onClick={handleBulkUpdate}
              disabled={!hasChanges || isUpdating || updateSuccess}
              className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isUpdating ? 'Updating...' : `Update ${selectedItems.length} Items`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}