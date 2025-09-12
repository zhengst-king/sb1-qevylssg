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
  const { collections, loading, error, addToCollection, removeFromCollection, refetch } = useCollections();
  // FIXED: Add proper error handling for delete
const handleDeleteFromCollection = async (itemId: string) => {
  try {
    console.log('[handleDeleteFromCollection] Attempting to delete item:', itemId);
    
    await removeFromCollection(itemId);
    
    console.log('[handleDeleteFromCollection] Successfully deleted item:', itemId);
    
    // Show success message
    alert('Item deleted successfully!');
    
    // Optionally refresh the collection to ensure UI is in sync
    await refetch();
    
  } catch (error) {
    console.error('[handleDeleteFromCollection] Failed to delete item:', error);
    
    // Show specific error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    alert(`Failed to delete item: ${errorMessage}`);
    
    // Optionally log additional debug info
    console.log('[handleDeleteFromCollection] Debug info:', {
      itemId,
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorMessage
    });
  }
};
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'year' | 'purchase_date' | 'rating'>('title');
  const [showStats, setShowStats] = useState(true);

  // Enhanced collection statistics
  const collectionStats = useMemo(() => {
    const stats = {
      total: collections.length,
      dvd: collections.filter(item => item.format === 'DVD').length,
      bluray: collections.filter(item => item.format === 'Blu-ray').length,
      uhd: collections.filter(item => item.format === '4K UHD').length,
      threeDee: collections.filter(item => item.format === '3D Blu-ray').length,
      
      // Enhanced stats
      withSpecs: collections.filter(item => item.technical_specs_id).length,
      dolbyAtmos: collections.filter(item => 
        item.technical_specs?.audio_codecs?.some(codec => 
          codec.includes('Dolby Atmos')
        )
      ).length,
      hdr: collections.filter(item => 
        item.technical_specs?.hdr_format?.length > 0
      ).length,
      highRated: collections.filter(item => 
        (item.personal_rating && item.personal_rating >= 8) || 
        (item.imdb_score && item.imdb_score >= 8)
      ).length,
      
      // Value stats
      totalValue: collections.reduce((sum, item) => sum + (item.purchase_price || 0), 0),
      averageRating: collections.length > 0 
        ? collections.reduce((sum, item) => sum + (item.personal_rating || item.imdb_score || 0), 0) / collections.length
        : 0
    };

    return stats;
  }, [collections]);

  // Enhanced filtering and sorting
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = collections.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.director && item.director.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFormat = formatFilter === 'all' || item.format === formatFilter;
      return matchesSearch && matchesFormat;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b.year || 0) - (a.year || 0);
        case 'purchase_date':
          return new Date(b.purchase_date || 0).getTime() - new Date(a.purchase_date || 0).getTime();
        case 'rating':
          const ratingA = a.personal_rating || a.imdb_score || 0;
          const ratingB = b.personal_rating || b.imdb_score || 0;
          return ratingB - ratingA;
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });
  }, [collections, searchQuery, formatFilter, sortBy]);

  const handleAddToCollection = async (movieData: any) => {
    try {
      await addToCollection(movieData);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding to collection:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Disc3 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading your collection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error loading collection: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Disc3 className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">My Collections</h1>
          </div>
          <p className="text-lg text-slate-600 mb-6">
            Track your physical media collection with enhanced technical specifications
          </p>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span>Add Item</span>
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm border border-slate-200"
            >
              <BarChart3 className="h-5 w-5" />
              <span>{showStats ? 'Hide Stats' : 'Show Stats'}</span>
            </button>
          </div>
        </div>

        {/* Enhanced Collection Stats */}
        {showStats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Collection Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <CollectionStatsCard
                label="Total Items"
                value={collectionStats.total}
                icon={Package}
                color="blue"
              />
              <CollectionStatsCard
                label="DVD"
                value={collectionStats.dvd}
                icon={FileVideo}
                color="red"
              />
              <CollectionStatsCard
                label="Blu-ray"
                value={collectionStats.bluray}
                icon={Monitor}
                color="blue"
              />
              <CollectionStatsCard
                label="4K UHD"
                value={collectionStats.uhd}
                icon={Sparkles}
                color="purple"
              />
              <CollectionStatsCard
                label="3D Blu-ray"
                value={collectionStats.threeDee}
                icon={Eye}
                color="green"
              />
              <CollectionStatsCard
                label="With Specs"
                value={collectionStats.withSpecs}
                icon={BarChart3}
                color="slate"
              />
            </div>

            {/* Premium Features Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CollectionStatsCard
                label="Total Value"
                value={`$${collectionStats.totalValue.toFixed(0)}`}
                icon={DollarSign}
                color="green"
              />
              <CollectionStatsCard
                label="Avg Rating"
                value={collectionStats.averageRating.toFixed(1)}
                icon={Award}
                color="blue"
              />
              <CollectionStatsCard
                label="Dolby Atmos"
                value={collectionStats.dolbyAtmos}
                icon={Volume2}
                color="green"
              />
              <CollectionStatsCard
                label="HDR Content"
                value={collectionStats.hdr}
                icon={Sparkles}
                color="orange"
              />
            </div>
          </div>
        )}

        {/* Enhanced Search and Filter Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search movies, directors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Format Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
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
              <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="title">Title A-Z</option>
                <option value="year">Year (Newest)</option>
                <option value="purchase_date">Recently Added</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-center md:justify-start">
              <span className="text-sm text-slate-600 font-medium">
                {filteredAndSortedCollections.length} of {collections.length} items
              </span>
            </div>
          </div>
        </div>

        {/* Collection Grid */}
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
                onUpdate={refetch} // FIXED: Use refetch function
                onDelete={handleDeleteFromCollection} // FIXED: Use wrapper with error handling
              />
            ))}
          </div>
        )}

        {/* Add to Collection Modal */}
        <AddToCollectionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddToCollection}
        />
      </div>
    </div>
  );
};