// src/components/MediaLibraryItemDetailModal.tsx - FIXED VERSION THAT ALWAYS SHOWS ALL FIELDS
import React, { useEffect } from 'react';
import { 
  X, 
  Star, 
  Calendar, 
  DollarSign, 
  MapPin, 
  ExternalLink, 
  Edit, 
  Trash2,
  Package,
  Heart,
  UserCheck,
  Disc,
  Loader,
  Edit3
} from 'lucide-react';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';
import { useTechnicalSpecs } from '../hooks/useTechnicalSpecs';
import { TechnicalSpecsDisplay } from './TechnicalSpecsDisplay';

interface MediaLibraryItemDetailModalProps {
  item: PhysicalMediaCollection;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: PhysicalMediaCollection) => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

export function MediaLibraryItemDetailModal({ 
  item, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onUpdate 
}: MediaLibraryItemDetailModalProps) {
  const { 
    specs, 
    hasSpecs, 
    loading, 
    requestSpecs, 
    isProcessing, 
    isPending,
    refreshSpecs 
  } = useTechnicalSpecs(
    item.title, 
    item.year, 
    item.format,
    item.id
  );

  // Automatically request specs if we have a bluray URL but no specs yet
  useEffect(() => {
    if (isOpen && item.bluray_com_url && !hasSpecs && !loading && !isProcessing && !isPending) {
      console.log('[DetailModal] Auto-requesting specs for:', item.title);
      requestSpecs(1); // High priority since user is viewing
    }
  }, [isOpen, item.bluray_com_url, hasSpecs, loading, isProcessing, isPending]);

  if (!isOpen) return null;

  const formatBadgeColor = {
    'DVD': 'bg-red-100 text-red-800 border-red-200',
    'Blu-ray': 'bg-blue-100 text-blue-800 border-blue-200',
    '4K UHD': 'bg-purple-100 text-purple-800 border-purple-200',
    '3D Blu-ray': 'bg-green-100 text-green-800 border-green-200',
  };

  const conditionColor = {
    'New': 'text-green-600',
    'Like New': 'text-green-500',
    'Good': 'text-yellow-600',
    'Fair': 'text-orange-600',
    'Poor': 'text-red-600',
  };

  const collectionTypeInfo = {
    'owned': { label: 'Owned', icon: Package, color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'wishlist': { label: 'Wishlist', icon: Heart, color: 'bg-red-100 text-red-800 border-red-200' },
    'for_sale': { label: 'For Sale', icon: DollarSign, color: 'bg-green-100 text-green-800 border-green-200' },
    'loaned_out': { label: 'Loaned Out', icon: UserCheck, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  };

  const currentType = collectionTypeInfo[item.collection_type || 'owned'];
  const TypeIcon = currentType.icon;

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${item.title}" from your library?`)) {
      onDelete?.(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Backdrop - Click to close */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal - WIDENED TO MATCH AddToLibraryModal */}
      <div className="relative bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{item.title}</h2>
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-slate-600">{item.year}</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${formatBadgeColor[item.format]}`}>
                  {item.format}
                </span>
                {item.edition_name && (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    {item.edition_name}
                  </span>
                )}
                <span className={`px-3 py-1 text-sm font-medium rounded-full border flex items-center gap-1 ${currentType.color}`}>
                  <TypeIcon className="h-3 w-3" />
                  {currentType.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Edit"
              >
                <Edit className="h-5 w-5" />
              </button>
            )}
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
        <div className="overflow-y-auto flex-1">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Poster and Personal Rating */}
            <div className="space-y-4">
              {/* Poster */}
              <div className="aspect-[2/3] bg-slate-100 rounded-lg overflow-hidden">
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Disc className="h-16 w-16" />
                  </div>
                )}
              </div>

              {/* Personal Rating - ALWAYS SHOWN */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="font-semibold text-slate-900">Your Rating</span>
                  </div>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Edit rating"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {item.personal_rating ? (
                  <div className="text-3xl font-bold text-slate-900">
                    {item.personal_rating}/10
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm italic">
                    Not rated yet
                  </div>
                )}
              </div>

              {/* Condition Badge */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="text-sm font-medium text-slate-500 mb-1">Condition</div>
                <div className={`text-lg font-semibold ${conditionColor[item.condition]}`}>
                  {item.condition}
                </div>
              </div>
            </div>

            {/* Right Column - Details and Specs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Movie Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.director && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <label className="text-sm font-medium text-slate-500">Director</label>
                    <p className="text-slate-900 font-medium mt-1">{item.director}</p>
                  </div>
                )}
                {item.genre && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <label className="text-sm font-medium text-slate-500">Genre</label>
                    <p className="text-slate-900 font-medium mt-1">{item.genre}</p>
                  </div>
                )}
              </div>

              {/* Collection Details - ALWAYS SHOWN WITH ALL FIELDS */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    Collection Details
                  </h3>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit Details
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {/* Purchase Date - ALWAYS SHOWN */}
                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-slate-500">
                        {item.collection_type === 'wishlist' ? 'Target Date' : 'Purchase Date'}
                      </div>
                      {item.purchase_date ? (
                        <div className="font-medium text-slate-900">
                          {new Date(item.purchase_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Not set</div>
                      )}
                    </div>
                  </div>

                  {/* Purchase Price - ALWAYS SHOWN */}
                  <div className="flex items-start space-x-2">
                    <DollarSign className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-slate-500">
                        {item.collection_type === 'for_sale' 
                          ? 'Asking Price' 
                          : item.collection_type === 'wishlist' 
                          ? 'Target Price' 
                          : 'Purchase Price'
                        }
                      </div>
                      {item.purchase_price ? (
                        <div className="font-medium text-slate-900">
                          ${item.purchase_price.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Not set</div>
                      )}
                    </div>
                  </div>

                  {/* Purchase Location - ALWAYS SHOWN */}
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-slate-500">
                        {item.collection_type === 'loaned_out' 
                          ? 'Loaned To' 
                          : item.collection_type === 'for_sale' 
                          ? 'Selling Platform' 
                          : 'Purchase Location'
                        }
                      </div>
                      {item.purchase_location ? (
                        <div className="font-medium text-slate-900">
                          {item.purchase_location}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Not set</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Show edit hint if any fields are missing */}
                {(!item.purchase_date || !item.purchase_price || !item.purchase_location) && onEdit && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Edit3 className="h-4 w-4" />
                      <span>Click "Edit Details" to add missing information</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes - ALWAYS SHOWN */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">Notes</h3>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit3 className="h-4 w-4" />
                      {item.notes ? 'Edit' : 'Add Notes'}
                    </button>
                  )}
                </div>
                {item.notes ? (
                  <p className="text-slate-700 whitespace-pre-wrap">{item.notes}</p>
                ) : (
                  <p className="text-slate-400 italic text-sm">No notes added yet</p>
                )}
              </div>

              {/* Technical Specifications */}
              {hasSpecs && specs ? (
                <TechnicalSpecsDisplay specs={specs} />
              ) : loading ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader className="h-5 w-5 text-blue-600 animate-spin" />
                    <div>
                      <div className="font-medium text-blue-900">Checking for specifications...</div>
                      <div className="text-sm text-blue-700 mt-1">This will only take a moment</div>
                    </div>
                  </div>
                </div>
              ) : (isProcessing || isPending) ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader className="h-5 w-5 text-yellow-600 animate-spin" />
                    <div>
                      <div className="font-medium text-yellow-900">
                        {isProcessing ? 'Scraping specifications...' : 'Queued for scraping...'}
                      </div>
                      <div className="text-sm text-yellow-700 mt-1">
                        This may take 20-30 seconds. Refresh the page to check status.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={refreshSpecs}
                    className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
                  >
                    Check Status
                  </button>
                </div>
              ) : item.bluray_com_url ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-sm text-slate-600">
                    Specifications will be loaded automatically in the background.
                  </div>
                </div>
              ) : null}

              {/* External Links */}
              <div className="flex flex-wrap gap-3">
                {item.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${item.imdb_id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors border border-yellow-200"
                  >
                    <span className="font-medium">View on IMDb</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {item.bluray_com_url && (
                  <a
                    href={item.bluray_com_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
                  >
                    <span className="font-medium">View on Blu-ray.com</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}