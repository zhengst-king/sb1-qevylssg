// src/components/MyCollectionsPage.tsx
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
  Upload,
  Grid3X3,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { useAuth } from '../hooks/useAuth';
import { CollectionItemCard } from './CollectionItemCard';
import { AddToCollectionModal } from './AddToCollectionModal';
import { ImportListsModal } from './ImportListsModal';
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
  const tabs = [
    { id: 'all' as const, label: 'All Items', count: stats.total, icon: Package, color: 'bg-slate-600' },
    { id: 'owned' as const, label: 'Owned', count: stats.owned, icon: Disc3, color: 'bg-blue-600' },
    { id: 'wishlist' as const, label: 'Wishlist', count: stats.wishlist, icon: Heart, color: 'bg-red-600' },
    { id: 'for_sale' as const, label: 'For Sale', count: stats.for_sale, icon: DollarSign, color: 'bg-green-600' },
    { id: 'loaned_out' as const, label: 'Loaned Out', count: stats.loaned_out, icon: UserCheck, color: 'bg-orange-600' },
    { id: 'missing' as const, label: 'Missing', count: stats.missing, icon: AlertTriangle, color: 'bg-yellow-600' }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeType === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTypeChange(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isActive
                ? `${tab.color} text-white shadow-md`
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            <span className={`inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold ${
              isActive 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'bg-slate-200 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Format Distribution Tabs
interface FormatDistributionTabsProps {
  collections: PhysicalMediaCollection[];
  activeFormat: 'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  onFormatChange: (format: 'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray') => void;
}

const FormatDistributionTabs: React.FC<FormatDistributionTabsProps> = ({
  collections,
  activeFormat,
  onFormatChange
}) => {
  const formatStats = useMemo(() => {
    const stats = {
      all: collections.length,
      'DVD': collections.filter(item => item.format === 'DVD').length,
      'Blu-ray': collections.filter(item => item.format === 'Blu-ray').length,
      '4K UHD': collections.filter(item => item.format === '4K UHD').length,
      '3D Blu-ray': collections.filter(item => item.format === '3D Blu-ray').length,
    };
    return stats;
  }, [collections]);

  const formatTabs = [
    { id: 'all' as const, label: 'All Formats', icon: Monitor, color: 'text-slate-600' },
    { id: 'DVD' as const, label: 'DVD', icon: Disc3, color: 'text-red-600' },
    { id: 'Blu-ray' as const, label: 'Blu-ray', icon: Disc3, color: 'text-blue-600' },
    { id: '4K UHD' as const, label: '4K UHD', icon: Monitor, color: 'text-purple-600' },
    { id: '3D Blu-ray' as const, label: '3D Blu-ray', icon: FileVideo, color: 'text-green-600' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {formatTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeFormat === tab.id;
        const count = formatStats[tab.id];
        
        if (count === 0 && tab.id !== 'all') return null;
        
        return (
          <button
            key={tab.id}
            onClick={() => onFormatChange(tab.id)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? 'bg-white shadow-sm border border-slate-200'
                : 'bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <Icon className={`h-3 w-3 ${tab.color}`} />
            <span className={isActive ? 'text-slate-900' : 'text-slate-600'}>
              {tab.label} ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface MyCollectionsPageProps {}

export const MyCollectionsPage: React.FC<MyCollectionsPageProps> = () => {
  const { user } = useAuth();
  
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'purchase_date' | 'personal_rating'>('title');
  const [selectedItems, setSelectedItems] = useState<PhysicalMediaCollection[]>([]);

  // CSV Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Get collection statistics
  const collectionStats = useMemo(() => {
    return {
      owned: collections.filter(item => (item.collection_type || 'owned') === 'owned').length,
      wishlist: collections.filter(item => item.collection_type === 'wishlist').length,
      for_sale: collections.filter(item => item.collection_type === 'for_sale').length,
      loaned_out: collections.filter(item => item.collection_type === 'loaned_out').length,
      missing: collections.filter(item => item.collection_type === 'missing').length,
      total: collections.length
    };
  }, [collections]);

  // Enhanced stats calculations
  const enhancedStats = useMemo(() => {
    const ownedItems = collections.filter(item => (item.collection_type || 'owned') === 'owned');
    const wishlistItems = collections.filter(item => item.collection_type === 'wishlist');
    const ratedItems = collections.filter(item => item.personal_rating && item.personal_rating > 0);
    
    const totalValue = ownedItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const wishlistValue = wishlistItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const avgRating = ratedItems.length > 0 
      ? ratedItems.reduce((sum, item) => sum + (item.personal_rating || 0), 0) / ratedItems.length 
      : 0;

    return {
      totalValue,
      wishlistValue,
      avgRating,
      mostExpensive: ownedItems.reduce((max, item) => 
        (item.purchase_price || 0) > (max.purchase_price || 0) ? item : max, 
        ownedItems[0] || {} as PhysicalMediaCollection
      )
    };
  }, [collections]);

  // Handle collection type change
  const handleCollectionTypeChange = (type: CollectionType | 'all') => {
    setActiveCollectionType(type);
    setSearchQuery('');
    setFormatFilter('all');
  };

  // Move item to different collection type
  const handleMoveToType = async (itemId: string, newType: CollectionType) => {
    try {
      await moveToCollectionType(itemId, newType);
    } catch (error) {
      console.error('Failed to move item:', error);
    }
  };

  // CSV Export functionality
  const handleExportCSV = async () => {
    if (collections.length === 0) return;
    
    setIsExporting(true);
    try {
      const filename = activeCollectionType === 'all' 
        ? 'my_complete_collection' 
        : `my_${activeCollectionType}_collection`;
      
      await csvExportService.exportCollections(collections, filename);
      setExportSuccess(`Successfully exported ${collections.length} items to CSV!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setExportSuccess(null), 5000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportSuccess('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter and sort collections
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = [...collections];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.director && item.director.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.genre && item.genre.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply format filter
    if (formatFilter !== 'all') {
      filtered = filtered.filter(item => item.format === formatFilter);
    }

    // Apply sorting
    const sorted = filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'purchase_date':
          return new Date(b.purchase_date || 0).getTime() - new Date(a.purchase_date || 0).getTime();
        case 'personal_rating':
          return (b.personal_rating || 0) - (a.personal_rating || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [collections, searchQuery, formatFilter, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Error loading collection</p>
          <p className="text-slate-500 text-sm">{error}</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Export Success Message */}
        {exportSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-700 font-medium">{exportSuccess}</p>
              </div>
              <button
                onClick={() => setExportSuccess(null)}
                className="text-green-400 hover:text-green-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                <Package className="h-8 w-8 text-blue-600 mr-3" />
                My Disc Collections
              </h1>
              <p className="text-slate-600 mt-2">
                Manage your physical media collection
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Export Lists Button (previously Export CSV) */}
              <button
                onClick={handleExportCSV}
                disabled={isExporting || collections.length === 0}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isExporting 
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                    : collections.length === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
                }`}
                title={
                  isExporting 
                    ? 'Exporting Lists...' 
                    : collections.length === 0
                    ? 'No items to export'
                    : `Export ${activeCollectionType === 'all' ? 'all' : activeCollectionType} items`
                }
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export Lists</span>
                    {collections.length > 0 && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full ml-1">
                        {collections.length}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Import Lists Button */}
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Import Lists</span>
              </button>
              
              {/* Add Item Button */}
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

          {/* Format Distribution Tabs */}
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
                placeholder={`Search ${activeCollectionType === 'all' ? 'collections' : activeCollectionType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <SortAsc className="h-4 w-4 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="title">Title A-Z</option>
                  <option value="year">Year (Newest)</option>
                  <option value="purchase_date">Purchase Date</option>
                  <option value="personal_rating">Your Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || formatFilter !== 'all') && (
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-sm text-slate-500">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {formatFilter !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Format: {formatFilter}
                  <button
                    onClick={() => setFormatFilter('all')}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Collections Grid */}
        {filteredAndSortedCollections.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">
              {searchQuery || formatFilter !== 'all' ? 'No items match your filters' : 'Your collection is empty'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || formatFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Start building your collection by adding your first item'}
            </p>
            {!(searchQuery || formatFilter !== 'all') && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedCollections.map((item) => (
              <CollectionItemCard
                key={item.id}
                item={item}
                onRemove={removeFromCollection}
                onUpdate={updateCollection}
                onMoveToType={handleMoveToType}
                showCollectionType={activeCollectionType === 'all'}
              />
            ))}
          </div>
        )}

        {/* Add Item Modal */}
        <AddToCollectionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={addToCollection}
          defaultCollectionType={activeCollectionType !== 'all' ? activeCollectionType : 'owned'}
        />

        {/* Import Lists Modal */}
        <ImportListsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          pageType="collections"
        />
      </div>
    </div>
  );
};