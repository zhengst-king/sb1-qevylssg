// src/components/CollectionTypeManager.tsx
import React from 'react';
import { 
  Package, 
  Heart, 
  DollarSign, 
  UserCheck, 
  AlertTriangle,
  Grid3X3 
} from 'lucide-react';
import type { CollectionType } from '../lib/supabase';

interface CollectionTypeManagerProps {
  activeType: CollectionType | 'all';
  onTypeChange: (type: CollectionType | 'all') => void;
  stats: {
    owned: number;
    wishlist: number;
    for_sale: number;
    loaned_out: number;
    missing: number;
    total: number;
  };
}

export function CollectionTypeManager({
  activeType,
  onTypeChange,
  stats
}: CollectionTypeManagerProps) {
  
  const collectionTypes = [
    {
      id: 'all' as const,
      label: 'All Items',
      icon: Grid3X3,
      count: stats.total,
      color: 'slate',
      description: 'View all collection items'
    },
    {
      id: 'owned' as const,
      label: 'My Collection',
      icon: Package,
      count: stats.owned,
      color: 'blue',
      description: 'Items you own'
    },
    {
      id: 'wishlist' as const,
      label: 'Wishlist',
      icon: Heart,
      count: stats.wishlist,
      color: 'red',
      description: 'Items you want to buy'
    },
    {
      id: 'for_sale' as const,
      label: 'For Sale',
      icon: DollarSign,
      count: stats.for_sale,
      color: 'green',
      description: 'Items you\'re selling'
    },
    {
      id: 'loaned_out' as const,
      label: 'Loaned Out',
      icon: UserCheck,
      count: stats.loaned_out,
      color: 'orange',
      description: 'Items loaned to others'
    },
    {
      id: 'missing' as const,
      label: 'Missing',
      icon: AlertTriangle,
      count: stats.missing,
      color: 'red',
      description: 'Items that are lost or missing'
    }
  ];

  const colorClasses = {
    slate: {
      active: 'bg-slate-600 text-white border-slate-600',
      inactive: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
    },
    blue: {
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
    },
    red: {
      active: 'bg-red-600 text-white border-red-600',
      inactive: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
    },
    green: {
      active: 'bg-green-600 text-white border-green-600',
      inactive: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
    },
    orange: {
      active: 'bg-orange-600 text-white border-orange-600',
      inactive: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Collection Types</h2>
        <p className="text-sm text-slate-600">Switch between different types of items in your collection</p>
      </div>

      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:flex flex-wrap gap-2">
        {collectionTypes.map((type) => {
          const Icon = type.icon;
          const isActive = activeType === type.id;
          const colorClass = colorClasses[type.color as keyof typeof colorClasses];
          
          return (
            <button
              key={type.id}
              onClick={() => onTypeChange(type.id)}
              className={`
                flex items-center space-x-2 px-4 py-3 rounded-lg border transition-all duration-200
                ${isActive ? colorClass.active : colorClass.inactive}
              `}
              title={type.description}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{type.label}</span>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/80 text-slate-600'
                }
              `}>
                {type.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: Dropdown */}
      <div className="md:hidden">
        <label htmlFor="collection-type" className="block text-sm font-medium text-slate-700 mb-2">
          Collection Type
        </label>
        <select
          id="collection-type"
          value={activeType}
          onChange={(e) => onTypeChange(e.target.value as CollectionType | 'all')}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {collectionTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label} ({type.count})
            </option>
          ))}
        </select>
      </div>

      {/* Active type info */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center space-x-2">
          {(() => {
            const activeTypeData = collectionTypes.find(t => t.id === activeType);
            if (!activeTypeData) return null;
            const Icon = activeTypeData.icon;
            return (
              <>
                <Icon className="h-4 w-4 text-slate-600" />
                <span className="text-sm text-slate-600">
                  <strong>{activeTypeData.label}:</strong> {activeTypeData.description}
                </span>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}