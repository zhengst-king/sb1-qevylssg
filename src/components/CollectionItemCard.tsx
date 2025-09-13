// src/components/CollectionItemCard.tsx - COMPLETE WITH COLLECTION TYPE FEATURES
import React, { useState, useEffect } from 'react';
import {
  Calendar,
  DollarSign,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Package,
  Heart,
  UserCheck,
  Disc,
  Award,
  Star,
  Sparkles,
  Volume2
} from 'lucide-react';
import { CollectionItemDetailModal } from './CollectionItemDetailModal';
import { EditCollectionItemModal } from './EditCollectionItemModal';
import { CollectionStatusBadge, CollectionTypeActions } from './CollectionStatusBadge';
import type { 
  PhysicalMediaCollection, 
  BlurayTechnicalSpecs,
  CollectionType 
} from '../lib/supabase';

interface CollectionItemCardProps {
  item: PhysicalMediaCollection & {
    technical_specs?: BlurayTechnicalSpecs;
  };
  onUpdate?: () => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: (item: PhysicalMediaCollection) => void;
  onMoveToType?: (newType: CollectionType) => void;  // NEW: Collection type actions
}

// Inline StarRating component (since ./StarRating doesn't exist as separate file)
interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showRating?: boolean;
  variant?: 'default' | 'imdb' | 'personal';
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxRating = 10, 
  size = 'sm', 
  showRating = false,
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };
  
  const starSize = sizeClasses[size];
  const normalizedRating = variant === 'imdb' ? (rating / 2) : (rating / 2); // Convert 10-scale to 5-scale
  
  const bgColors = {
    default: 'bg-black bg-opacity-75',
    imdb: 'bg-yellow-600',
    personal: 'bg-blue-600'
  };

  return (
    <div className={`${bgColors[variant]} text-white px-2 py-1 rounded-full flex items-center space-x-1`}>
      <div className="flex items-center">
        {[...Array(Math.floor(normalizedRating))].map((_, i) => (
          <Star key={i} className={`${starSize} fill-current`} />
        ))}
        {normalizedRating % 1 !== 0 && (
          <Star className={`${starSize} fill-current opacity-50`} />
        )}
      </div>
      {showRating && (
        <span className="text-xs font-medium">
          {variant === 'imdb' ? `${rating}/10` : `${rating}/10`}
        </span>
      )}
    </div>
  );
};

// Inline FormatBadge component (since ./FormatBadge doesn't exist as separate file)
interface FormatBadgeProps {
  format: string;
  specs?: BlurayTechnicalSpecs;
}

