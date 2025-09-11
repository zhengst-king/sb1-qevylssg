import React, { useState } from 'react';
import { 
  Star, 
  Edit, 
  Trash2, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Disc,
  Monitor,
  Volume2,
  Award,
  Sparkles,
  Eye
} from 'lucide-react';
import { CollectionItemDetailModal } from './CollectionItemDetailModal';
// import { TechnicalSpecsDisplay } from './TechnicalSpecsDisplay';
import type { PhysicalMediaCollection, BlurayTechnicalSpecs } from '../lib/supabase';

interface CollectionItemCardProps {
  item: PhysicalMediaCollection & {
    technical_specs?: BlurayTechnicalSpecs;
  };
  onUpdate?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (item: PhysicalMediaCollection) => void;
}

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'default' | 'imdb' | 'personal';
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxRating = 10, 
  size = 'sm', 
  showLabel = true,
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
      {showLabel && (
        <span className="text-xs font-medium">
          {variant === 'imdb' ? `${rating}/10` : `${rating}/10`}
        </span>
      )}
    </div>
  );
};

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

  return (
    <div className="flex flex-wrap gap-1">
      {/* Main Format Badge */}
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${formatBadgeColor[format as keyof typeof formatBadgeColor]}`}>
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

interface AudioBadgesProps {
  specs?: BlurayTechnicalSpecs;
}

const AudioBadges: React.FC<AudioBadgesProps> = ({ specs }) => {
  if (!specs?.audio_codecs || specs.audio_codecs.length === 0) return null;

  const getPremiumAudioCodecs = (codecs: string[]) => {
    const premiumCodecs = ['Dolby Atmos', 'DTS-X', 'DTS-HD MA', 'Dolby TrueHD'];
    return codecs.filter(codec => 
      premiumCodecs.some(premium => codec.includes(premium))
    ).slice(0, 2); // Show max 2 premium codecs
  };

  const premiumCodecs = getPremiumAudioCodecs(specs.audio_codecs);

  if (premiumCodecs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {premiumCodecs.map((codec, index) => (
        <span 
          key={index}
          className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded-full flex items-center"
        >
          <Volume2 className="h-2 w-2 mr-1" />
          {codec.replace(/\s*\(.*?\)\s*/g, '')} {/* Remove language info */}
        </span>
      ))}
    </div>
  );
};

export const CollectionItemCard: React.FC<CollectionItemCardProps> = ({
  item,
  onUpdate,
  onDelete,
  onEdit
}) => {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const conditionColor = {
    'New': 'text-green-600',
    'Like New': 'text-blue-600',
    'Good': 'text-yellow-600',
    'Fair': 'text-orange-600',
    'Poor': 'text-red-600'
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to remove this item from your collection?')) {
      onDelete?.(item.id);
    }
  };

  const hasSpecs = item.technical_specs;
  const specs = item.technical_specs;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-200 group">
        {/* Movie Poster & Overlay Info */}
        <div 
          className="aspect-[2/3] relative bg-slate-100 cursor-pointer overflow-hidden"
          onClick={() => setShowDetailModal(true)}
        >
          {/* Poster Image */}
          {item.poster_url ? (
            <img
              src={item.poster_url}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
              <div className="text-center">
                <Disc className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm">No Poster</span>
              </div>
            </div>
          )}

          {/* Top Badges Row */}
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
            <FormatBadge format={item.format} specs={specs} />
            
            {/* IMDB Rating */}
            {item.imdb_score && (
              <StarRating 
                rating={item.imdb_score} 
                variant="imdb" 
                size="sm"
              />
            )}
          </div>

          {/* Personal Rating */}
          {item.personal_rating && (
            <div className="absolute top-12 right-2">
              <StarRating 
                rating={item.personal_rating} 
                variant="personal" 
                size="sm"
              />
            </div>
          )}

          {/* Audio Badges */}
          {specs && (
            <div className="absolute bottom-12 left-2 right-2">
              <AudioBadges specs={specs} />
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
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center">
              <Eye className="h-4 w-4 mr-2" />
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
              <span className={`text-xs font-medium ${conditionColor[item.condition as keyof typeof conditionColor]}`}>
                {item.condition}
              </span>
            </div>
          </div>

          {/* Enhanced Purchase Info */}
          <div className="space-y-1 text-xs text-slate-600">
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
    </>
  );
};