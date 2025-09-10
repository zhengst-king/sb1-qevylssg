import React, { useState } from 'react';
import { Star, Calendar, DollarSign, MapPin, Edit, Trash2, ExternalLink } from 'lucide-react';
import type { PhysicalMediaCollection } from '../lib/supabase';
import { useTechnicalSpecs } from '../hooks/useTechnicalSpecs';
import { TechnicalSpecsDisplay } from './TechnicalSpecsDisplay';
import { TechnicalSpecsRequest } from './TechnicalSpecsRequest';
import { CollectionItemDetailModal } from './CollectionItemDetailModal';

interface CollectionItemCardProps {
  item: PhysicalMediaCollection;
  onUpdate: () => void;
  onEdit?: (item: PhysicalMediaCollection) => void;
  onDelete?: (id: string) => void;
}

export function CollectionItemCard({ item, onUpdate, onEdit, onDelete }: CollectionItemCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { specs, hasSpecs } = useTechnicalSpecs(item.title, item.year, item.format, item.id);

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
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
        {/* Movie Poster & Basic Info */}
        <div 
          className="aspect-[2/3] relative bg-slate-100 cursor-pointer"
          onClick={() => setShowDetailModal(true)}
        >
          {item.poster_url ? (
            <img
              src={item.poster_url}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <span className="text-sm">No Poster</span>
            </div>
          )}

          {/* Format Badge */}
          <div className="absolute top-2 left-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${formatBadgeColor[item.format]}`}>
              {item.format}
            </span>
          </div>

          {/* Personal Rating */}
          {item.personal_rating && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full flex items-center space-x-1">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs font-medium">{item.personal_rating}/10</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="absolute bottom-2 right-2 flex space-x-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="bg-black bg-opacity-75 text-white p-1.5 rounded-full hover:bg-opacity-90 transition-opacity"
              >
                <Edit className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="bg-black bg-opacity-75 text-white p-1.5 rounded-full hover:bg-opacity-90 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity flex items-center justify-center">
            <span className="text-white opacity-0 hover:opacity-100 transition-opacity font-medium">
              View Details
            </span>
          </div>
        </div>

        {/* Movie Details */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight">
              {item.title}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-500">
                {item.year}
                {item.director && ` • ${item.director.split(',')[0]}`}
              </span>
              <span className={`text-xs font-medium ${conditionColor[item.condition]}`}>
                {item.condition}
              </span>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="space-y-1 text-xs text-slate-600">
            {item.purchase_date && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(item.purchase_date).toLocaleDateString()}</span>
              </div>
            )}
            {item.purchase_price && (
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3" />
                <span>${item.purchase_price.toFixed(2)}</span>
              </div>
            )}
            {item.purchase_location && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{item.purchase_location}</span>
              </div>
            )}
          </div>

          {/* Technical Specs Section */}
          <div className="pt-2 border-t border-slate-100">
            {hasSpecs && specs ? (
              <TechnicalSpecsDisplay specs={specs} compact />
            ) : (
              <TechnicalSpecsRequest
                title={item.title}
                year={item.year}
                discFormat={item.format}
                collectionItemId={item.id}
                compact
              />
            )}
          </div>

          {/* Notes Preview */}
          {item.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-600 line-clamp-2">
                {item.notes}
              </p>
            </div>
          )}

          {/* IMDb Link */}
          {item.imdb_id && (
            <div className="pt-2 border-t border-slate-100">
              <a>
                href={`https://www.imdb.com/title/${item.imdb_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                <span>View on IMDb</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <CollectionItemDetailModal
        item={item}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}