// src/components/ItemStatusBadge.tsx - RENAMED FROM CollectionStatusBadge
import React from 'react';
import { 
  Package, 
  Heart, 
  DollarSign, 
  UserCheck, 
  AlertTriangle 
} from 'lucide-react';
import type { CollectionType } from '../lib/supabase';

// Note: CollectionType from database is kept as-is since it refers to item status categories
interface ItemStatusBadgeProps {
  type: CollectionType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function ItemStatusBadge({
  type,
  size = 'sm',
  showIcon = true,
  showLabel = true,
  className = ''
}: ItemStatusBadgeProps) {
  
  const config = {
    owned: {
      label: 'Owned',
      icon: Package,
      colors: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    wishlist: {
      label: 'Wishlist',
      icon: Heart,
      colors: 'bg-red-100 text-red-800 border-red-200'
    },
    for_sale: {
      label: 'For Sale',
      icon: DollarSign,
      colors: 'bg-green-100 text-green-800 border-green-200'
    },
    loaned_out: {
      label: 'Loaned Out',
      icon: UserCheck,
      colors: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    missing: {
      label: 'Missing',
      icon: AlertTriangle,
      colors: 'bg-red-100 text-red-800 border-red-200'
    }
  };

  const sizeClasses = {
    sm: {
      badge: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3'
    },
    md: {
      badge: 'px-3 py-1.5 text-sm',
      icon: 'h-4 w-4'
    },
    lg: {
      badge: 'px-4 py-2 text-base',
      icon: 'h-5 w-5'
    }
  };

  const typeConfig = config[type];
  const sizeConfig = sizeClasses[size];
  const Icon = typeConfig.icon;

  // Don't show badge for 'owned' items unless explicitly requested
  if (type === 'owned' && !className.includes('force-show')) {
    return null;
  }

  return (
    <span className={`
      inline-flex items-center space-x-1 rounded-full border font-medium
      ${typeConfig.colors}
      ${sizeConfig.badge}
      ${className}
    `}>
      {showIcon && <Icon className={sizeConfig.icon} />}
      {showLabel && <span>{typeConfig.label}</span>}
    </span>
  );
}

// Item Status Actions Component
interface ItemStatusActionsProps {
  currentType: CollectionType;
  onTypeChange: (newType: CollectionType) => void;
  itemTitle?: string;
}

export function ItemStatusActions({
  currentType,
  onTypeChange,
  itemTitle
}: ItemStatusActionsProps) {
  
  // All item status actions
  const allActions = [
    { 
      type: 'owned' as const, 
      label: 'Mark as Owned', 
      icon: Package,
      colors: 'bg-blue-600 hover:bg-blue-700 text-white',
      description: 'Move to library (owned items)'
    },
    { 
      type: 'wishlist' as const, 
      label: 'Add to Wishlist', 
      icon: Heart,
      colors: 'bg-red-600 hover:bg-red-700 text-white',
      description: 'Want to buy this item'
    },
    { 
      type: 'for_sale' as const, 
      label: 'Mark for Sale', 
      icon: DollarSign,
      colors: 'bg-green-600 hover:bg-green-700 text-white',
      description: 'Put this item up for sale'
    },
    { 
      type: 'loaned_out' as const, 
      label: 'Mark as Loaned Out', 
      icon: UserCheck,
      colors: 'bg-orange-600 hover:bg-orange-700 text-white',
      description: 'Lent to someone else'
    },
    { 
      type: 'missing' as const, 
      label: 'Mark as Missing', 
      icon: AlertTriangle,
      colors: 'bg-red-600 hover:bg-red-700 text-white',
      description: 'Cannot find this item'
    }
  ].filter(action => action.type !== currentType); // Don't show current type

  return (
    <div className="space-y-1">
      {allActions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.type}
            onClick={() => onTypeChange(action.type)}
            className={`
              w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-colors duration-200 ${action.colors}
            `}
            title={`${action.description}${itemTitle ? ` - "${itemTitle}"` : ''}`}
          >
            <Icon className="h-4 w-4" />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Legacy exports for backward compatibility during migration
// TODO: Remove these after all components are updated
export const CollectionStatusBadge = ItemStatusBadge;
export const CollectionTypeActions = ItemStatusActions;
export type CollectionStatusBadgeProps = ItemStatusBadgeProps;
export type CollectionTypeActionsProps = ItemStatusActionsProps;