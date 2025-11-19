// src/components/MediaLibraryItemDetailModal.tsx
import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { PhysicalMediaCollection } from '../lib/supabase';
import { MediaItemDetailsDisplay } from './MediaItemDetailsDisplay';
import { MediaItemFormInputs } from './MediaItemFormInputs';
import { supabase } from '../lib/supabase';

interface MediaLibraryItemDetailModalProps {
  item: PhysicalMediaCollection;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

export function MediaLibraryItemDetailModal({ 
  item, 
  isOpen, 
  onClose, 
  onDelete,
  onUpdate 
}: MediaLibraryItemDetailModalProps) {
  // Form state for editing
  const [collectionType, setCollectionType] = useState(item.collection_type || 'owned');
  const [format, setFormat] = useState(item.format);
  const [editionName, setEditionName] = useState(item.edition_name || '');
  const [condition, setCondition] = useState(item.condition);
  const [purchaseDate, setPurchaseDate] = useState(item.purchase_date || '');
  const [purchasePrice, setPurchasePrice] = useState(item.purchase_price?.toString() || '');
  const [purchaseLocation, setPurchaseLocation] = useState(item.purchase_location || '');
  const [personalRating, setPersonalRating] = useState(item.personal_rating?.toString() || '');
  const [notes, setNotes] = useState(item.notes || '');
  
  // Extracted specs state (will be fetched if bluray_com_url exists)
  const [extractedSpecs, setExtractedSpecs] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  
  const [saving, setSaving] = useState(false);

  // Fetch specs when modal opens if we have a bluray URL
  React.useEffect(() => {
    if (isOpen && item.bluray_com_url && !extractedSpecs) {
      fetchSpecs();
    }
  }, [isOpen, item.bluray_com_url]);

  const fetchSpecs = async () => {
    if (!item.bluray_com_url) return;
    
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-bluray-page', {
        body: { url: item.bluray_com_url }
      });
      
      if (error) throw error;
      setExtractedSpecs(data);
    } catch (error) {
      console.error('[DetailModal] Failed to fetch specs:', error);
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('physical_media_collections')
        .update({
          collection_type: collectionType,
          format: format,
          edition_name: editionName || null,
          condition: condition,
          purchase_date: purchaseDate || null,
          purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
          purchase_location: purchaseLocation || null,
          personal_rating: personalRating ? parseInt(personalRating) : null,
          notes: notes || null
        })
        .eq('id', item.id);

      if (error) throw error;
      
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('[DetailModal] Save failed:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${item.title}" from your library?`)) {
      onDelete?.(item.id);
      onClose();
    }
  };

  // Open movie/TV detail modal
  const handleOpenTitleModal = () => {
    // This will be implemented by parent component
    // For now, just open IMDb
    if (item.imdb_id) {
      window.open(`https://www.imdb.com/title/${item.imdb_id}/`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Backdrop - Click to close */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Title Row Only */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{item.title}</h2>
            {item.year && (
              <p className="text-slate-600 mt-1">{item.year}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-6">
            {/* SECTION 1: Title Poster Image - Clickable */}
            <div className="flex justify-center">
              <div 
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleOpenTitleModal}
                title="View title details"
              >
                <img
                  src={item.poster_url || '/placeholder.png'}
                  alt={item.title}
                  className="w-32 h-48 object-cover rounded-lg shadow-md border border-slate-300"
                />
              </div>
            </div>

            {/* SECTION 2: Physical Media Details (Same as Step 3 but without title) */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="space-y-6">
                {/* Top Section: Edition Cover + Form Inputs */}
                <div className="flex gap-6">
                  {/* Left: Edition Cover Image */}
                  <div className="flex-shrink-0">
                    <img 
                      src={extractedSpecs?.edition_cover_url || item.edition_cover_url || item.poster_url || '/placeholder.png'} 
                      alt={`${item.title} edition cover`}
                      className="w-32 h-48 object-cover rounded-lg shadow-md border border-slate-300"
                    />
                  </div>

                  {/* Right: Item Status + Format (from MediaItemFormInputs, inline) */}
                  <div className="flex-1">
                    <MediaItemFormInputs
                      coverImageUrl={extractedSpecs?.edition_cover_url || item.edition_cover_url || item.poster_url}
                      showCoverImage={false}
                      collectionType={collectionType as any}
                      format={format}
                      editionName={editionName}
                      condition={condition as any}
                      purchaseDate={purchaseDate}
                      purchasePrice={purchasePrice}
                      purchaseLocation={purchaseLocation}
                      personalRating={personalRating}
                      notes={notes}
                      onCollectionTypeChange={setCollectionType as any}
                      onFormatChange={(f) => setFormat(f as any)}
                      onEditionNameChange={setEditionName}
                      onConditionChange={(c) => setCondition(c as any)}
                      onPurchaseDateChange={setPurchaseDate}
                      onPurchasePriceChange={setPurchasePrice}
                      onPurchaseLocationChange={setPurchaseLocation}
                      onPersonalRatingChange={setPersonalRating}
                      onNotesChange={setNotes}
                    />
                  </div>
                </div>

                {/* Tech Specs & Ratings Display */}
                <MediaItemDetailsDisplay
                  coverUrl={extractedSpecs?.edition_cover_url || item.edition_cover_url}
                  title={item.title}
                  fallbackPosterUrl={item.poster_url}
                  extractedSpecs={extractedSpecs}
                  extracting={extracting}
                  showImage={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Save Button */}
        <div className="border-t border-slate-200 p-6 flex-shrink-0 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}