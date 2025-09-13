// src/components/MyCollectionsPage.tsx - COMPLETE UPDATE
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
  DollarSign
} from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { CollectionItemCard } from './CollectionItemCard';
import { AddToCollectionModal } from './AddToCollectionModal';
// ADD THESE NEW IMPORTS:
import { CollectionToolbar } from './CollectionToolbar';
import { csvExportService } from '../services/csvExportService';
import type { PhysicalMediaCollection } from '../lib/supabase';

// Simple CollectionStatsCard component (inline)
interface CollectionStatsCardProps {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'slate';
}

const CollectionStatsCard: React.FC<CollectionStatsCardProps> = ({
  label,
  value,
  icon: Icon,
  color = 'blue'
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
      </div>
    </div>
  );
};

interface MyCollectionsPageProps {}

export const MyCollectionsPage: React.FC<MyCollectionsPageProps> = () => {
  const { 
    collections, 
    loading, 
    error, 
    addToCollection, 
    removeFromCollection, 
    updateCollection,  // Make sure this exists in useCollections hook
    refetch 
  } = useCollections();

  // Existing states
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'purchase_date' | 'personal_rating'>('title');

  // ADD THESE NEW STATES FOR COLLECTION TOOLBAR:
  const [selectedItems, setSelectedItems] = useState<PhysicalMediaCollection[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<PhysicalMediaCollection[][]>([]);

  // Existing delete handler
  const handleDeleteFromCollection = async (itemId: string) => {
    try {
      console.log('Attempting to delete item:', itemId);
      await removeFromCollection(itemId);
      console.log('Successfully deleted item:', itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  // ADD THESE NEW HANDLERS FOR COLLECTION TOOLBAR:
  
  // Handle bulk updates
  const handleBulkUpdate = async (updates: any) => {
    try {
      // Process bulk updates for selected items
      const updatePromises = selectedItems.map(item => 
        updateCollection(item.id, updates)
      );
      
      await Promise.all(updatePromises);
      await refetch(); // Refresh data
      setSelectedItems([]); // Clear selection
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Bulk update failed. Please try again.');
    }
  };

  // Handle duplicate detection and merging
  const handleMergeDuplicates = async (itemsToMerge: string[], keepItemId: string): Promise<number> => {
    try {
      // Logic to merge duplicates - you'll need to implement this in your useCollections hook
      // For now, just remove the duplicate items except the one to keep
      const mergePromises = itemsToMerge
        .filter(id => id !== keepItemId)
        .map(id => removeFromCollection(id));
      
      await Promise.all(mergePromises);
      await refetch();
      await refreshDuplicates();
      
      return mergePromises.length;
    } catch (error) {
      console.error('Merge duplicates failed:', error);
      alert('Failed to merge duplicates. Please try again.');
      return 0;
    }
  };

  // Refresh duplicate detection
  const refreshDuplicates = async () => {
    try {
      // Simple duplicate detection by title
      const titleMap = new Map<string, PhysicalMediaCollection[]>();
      
      collections.forEach(item => {
        const key = item.title.toLowerCase().trim();
        if (!titleMap.has(key)) {
          titleMap.set(key, []);
        }
        titleMap.get(key)!.push(item);
      });

      const duplicates = Array.from(titleMap.values())
        .filter(group => group.length > 1);
      
      setDuplicateGroups(duplicates);
    } catch (error) {
      console.error('Failed to refresh duplicates:', error);
    }
  };

  // Run duplicate detection when collections change
  React.useEffect(() => {
    if (collections.length > 0) {
      refreshDuplicates();
    }
  }, [collections]);

  // Existing add handler
  const handleAddToCollection = async (collectionData: any) => {
    try {
      await addToCollection(collectionData);
      setShowAddModal(false);
      await refetch();
    } catch (error) {
      console.error('Failed to add to collection:', error);
      alert('Failed to add item to collection. Please try again.');
    }
  };

  // Existing filtering and sorting logic
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
          return (b.year || 0) - (a.year || 0);
        case 'purchase_date':
          return new Date(b.purchase_date || 0).getTime() - new Date(a.purchase_date || 0).getTime();
        case 'personal_rating':
          return (b.personal_rating || 0) - (a.personal_rating || 0);
        default: // title
          return a.title.localeCompare(b.title);
      }
    });
  }, [collections, searchQuery, formatFilter, sortBy]);

  // Existing stats calculations
  const collectionStats = useMemo(() => {
    const totalItems = collections.length;
    const totalValue = collections.reduce((sum, item) => sum + (item.purchase_price || 0), 0);
    const formats = collections.reduce((acc, item) => {
      acc[item.format] = (acc[item.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonFormat = Object.entries(formats)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    const avgRating = collections
      .filter(item => item.personal_rating)
      .reduce((sum, item, _, arr) => sum + (item.personal_rating! / arr.length), 0);

    return {
      totalItems,
      totalValue,
      mostCommonFormat,
      avgRating: avgRating ? avgRating.toFixed(1) : 'N/A',
      dvdCount: formats['DVD'] || 0,
      blurayCount: formats['Blu-ray'] || 0,
      uhd4kCount: formats['4K UHD'] || 0,
      bluray3dCount: formats['3D Blu-ray'] || 0,
    };
  }, [collections]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 inline-block">
            <p className="text-red-700">Error loading collection: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Physical Media Collection</h1>
        <p className="text-slate-600">Manage your movies and shows collection</p>
      </div>

      {/* Collection Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <CollectionStatsCard 
          label="Total Items" 
          value={collectionStats.totalItems} 
          icon={Package}
          color="blue"
        />
        <CollectionStatsCard 
          label="DVD" 
          value={collectionStats.dvdCount} 
          icon={Disc3}
          color="slate"
        />
        <CollectionStatsCard 
          label="Blu-ray" 
          value={collectionStats.blurayCount} 
          icon={FileVideo}
          color="blue"
        />
        <CollectionStatsCard 
          label="4K UHD" 
          value={collectionStats.uhd4kCount} 
          icon={Monitor}
          color="purple"
        />
        <CollectionStatsCard 
          label="Collection Value" 
          value={`$${collectionStats.totalValue.toFixed(0)}`} 
          icon={DollarSign}
          color="green"
        />
        <CollectionStatsCard 
          label="Avg Rating" 
          value={collectionStats.avgRating} 
          icon={Award}
          color="orange"
        />
      </div>

      {/* ADD THE COLLECTION TOOLBAR HERE: */}
      <CollectionToolbar
        collections={filteredAndSortedCollections}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onAddItem={() => setShowAddModal(true)}
        onBulkUpdate={handleBulkUpdate}
        onMergeDuplicates={handleMergeDuplicates}
        duplicateGroups={duplicateGroups}
        onRefreshDuplicates={refreshDuplicates}
      />

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search collection..."
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
              {searchQuery || formatFilter !== 'all' ? 'No matches found' : 'Your collection is empty'}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchQuery || formatFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start building your physical media collection'
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
                // ADD SELECTION PROPS FOR BULK OPERATIONS:
                isSelected={selectedItems.some(selected => selected.id === item.id)}
                onSelect={(selected) => {
                  if (selected) {
                    setSelectedItems(prev => [...prev, item]);
                  } else {
                    setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
                  }
                }}
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