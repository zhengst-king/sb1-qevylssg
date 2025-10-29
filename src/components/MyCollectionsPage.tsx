// src/components/MyCollectionsPage.tsx - SIMPLIFIED VERSION
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
import { csvExportService } from '../services/csvExportService';
import type { PhysicalMediaCollection, CollectionType } from '../lib/supabase';
import { CustomCollectionsModal } from './CustomCollectionsModal';
import { TagManagementModal } from './TagManagementModal';
import { Folder, Tag } from 'lucide-react';

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
        onClick ? 'hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[1]} ${colorClasses[color].split(' ')[0]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};

// Collection Type Filter Tabs
interface CollectionTypeTabsProps {
  activeType: CollectionType | 'all';
  onTypeChange: (type: CollectionType | 'all') => void;
  stats: Record<string, number>;
}

const CollectionTypeTabs: React.FC<CollectionTypeTabsProps> = ({
  activeType,
  onTypeChange,
  stats
}) => {
  const tabs = [
    { id: 'all' as const, label: 'All Items', icon: Package, color: 'text-slate-600' },
    { id: 'owned' as const, label: 'Owned', icon: Disc3, color: 'text-blue-600' },
    { id: 'wishlist' as const, label: 'Wishlist', icon: Heart, color: 'text-red-600' },
    { id: 'for_sale' as const, label: 'For Sale', icon: DollarSign, color: 'text-green-600' },
    { id: 'loaned_out' as const, label: 'Loaned Out', icon: UserCheck, color: 'text-orange-600' },
    { id: 'missing' as const, label: 'Missing', icon: AlertTriangle, color: 'text-red-600' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeType === tab.id;
        const count = tab.id === 'all' ? stats.total : stats[tab.id] || 0;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTypeChange(tab.id)}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
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
  
  // Use enhanced collections hook
  const { 
    collections, 
    loading, 
    error, 
    addToCollection, 
    removeFromCollection, 
    updateCollection,
    refetch 
  } = useCollections();

  // Modal states - SIMPLIFIED: Only need ImportListsModal now
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCustomCollectionsModal, setShowCustomCollectionsModal] = useState(false);
  const [showTagManagementModal, setShowTagManagementModal] = useState(false);
  
  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'dateAdded' | 'value'>('title');
  
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
  const handleMoveToType = async (item: PhysicalMediaCollection, newType: CollectionType) => {
    try {
      await updateCollection(item.id, { collection_type: newType });
      refetch();
    } catch (error) {
      console.error('Error moving item:', error);
      alert('Failed to move item. Please try again.');
    }
  };

  // CSV Export functionality
  const handleExportCSV = async () => {
    if (!user?.id) {
      alert('Please log in to export your collection');
      return;
    }

    if (collections.length === 0) {
      alert('No collection items to export');
      return;
    }

    setIsExporting(true);
    setExportSuccess(null);

    try {
      const result = await csvExportService.exportCollectionToCSV(user.id, {
        includeHeaders: true,
        includeTechnicalSpecs: true,
        dateFormat: 'iso',
        filename: `my-${activeCollectionType === 'all' ? 'complete' : activeCollectionType}-collection`
      });

      if (result.success) {
        setExportSuccess(`Successfully exported ${result.recordCount} items to ${result.filename}`);
        setTimeout(() => setExportSuccess(null), 5000); // Clear after 5 seconds
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('[Collection Page] CSV export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // SIMPLIFIED: Handle import success
  const handleImportSuccess = () => {
    setShowImportModal(false);
    refetch(); // Refresh the collections
    setExportSuccess('Import completed successfully!');
    setTimeout(() => setExportSuccess(null), 5000);
  };

  // Filter and sort collections
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = [...collections];

    // Apply collection type filter
    if (activeCollectionType !== 'all') {
      filtered = filtered.filter(item => (item.collection_type || 'owned') === activeCollectionType);
    }

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
        case 'dateAdded':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'value':
          return (b.purchase_price || 0) - (a.purchase_price || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [collections, activeCollectionType, searchQuery, formatFilter, sortBy]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
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
              {/* Export Lists Button */}
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
                        {filteredAndSortedCollections.length}
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

              {/* Custom Collections Button */}
              <button
                onClick={() => setShowCustomCollectionsModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Folder className="h-4 w-4" />
                <span>Collections</span>
              </button>

              {/* Tags Button */}
              <button
                onClick={() => setShowTagManagementModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Tag className="h-4 w-4" />
                <span>Tags</span>
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

          {/* Enhanced Collection Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <CollectionStatsCard
              label="Total Items"
              value={collectionStats.total}
              icon={Package}
              color="blue"
              onClick={() => handleCollectionTypeChange('all')}
            />
            <CollectionStatsCard
              label="Collection Value"
              value={enhancedStats.totalValue > 0 ? `$${enhancedStats.totalValue.toFixed(0)}` : '$0'}
              icon={DollarSign}
              color="green"
              subtitle="Owned items"
            />
            <CollectionStatsCard
              label="Avg Rating"
              value={enhancedStats.avgRating > 0 ? enhancedStats.avgRating.toFixed(1) : '0.0'}
              icon={Award}
              color="purple"
              subtitle="Your ratings"
            />
            <CollectionStatsCard
              label="Wishlist Value"
              value={enhancedStats.wishlistValue > 0 ? `$${enhancedStats.wishlistValue.toFixed(0)}` : '$0'}
              icon={Heart}
              color="red"
              onClick={() => handleCollectionTypeChange('wishlist')}
            />
            <CollectionStatsCard
              label="4K Collection"
              value={collections.filter(item => item.format === '4K UHD').length}
              icon={Monitor}
              color="orange"
              subtitle="Ultra HD titles"
            />
            <CollectionStatsCard
              label="Most Expensive"
              value={enhancedStats.mostExpensive.purchase_price ? `$${enhancedStats.mostExpensive.purchase_price}` : 'N/A'}
              icon={Sparkles}
              color="slate"
              subtitle={enhancedStats.mostExpensive.title ? enhancedStats.mostExpensive.title.substring(0, 20) + '...' : 'None'}
            />
          </div>
        </div>

        {/* Collection Type Filter Tabs */}
        <CollectionTypeTabs
          activeType={activeCollectionType}
          onTypeChange={handleCollectionTypeChange}
          stats={collectionStats}
        />

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search by title, director, or genre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Format Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Formats</option>
                <option value="DVD">DVD</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="4K UHD">4K UHD</option>
                <option value="3D Blu-ray">3D Blu-ray</option>
              </select>
            </div>

            {/* Sort */}
            <div className="relative">
              <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="title">Sort by Title</option>
                <option value="year">Sort by Year</option>
                <option value="dateAdded">Sort by Date Added</option>
                <option value="value">Sort by Value</option>
              </select>
            </div>
          </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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

        {/* Import Lists Modal - SIMPLIFIED: Single modal with embedded import section */}
        <ImportListsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          pageType="collections"
          onImportSuccess={handleImportSuccess}
        />

        <CustomCollectionsModal
          isOpen={showCustomCollectionsModal}
          onClose={() => setShowCustomCollectionsModal(false)}
        />

        <TagManagementModal
          isOpen={showTagManagementModal}
          onClose={() => setShowTagManagementModal(false)}
        />
      </div>
    </div>
  );
};