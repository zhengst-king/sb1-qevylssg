import React from 'react';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Star,
  Package,
  Heart,
  UserCheck
} from 'lucide-react';
import type { CollectionType } from '../lib/supabase';

interface MediaItemFormInputsProps {
  // Cover image (optional)
  coverImageUrl?: string;
  showCoverImage?: boolean;
  
  // Form values
  collectionType: CollectionType;
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  editionName: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  purchaseDate: string;
  purchasePrice: string;
  purchaseLocation: string;
  personalRating: string;
  notes: string;
  
  // Change handlers
  onCollectionTypeChange: (type: CollectionType) => void;
  onFormatChange: (format: string) => void;
  onEditionNameChange: (name: string) => void;
  onConditionChange: (condition: string) => void;
  onPurchaseDateChange: (date: string) => void;
  onPurchasePriceChange: (price: string) => void;
  onPurchaseLocationChange: (location: string) => void;
  onPersonalRatingChange: (rating: string) => void;
  onNotesChange: (notes: string) => void;
}

export function MediaItemFormInputs({
  coverImageUrl,
  showCoverImage = true,
  collectionType,
  format,
  editionName,
  condition,
  purchaseDate,
  purchasePrice,
  purchaseLocation,
  personalRating,
  notes,
  onCollectionTypeChange,
  onFormatChange,
  onEditionNameChange,
  onConditionChange,
  onPurchaseDateChange,
  onPurchasePriceChange,
  onPurchaseLocationChange,
  onPersonalRatingChange,
  onNotesChange
}: MediaItemFormInputsProps) {
  
  const collectionTypeOptions = [
    { 
      id: 'owned', 
      label: 'Owned',
      icon: Package,
      color: 'blue' as const
    },
    { 
      id: 'wishlist', 
      label: 'Wishlist',
      icon: Heart,
      color: 'red' as const
    },
    { 
      id: 'for_sale', 
      label: 'For Sale',
      icon: DollarSign,
      color: 'green' as const
    },
    { 
      id: 'loaned_out', 
      label: 'Loaned Out',
      icon: UserCheck,
      color: 'orange' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Section: Image + Item Status + Format */}
      <div className="flex gap-6">
        {/* Left: Edition Cover Image (optional) */}
        {showCoverImage && coverImageUrl && (
          <div className="flex-shrink-0">
            <img 
              src={coverImageUrl} 
              alt="Cover"
              className="w-32 h-48 object-cover rounded-lg shadow-md border border-slate-300"
            />
          </div>
        )}

        {/* Right: Item Status + Format */}
        <div className="flex-1 space-y-6">
          {/* Item Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Item Status
            </label>
            <div className="flex flex-wrap gap-2">
              {collectionTypeOptions.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => onCollectionTypeChange(type.id as CollectionType)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                      collectionType === type.id 
                        ? 'border-blue-500 bg-blue-50 text-blue-900' 
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format and Edition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Format *
              </label>
              <select
                value={format}
                onChange={(e) => onFormatChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="DVD">DVD</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="4K UHD">4K UHD</option>
                <option value="3D Blu-ray">3D Blu-ray</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Edition Name
              </label>
              <input
                type="text"
                value={editionName}
                onChange={(e) => onEditionNameChange(e.target.value)}
                placeholder="e.g., Steelbook, Collector's Edition"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Condition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Condition</label>
          <select
            value={condition}
            onChange={(e) => onConditionChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            {collectionType === 'wishlist' ? 'Target Date' : 'Purchase Date'}
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => onPurchaseDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <DollarSign className="inline h-4 w-4 mr-1" />
            {collectionType === 'for_sale' 
              ? 'Asking Price' 
              : collectionType === 'wishlist' 
              ? 'Target Price' 
              : 'Purchase Price'
            }
          </label>
          <input
            type="number"
            step="0.01"
            value={purchasePrice}
            onChange={(e) => onPurchasePriceChange(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <MapPin className="inline h-4 w-4 mr-1" />
            {collectionType === 'loaned_out' 
              ? 'Loaned To' 
              : collectionType === 'for_sale' 
              ? 'Selling Platform' 
              : 'Purchase Location'
            }
          </label>
          <input
            type="text"
            value={purchaseLocation}
            onChange={(e) => onPurchaseLocationChange(e.target.value)}
            placeholder={
              collectionType === 'loaned_out' 
                ? 'Friend\'s name' 
                : collectionType === 'for_sale' 
                ? 'eBay, Facebook, etc.' 
                : 'Best Buy, Amazon, etc.'
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Personal Rating */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            <Star className="inline h-4 w-4 mr-1" />
            Personal Rating
          </label>
          <select
            value={personalRating}
            onChange={(e) => onPersonalRatingChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No rating</option>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => (
              <option key={rating} value={rating}>{rating}/10</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Special edition details, condition notes, etc."
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}