const FormatBadge: React.FC<FormatBadgeProps> = ({ format, specs }) => {
  const formatBadgeColor = {
    'DVD': 'bg-red-100 text-red-800 border-red-200',
    'Blu-ray': 'bg-blue-100 text-blue-800 border-blue-200',
    '4K UHD': 'bg-purple-100 text-purple-800 border-purple-200',
    '3D Blu-ray': 'bg-green-100 text-green-800 border-green-200'
  };

  // Always show at least the main format badge
  return (
    <div className="flex flex-wrap gap-1">
      {/* Main Format Badge - ALWAYS VISIBLE */}
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${formatBadgeColor[format as keyof typeof formatBadgeColor] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
        {format}
      </span>
      
      {/* Video Quality Badges */}
      {specs?.video_resolution && (
        <span className="px-2 py-1 text-xs font-medium bg-slate-700 text-white rounded-full">
          {specs.video_resolution}
        </span>
      )}
      
      {/* HDR Badges */}
      {specs?.hdr_format && specs.hdr_format.length > 0 && (
        <span className="px-2 py-1 text-xs font-medium bg-orange-500 text-white rounded-full flex items-center">
          <Sparkles className="h-2 w-2 mr-1" />
          {specs.hdr_format[0]}
        </span>
      )}
    </div>
  );
};

export const CollectionItemCard: React.FC<CollectionItemCardProps> = ({
  item,
  onUpdate,
  onDelete,
  onEdit,
  isSelected = false,
  onSelect,
  onMoveToType
}) => {
  // Existing state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // NEW: Collection type features state
  const [showTypeActions, setShowTypeActions] = useState(false);

  // Get the collection type with fallback to 'owned'
  const collectionType = (item.collection_type || 'owned') as CollectionType;

  // Technical specs data
  const specs = item.technical_specs;
  const hasSpecs = Boolean(specs);

  // NEW: Collection Type Actions Handler
  const handleMoveToType = async (newType: CollectionType) => {
    if (onMoveToType) {
      await onMoveToType(newType);
      setShowTypeActions(false);
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${item.title}" from your collection?`);
    if (confirmed) {
      setIsDeleting(true);
      try {
        await onDelete(item.id);
      } catch (error) {
        console.error('Error deleting item:', error);
        setIsDeleting(false);
      }
    }
  };

  // NEW: Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTypeActions) {
        setShowTypeActions(false);
      }
    };

    if (showTypeActions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showTypeActions]);

  return (
    <>
      <div
        className={`group relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-slate-200'
        }`}
        onClick={() => setShowDetailModal(true)}
      >
        {/* Poster Image */}
        <div className="aspect-[2/3] relative bg-slate-100">
          {item.poster_url ? (
            <img
              src={item.poster_url}
              alt={`${item.title} poster`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Package className="h-12 w-12" />
            </div>
          )}

          {/* NEW: Enhanced Top Badges Row */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <div className="flex flex-col space-y-1">
              <FormatBadge format={item.format} specs={specs} />
              {/* Collection Type Badge - Only show for non-owned items */}
              {collectionType !== 'owned' && (
                <CollectionStatusBadge 
                  type={collectionType}
                  size="sm"
                  showIcon={true}
                  showLabel={true}
                />
              )}
            </div>
            
            {/* IMDB Rating - moved to right side */}
            {item.imdb_score && (
              <StarRating 
                rating={item.imdb_score} 
                variant="imdb" 
                size="sm"
                showRating={false}
              />
            )}
          </div>

          {/* Selection Checkbox */}
          {onSelect && (
            <div className="absolute top-2 left-2">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(e.target.checked);
                }}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>

          {/* NEW: Enhanced Action Buttons */}
          <div className="absolute bottom-2 right-2 flex space-x-1 z-10">
            {/* Collection Type Actions Button */}
            {onMoveToType && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowTypeActions(!showTypeActions);
                }}
                className={`bg-black bg-opacity-75 text-white p-1.5 rounded-full hover:bg-opacity-90 transition-opacity ${
                  showTypeActions ? 'bg-blue-600 bg-opacity-90' : ''
                }`}
                title="Change collection type"
              >
                <Package className="h-3 w-3" />
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowEditModal(true);
              }}
              className="bg-black bg-opacity-75 text-white p-1.5 rounded-full hover:bg-opacity-90 transition-opacity"
            >
              <Edit className="h-3 w-3" />
            </button>

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDelete();
                }}
                className="bg-black bg-opacity-75 text-white p-1.5 rounded-full hover:bg-opacity-90 transition-opacity"
                disabled={isDeleting}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* NEW: Collection Type Actions Dropdown */}
          {showTypeActions && onMoveToType && (
            <div className="absolute bottom-12 right-2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-20 min-w-48">
              <div className="text-xs font-medium text-slate-600 mb-2 px-2">
                Move to:
              </div>
              <CollectionTypeActions
                currentType={collectionType}
                onTypeChange={handleMoveToType}
                itemTitle={item.title}
              />
            </div>
          )}
        </div>

        {/* Movie Details */}
        <div className="p-4">
          {/* Title and Year */}
          <div className="mb-2">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">
              {item.title}
            </h3>
            {item.release_year && (
              <p className="text-xs text-slate-600">{item.release_year}</p>
            )}
          </div>

          {/* Movie Rating */}
          {item.rating && (
            <div className="mb-2">
              <StarRating 
                rating={item.rating} 
                size="sm" 
                showRating={true}
                variant="default"
              />
            </div>
          )}

          {/* NEW: Enhanced Purchase Info with Collection Type Specific Details */}
          <div className="space-y-1 text-xs text-slate-600">
            {/* Collection Type Specific Info */}
            {collectionType === 'wishlist' && (
              <div className="flex items-center space-x-1 text-red-600">
                <Heart className="h-3 w-3" />
                <span>On wishlist</span>
                {item.purchase_price && <span>• Target: ${item.purchase_price.toFixed(2)}</span>}
              </div>
            )}
            
            {collectionType === 'for_sale' && (
              <div className="flex items-center space-x-1 text-green-600">
                <DollarSign className="h-3 w-3" />
                <span>For sale</span>
                {item.purchase_price && <span>• ${item.purchase_price.toFixed(2)}</span>}
              </div>
            )}
            
            {collectionType === 'loaned_out' && (
              <div className="flex items-center space-x-1 text-orange-600">
                <UserCheck className="h-3 w-3" />
                <span>Loaned out</span>
                {item.purchase_location && <span>• to {item.purchase_location}</span>}
              </div>
            )}
            
            {/* Regular purchase info for owned items */}
            {collectionType === 'owned' && (
              <div className="grid grid-cols-1 gap-1">
                {item.purchase_date && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>{new Date(item.purchase_date).toLocaleDateString()}</span>
                  </div>
                )}
                {item.purchase_price && (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-3 w-3 text-slate-400" />
                    <span>${item.purchase_price.toFixed(2)}</span>
                  </div>
                )}
                {item.purchase_location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="truncate">{item.purchase_location}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Technical Specs Preview */}
          {hasSpecs && specs && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-xs text-slate-600">
                <div className="flex items-center space-x-2">
                  <Disc className="h-3 w-3" />
                  <span>Enhanced specs available</span>
                </div>
              </div>
            </div>
          )}

          {/* Awards/Special Recognition */}
          {item.awards && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-1 text-xs text-amber-600">
                <Award className="h-3 w-3" />
                <span className="truncate">{item.awards}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <CollectionItemDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        item={item}
        onUpdate={onUpdate}
      />

      {/* Edit Modal */}
      <EditCollectionItemModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        item={item}
        onUpdate={() => {
          onUpdate?.();
          setShowEditModal(false);
        }}
      />
    </>
  );
};