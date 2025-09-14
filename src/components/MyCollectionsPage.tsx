// src/components/MyCollectionsPage.tsx - COMPLETE WITH FORMAT DISTRIBUTION TABS
import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  SortAsc, 
  Package, 
  Disc3,
  FileVideo,
  Monitor,
  Sparkles,
  Volume2,
  Award,
  Eye,
  BarChart3,
  DollarSign,
  Heart,
  UserCheck,
  AlertTriangle,
  Download,
  Grid3X3
} from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { CollectionItemCard } from './CollectionItemCard';
import { AddToCollectionModal } from './AddToCollectionModal';
import { CollectionToolbar } from './CollectionToolbar';
import { csvExportService } from '../services/csvExportService';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';

// Enhanced Collection Stats Card
interface CollectionStatsCardProps {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'slate';
  subtitle?: string;
  onClick?: () => void;
}

const CollectionStatsCard: React.FC<CollectionStatsCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'blue',
  subtitle,
  onClick
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
    red: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100',
    green: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100',
    orange: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'
  };

  return (
    <div 
      className={`bg-white rounded-xl p-4 shadow-sm border transition-all cursor-pointer ${colorClasses[color]} ${
        onClick ? 'hover:shadow-md' : ''
      }`}
      onClick={onClick}
    >
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
            {subtitle && (
              <div className="text-xs text-slate-400 mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Collection Type Filter Tabs
interface CollectionTypeTabsProps {
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

const CollectionTypeTabs: React.FC<CollectionTypeTabsProps> = ({
  activeType,
  onTypeChange,
  stats
}) => {
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
    <div className="flex flex-wrap gap-2 mb-6">
      {collectionTypes.map((type) => {
        const Icon = type.icon;
        const isActive = activeType === type.id;
        const colors = colorClasses[type.color as keyof typeof colorClasses];
        
        return (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            className={`
              inline-flex items-center space-x-2 px-4 py-2 rounded-lg border font-medium
              transition-all duration-200 ${isActive ? colors.active : colors.inactive}
            `}
            title={type.description}
          >
            <Icon className="h-4 w-4" />
            <span>{type.label}</span>
            <span className={`
              inline-flex items-center justify-center w-6 h-6 text-xs rounded-full font-bold
              ${isActive ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-200 text-slate-600'}
            `}>
              {type.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// FORMAT DISTRIBUTION FILTER TABS - Like Movie Watchlist Status Labels
interface FormatDistributionTabsProps {
  collections: PhysicalMediaCollection[];
  activeFormat: string;
  onFormatChange: (format: 'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray') => void;
}

const FormatDistributionTabs: React.FC<FormatDistributionTabsProps> = ({
  collections,
  activeFormat,
  onFormatChange
}) => {
  const formatStats = useMemo(() => {
    const stats = collections.reduce((acc, item) => {
      acc[item.format] = (acc[item.format] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: stats.total || 0,
      'DVD': stats['DVD'] || 0,
      'Blu-ray': stats['Blu-ray'] || 0,
      '4K UHD': stats['4K UHD'] || 0,
      '3D Blu-ray': stats['3D Blu-ray'] || 0
    };
  }, [collections]);

  const formatTabs = [
    {
      id: 'all' as const,
      label: 'Total',
      count: formatStats.total,
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      activeColor: 'bg-slate-600 text-white border-slate-600'
    },
    {
      id: 'DVD' as const,
      label: 'DVD',
      count: formatStats.DVD,
      color: 'bg-red-100 text-red-800 border-red-300',
      activeColor: 'bg-red-600 text-white border-red-600'
    },
    {
      id: 'Blu-ray' as const,
      label: 'Blu-ray',
      count: formatStats['Blu-ray'],
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      activeColor: 'bg-blue-600 text-white border-blue-600'
    },
    {
      id: '4K UHD' as const,
      label: '4K UHD',
      count: formatStats['4K UHD'],
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      activeColor: 'bg-purple-600 text-white border-purple-600'
    },
    {
      id: '3D Blu-ray' as const,
      label: '3D Blu-ray',
      count: formatStats['3D Blu-ray'],
      color: 'bg-green-100 text-green-800 border-green-300',
      activeColor: 'bg-green-600 text-white border-green-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-700">Format Distribution</h3>
        <div className="text-xs text-slate-500">Click to filter by format</div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {formatTabs.map((tab) => {
          const isActive = activeFormat === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onFormatChange(tab.id)}
              className={`
                inline-flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium
                transition-all duration-200 min-w-[80px] justify-center
                ${isActive ? tab.activeColor : tab.color + ' hover:bg-opacity-80'}
              `}
            >
              <span>{tab.label}</span>
              <span className={`
                inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold
                ${isActive 
                  ? 'bg-white bg-opacity-20 text-white' 
                  : 'bg-slate-200 text-slate-700'
                }
              `}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface MyCollectionsPageProps {}

export const MyCollectionsPage: React.FC<MyCollectionsPageProps> = () => {
  // Collection type state
  const [activeCollectionType, setActiveCollectionType] = useState<CollectionType | 'all'>('all');
  
  // Use enhanced collections hook with filtering
  const { 
    collections, 
    loading, 
    error, 
    addToCollection, 
    removeFromCollection, 
    updateCollection,
    moveToCollectionType,
    getCollectionStats,
    getAllCollections,
    refetch 
  } = useCollections({ 
    collectionType: activeCollectionType,
    includeAll: activeCollectionType === 'all'
  });

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'purchase_date' | 'personal_rating'>('title');
  const [selectedItems, setSelectedItems] = useState<PhysicalMediaCollection[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Get collection statistics (this would need to be enhanced to get accurate stats for all types)
  const collectionStats = useMemo(() => {
    // In a real implementation, you'd want to get stats for ALL collections, not just filtered ones
    // For now, this provides the structure needed
    return {
      owned: collections.filter(item => (item.collection_type || 'owned') === 'owned').length,
      wishlist: collections.filter(item => item.collection_type === 'wishlist').length,
      for_sale: collections.filter(item => item.collection_type === 'for_sale').length,
      loaned_out: collections.filter(item => item.collection_type === 'loaned_out').length,
      missing: collections.filter(item => item.collection_type === 'missing').length,
      total: collections.length
    };
  }, [collections]);

  // Handle collection type change
  const handleCollectionTypeChange = (newType: CollectionType | 'all') => {
    setActiveCollectionType(newType);
    setSelectedItems([]); // Clear selections when changing types
    setSearchQuery(''); // Clear search when changing types
  };

  // Handle moving items between collection types
  const handleMoveToType = async (itemId: string, newType: CollectionType) => {
    try {
      await moveToCollectionType(itemId, newType);
      // Refresh collections to update counts and filtered view
      await refetch();
    } catch (error) {
      console.error('Failed to move item:', error);
      alert('Failed to move item. Please try again.');
    }
  };

  // Handle delete
  const handleDeleteFromCollection = async (itemId: string) => {
    try {
      await removeFromCollection(itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  // Handle add to collection
  const handleAddToCollection = async (collectionData: any) => {
    try {
      await addToCollection(collectionData);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add to collection:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  // Enhanced filtering and sorting
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = collections;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.director?.toLowerCase().includes(query) ||
        item.genre?.toLowerCase().includes(query)
      );
    }

    if (formatFilter !== 'all') {
      filtered = filtered.filter(item => item.format === formatFilter);
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b.release_year || 0) - (a.release_year || 0);
        case 'purchase_date':
          return new Date(b.purchase_date || 0).getTime() - new Date(a.purchase_date || 0).getTime();
        case 'personal_rating':
          return (b.rating || 0) - (a.rating || 0);
        default: // title
          return a.title.localeCompare(b.title);
      }
    });
  }, [collections, searchQuery, formatFilter, sortBy]);

  // Enhanced stats calculations
  const enhancedStats = useMemo(() => {
    const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
    const wishlistItems = collections.filter(item => item.collection_type === 'wishlist');
    
    const totalValue = ownedItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const wishlistValue = wishlistItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    
    const formats = collections.reduce((acc, item) => {
      acc[item.format] = (acc[item.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgRating = ownedItems
      .filter(item => item.rating)
      .reduce((sum, item, _, arr) => sum + (item.rating || 0) / arr.length, 0);

    return {
      totalValue,
      wishlistValue,
      formats,
      avgRating: avgRating || 0,
      mostExpensive: ownedItems.reduce((max, item) => 
        (item.purchase_price || 0) > (max.purchase_price || 0) ? item : max, ownedItems[0]),
      newestAddition: collections.reduce((newest, item) => 
        new Date(item.created_at || 0) > new Date(newest?.created_at || 0) ? item : newest, collections[0])
    };
  }, [collections]);

  // CSV Export handler
  const handleExportCSV = async () => {
  try {
    setIsExporting(true);
    
    // Get collections data
    const collectionsToExport = activeCollectionType === 'all' 
      ? await getAllCollections() 
      : collections;
    
    if (collectionsToExport.length === 0) {
      alert('No items to export. Please add some items to your collection first.');
      return;
    }
    
    // Generate CSV
    const csvData = csvExportService.generateCollectionCSV(collectionsToExport);
    const filename = `collection-${activeCollectionType === 'all' ? 'all' : activeCollectionType}-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Download CSV
    csvExportService.downloadCSV(csvData, filename);
    
    // Show success message
    console.log(`[Export] Successfully exported ${collectionsToExport.length} items to ${filename}`);
    
    // Optional: Show a temporary success message in the UI
    // You could add a toast notification here
    
  } catch (error) {
    console.error('Export failed:', error);
    
    // More detailed error message
    if (error instanceof Error) {
      alert(`Failed to export collection: ${error.message}\n\nTip: Try refreshing the page and trying again, or check your browser's download settings.`);
    } else {
      alert('Failed to export collection. Please try again or check your browser\'s download settings.');
    }
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Collections</h1>
            <p className="text-slate-600">
              Manage and organize your physical media collection
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              disabled={isExporting || collections.length === 0}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Enhanced Collection Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <CollectionStatsCard
            label="Total Items"
            value={collectionStats.total}
            icon={Package}
            color="blue"
            onClick={() => handleCollectionTypeChange('all')}
          />
          <CollectionStatsCard
            label="Total Value"
            value={`$${enhancedStats.totalValue.toFixed(0)}`}
            icon={DollarSign}
            color="green"
            subtitle="Owned items only"
          />
          <CollectionStatsCard
            label="Wishlist Value"
            value={`$${enhancedStats.wishlistValue.toFixed(0)}`}
            icon={Heart}
            color="red"
            subtitle={`${collectionStats.wishlist} items`}
            onClick={() => handleCollectionTypeChange('wishlist')}
          />
          <CollectionStatsCard
            label="Avg Rating"
            value={enhancedStats.avgRating.toFixed(1)}
            icon={Award}
            color="purple"
            subtitle="Your ratings"
          />
        </div>

        {/* Collection Type Tabs */}
        <CollectionTypeTabs
          activeType={activeCollectionType}
          onTypeChange={handleCollectionTypeChange}
          stats={collectionStats}
        />

        {/* FORMAT DISTRIBUTION TABS - THIS IS THE MISSING PIECE! */}
        <FormatDistributionTabs
          collections={collections}
          activeFormat={formatFilter}
          onFormatChange={setFormatFilter}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0 lg:space-x-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeCollectionType === 'all' ? 'all items' : activeCollectionType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-slate-600" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Formats</option>
                <option value="DVD">DVD</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="4K UHD">4K UHD</option>
                <option value="3D Blu-ray">3D Blu-ray</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <SortAsc className="h-5 w-5 text-slate-600" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="title">Sort by Title</option>
                <option value="year">Sort by Year</option>
                <option value="purchase_date">Sort by Purchase Date</option>
                <option value="personal_rating">Sort by Rating</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Grid */}
      <div className="mb-8">
        {filteredAndSortedCollections.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">
              {searchQuery || formatFilter !== 'all' 
                ? 'No matches found' 
                : activeCollectionType === 'all'
                ? 'Your collection is empty'
                : `Your ${activeCollectionType} is empty`
              }
            </h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || formatFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : `Start building your ${activeCollectionType === 'all' ? 'collection' : activeCollectionType}`
              }
            </p>
            {!searchQuery && formatFilter === 'all' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Add Your First Item</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredAndSortedCollections.map((item) => (
              <CollectionItemCard
                key={item.id}
                item={item}
                onUpdate={refetch}
                onDelete={handleDeleteFromCollection}
                isSelected={selectedItems.some(selected => selected.id === item.id)}
                onSelect={(selected) => {
                  if (selected) {
                    setSelectedItems(prev => [...prev, item]);
                  } else {
                    setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
                  }
                }}
                onMoveToType={(newType) => handleMoveToType(item.id, newType)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddToCollection}
      />
    </div>
  );
};