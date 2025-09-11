import React from 'react';
import { Star, Award, Heart, TrendingUp } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  maxRating?: number;
  source?: 'imdb' | 'personal' | 'metacritic' | 'rotten_tomatoes';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'filled' | 'outline' | 'minimal';
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({
  rating,
  maxRating = 10,
  source = 'personal',
  size = 'sm',
  showLabel = true,
  variant = 'filled'
}) => {
  const getRatingConfig = () => {
    switch (source) {
      case 'imdb':
        return {
          icon: Star,
          color: 'bg-yellow-500 text-white border-yellow-500',
          outlineColor: 'border-yellow-500 text-yellow-700 bg-yellow-50',
          label: `${rating}/10`,
          normalizedRating: rating / 2, // Convert to 5-star scale
          bgGradient: 'from-yellow-400 to-yellow-600'
        };
      case 'metacritic':
        return {
          icon: Award,
          color: rating >= 7 ? 'bg-green-500 text-white border-green-500' : 
                rating >= 5 ? 'bg-yellow-500 text-white border-yellow-500' : 
                'bg-red-500 text-white border-red-500',
          outlineColor: rating >= 7 ? 'border-green-500 text-green-700 bg-green-50' :
                       rating >= 5 ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                       'border-red-500 text-red-700 bg-red-50',
          label: `${Math.round(rating * 10)}`,
          normalizedRating: rating / 2,
          bgGradient: rating >= 7 ? 'from-green-400 to-green-600' :
                     rating >= 5 ? 'from-yellow-400 to-yellow-600' :
                     'from-red-400 to-red-600'
        };
      case 'rotten_tomatoes':
        return {
          icon: Heart,
          color: rating >= 6 ? 'bg-red-500 text-white border-red-500' : 'bg-green-500 text-white border-green-500',
          outlineColor: rating >= 6 ? 'border-red-500 text-red-700 bg-red-50' : 'border-green-500 text-green-700 bg-green-50',
          label: `${Math.round(rating * 10)}%`,
          normalizedRating: rating / 2,
          bgGradient: rating >= 6 ? 'from-red-400 to-red-600' : 'from-green-400 to-green-600'
        };
      case 'personal':
      default:
        return {
          icon: Star,
          color: 'bg-blue-500 text-white border-blue-500',
          outlineColor: 'border-blue-500 text-blue-700 bg-blue-50',
          label: `${rating}/10`,
          normalizedRating: rating / 2,
          bgGradient: 'from-blue-400 to-blue-600'
        };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return {
          container: 'px-1.5 py-0.5 text-xs',
          icon: 'h-2.5 w-2.5',
          spacing: 'space-x-0.5'
        };
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'h-3 w-3',
          spacing: 'space-x-1'
        };
      case 'md':
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'h-4 w-4',
          spacing: 'space-x-1.5'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'h-5 w-5',
          spacing: 'space-x-2'
        };
      default:
        return getSizeClasses();
    }
  };

  const config = getRatingConfig();
  const sizeClasses = getSizeClasses();
  const Icon = config.icon;

  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return `border ${config.outlineColor}`;
      case 'minimal':
        return `${config.outlineColor.includes('bg-') ? config.outlineColor : 'bg-slate-100 text-slate-700'} border-0`;
      case 'filled':
      default:
        return `bg-gradient-to-r ${config.bgGradient} text-white border-0`;
    }
  };

  return (
    <div className={`
      inline-flex items-center rounded-full font-medium
      ${sizeClasses.container} 
      ${sizeClasses.spacing}
      ${getVariantClasses()}
    `}>
      <Icon className={`${sizeClasses.icon} ${variant === 'filled' ? 'fill-current' : ''}`} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
};

interface StarRatingDisplayProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showValue?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = ({
  rating,
  maxRating = 10,
  size = 'sm',
  showValue = true,
  interactive = false,
  onChange
}) => {
  const normalizedRating = (rating / maxRating) * 5; // Convert to 5-star scale
  const fullStars = Math.floor(normalizedRating);
  const hasHalfStar = normalizedRating % 1 >= 0.5;
  
  const getSizeClass = () => {
    switch (size) {
      case 'xs': return 'h-3 w-3';
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-5 w-5';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'xs': return 'text-xs';
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      default: return 'text-sm';
    }
  };

  const starSize = getSizeClass();

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => {
          const isFilled = index < fullStars;
          const isHalf = index === fullStars && hasHalfStar;
          
          return (
            <Star
              key={index}
              className={`
                ${starSize}
                ${isFilled || isHalf ? 'text-yellow-400 fill-current' : 'text-slate-300'}
                ${isHalf ? 'opacity-70' : ''}
                ${interactive ? 'cursor-pointer hover:text-yellow-500 transition-colors' : ''}
              `}
              onClick={() => interactive && onChange && onChange(((index + 1) / 5) * maxRating)}
            />
          );
        })}
      </div>
      {showValue && (
        <span className={`font-medium text-slate-600 ${getTextSize()}`}>
          {rating.toFixed(1)}/{maxRating}
        </span>
      )}
    </div>
  );
};

interface MultiRatingDisplayProps {
  ratings: {
    imdb?: number;
    personal?: number;
    metacritic?: number;
    rotten_tomatoes?: number;
  };
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const MultiRatingDisplay: React.FC<MultiRatingDisplayProps> = ({
  ratings,
  layout = 'horizontal',
  size = 'sm'
}) => {
  const ratingEntries = Object.entries(ratings).filter(([_, value]) => value !== undefined && value > 0);
  
  if (ratingEntries.length === 0) return null;

  const getLayoutClasses = () => {
    switch (layout) {
      case 'vertical':
        return 'flex flex-col space-y-1';
      case 'grid':
        return 'grid grid-cols-2 gap-1';
      case 'horizontal':
      default:
        return 'flex flex-wrap gap-1';
    }
  };

  return (
    <div className={getLayoutClasses()}>
      {ratingEntries.map(([source, rating]) => (
        <RatingBadge
          key={source}
          rating={rating}
          source={source as any}
          size={size}
          variant="filled"
        />
      ))}
    </div>
  );
};

// Enhanced Collection Stats Component
interface CollectionStatsCardProps {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'slate';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export const CollectionStatsCard: React.FC<CollectionStatsCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'blue',
  trend
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    red: 'text-red-600 bg-red-50 border-red-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    purple: 'text-purple-600 bg-purple-50 border-purple-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    slate: 'text-slate-600 bg-slate-50 border-slate-200'
  };

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border transition-all hover:shadow-md ${colorClasses[color].split(' ')[2]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {Icon && (
            <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[1]}`}>
              <Icon className={`h-4 w-4 ${colorClasses[color].split(' ')[0]}`} />
            </div>
          )}
          <div>
            <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
              {value}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
              {label}
            </div>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-3 w-3 mr-1 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
            {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
};