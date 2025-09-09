// src/components/MyCollectionsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Disc3, Plus, Search, Filter, Package, Star, Calendar, DollarSign, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, type PhysicalMediaCollection } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';
import { blurayApi } from '../lib/blurayApi';
import { AddToCollectionModal } from './AddToCollectionModal';
import { CollectionItemCard } from './CollectionItemCard';

type SortOption = 'title' | 'year' | 'purchase_date' | 'personal_rating' | 'format';
type FormatFilter = 'all' | 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';

export function MyCollectionsPage() {
  const { user, isAuthenticated } = useAuth();
  const [collections, setCollections] = useState<PhysicalMediaCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch collections
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCollections();
    }
  }, [isAuthenticated, user]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections_with_specs') // Use the view we created
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort collections
  const filteredAndSortedCollections = useMemo(() => {
    let filtered = collections.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.director?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genre?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFormat = formatFilter === 'all' || item.format === formatFilter;
      
      return matchesSearch && matchesFormat;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy];
      let bValue: any = b[sortBy];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      // Special handling for dates
      if (sortBy === 'purchase_date') {
        aValue = new Date(aValue || '1900-01-01').getTime();
        bValue = new Date(bValue || '1900-01-01').getTime();
      }

      let result = 0;
      if (aValue < bValue) result = -1;
      else if (aValue > bValue) result = 1;

      return sortDirection === 'desc' ? -result : result;
    });

    return filtered;
  }, [collections, searchQuery, formatFilter, sortBy, sortDirection]);

  const collectionStats = useMemo(() => {
    const stats = {
      total: collections.length,
      dvd: collections.filter(c => c.format === 'DVD').length,
      bluray: collections.filter(c => c.format === 'Blu-ray').length,
      uhd: collections.filter(c => c.format === '4K UHD').length,
      threeDee: collections.filter(c => c.format === '3D Blu-ray').length,
      totalValue: collections.reduce((sum, c) => sum + (c.purchase_price || 0), 0),
      averageRating: collections.filter(c => c.personal_rating).length > 0
        ? collections.reduce((sum, c) => sum + (c.personal_rating || 0), 0) / 
          collections.filter(c => c.personal_rating).length
        : 0
    };
    return stats;
  }, [collections]);

  const handleSort = (newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  };

  const handleAddToCollection = async (collectionData: Partial<PhysicalMediaCollection>) => {
    try {
      // Enhance with technical specs if available
      if (collectionData.title && collectionData.year) {
        console.log('Getting technical specs for:', collectionData.title);
        const techSpecs = await blurayApi.getDiscSpecs(collectionData.title, collectionData.year);
        if (techSpecs) {
          collectionData.technical_specs_id = techSpecs.id;
        }
      }

      const { data, error } = await supabase
        .from('physical_media_collections')
        .insert([{ ...collectionData, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchCollections(); // Refresh the list
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Error adding to collection:', error);
      alert('Failed to add to collection: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Disc3 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-slate-600 mb-2">Sign in required</h3>
          <p className="text-slate-500">Please sign in to view your physical media collection.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Disc3 className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">My Collections</h1>
          </div>
          <p className="text-lg text-slate-600 mb-6">
            Track your physical media collection with enhanced technical specifications
          </p>

          {/* Collection Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">{collectionStats.total}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Total Items</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-red-600">{collectionStats.dvd}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">DVD</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">{collectionStats.bluray}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Blu-ray</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-purple-600">{collectionStats.uhd}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">4K UHD</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-green-600">${collectionStats.totalValue.toFixed(0)}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Total Value</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-yellow-600">{collectionStats.averageRating.toFixed(1)}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">Avg Rating</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search your collection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as FormatFilter)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Formats</option>
                <option value="DVD">DVD</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="4K UHD">4K UHD</option>
                <option value="3D Blu-ray">3D Blu-ray</option>
              </select>

              <select
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortBy(field as SortOption);
                  setSortDirection(direction as 'asc' | 'desc');
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="title-asc">Title A-Z</option>
                <option value="title-desc">Title Z-A</option>
                <option value="year-desc">Year (Newest)</option>
                <option value="year-asc">Year (Oldest)</option>
                <option value="purchase_date-desc">Recently Added</option>
                <option value="personal_rating-desc">Highest Rated</option>
              </select>

              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Collection</span>
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedCollections.map((item) => (
              <CollectionItemCard
                key={item.id}
                item={item}
                onUpdate={fetchCollections}
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
}