import React from 'react';
import { X, Star, Calendar, DollarSign, MapPin, ExternalLink, Edit, Trash2 } from 'lucide-react';
import type { PhysicalMediaCollection } from '../lib/supabase';
import { useTechnicalSpecs } from '../hooks/useTechnicalSpecs';
import { TechnicalSpecsDisplay } from './TechnicalSpecsDisplay';
import { TechnicalSpecsRequest } from './TechnicalSpecsRequest';

interface CollectionItemDetailModalProps {
  item: PhysicalMediaCollection;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: PhysicalMediaCollection) => void;
  onDelete?: (id: string) => void;
}

export function CollectionItemDetailModal({ 
  item, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: CollectionItemDetailModalProps) {
  const { specs, hasSpecs } = useTechnicalSpecs(
    item.title, 
    item.year, 
    item.format,
    item.id
  );

  if (!isOpen) return null;

  const formatBadgeColor = {
    'DVD': 'bg-red-100 text-red-800',
    'Blu-ray': 'bg-blue-100 text-blue-800',
    '4K UHD': 'bg-purple-100 text-purple-800',
    '3D Blu-ray': 'bg-green-100 text-green-800',
  };

  const conditionColor = {
    'New': 'text-green-600',
    'Like New': 'text-green-500',
    'Good': 'text-yellow-600',
    'Fair': 'text-orange-600',
    'Poor': 'text-red-600',
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to remove "${item.title}" from your collection?`)) {
      onDelete?.(item.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{item.title}</h2>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-slate-600">{item.year}</span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${formatBadgeColor[item.format]}`}>
                  {item.format}
                </span>
                <span className={`text-sm font-medium ${conditionColor[item.condition]}`}>
                  {item.condition}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Edit className="h-5 w-5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
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

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Poster and Basic Info */}
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
                    <span>No Poster Available</span>
                  </div>
                )}
              </div>

              {/* Personal Rating */}
              {item.personal_rating && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-medium">Your Rating</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {item.personal_rating}/10
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Details and Specs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Movie Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.director && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Director</label>
                    <p className="text-slate-900">{item.director}</p>
                  </div>
                )}
                {item.genre && (
                  <div>
                    <label className="text-sm font-medium text-slate-500">Genre</label>
                    <p className="text-slate-900">{item.genre}</p>
                  </div>
                )}
              </div>

              {/* Purchase Information */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-medium text-slate-900 mb-3">Purchase Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {item.purchase_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-slate-500">Date</div>
                        <div className="font-medium">{new Date(item.purchase_date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                  {item.purchase_price && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-slate-500">Price</div>
                        <div className="font-medium">${item.purchase_price.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                  {item.purchase_location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-slate-500">Location</div>
                        <div className="font-medium">{item.purchase_location}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Specifications */}
              {hasSpecs && specs ? (
                <TechnicalSpecsDisplay specs={specs} />
              ) : (
                <TechnicalSpecsRequest
                  title={item.title}
                  year={item.year}
                  discFormat={item.format}
                  collectionItemId={item.id}
                />
              )}

              {/* Notes */}
              {item.notes && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-900 mb-2">Notes</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}

              {/* External Links */}
              <div className="flex flex-wrap gap-3">
                {item.imdb_id && (
                  <a>
                    href={`https://www.imdb.com/title/${item.imdb_id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    <span>View on IMDb</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {specs?.bluray_com_url && (
                  <a>
                    href={specs.bluray_com_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <span>View on Blu-ray.com</span>
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