import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  Merge, 
  Eye,
  Calendar,
  DollarSign,
  Star,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { PhysicalMediaCollection } from '../lib/supabase';

interface DuplicateManagementProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: PhysicalMediaCollection[][];
  onMergeDuplicates: (itemsToMerge: string[], keepItemId: string) => Promise<number>;
  onRefresh: () => void;
}

interface MergeDecision {
  groupIndex: number;
  keepItemId: string;
  itemsToMerge: string[];
}

export function DuplicateManagement({ 
  isOpen, 
  onClose, 
  duplicateGroups, 
  onMergeDuplicates,
  onRefresh 
}: DuplicateManagementProps) {
  const [mergeDecisions, setMergeDecisions] = useState<Map<number, string>>(new Map());
  const [isMerging, setIsMerging] = useState(false);
  const [mergeResults, setMergeResults] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeepSelection = (groupIndex: number, itemId: string) => {
    setMergeDecisions(prev => new Map(prev).set(groupIndex, itemId));
  };

  const handleMergeSelected = async () => {
    try {
      setIsMerging(true);
      setError(null);
      
      let totalMerged = 0;
      
      for (const [groupIndex, keepItemId] of mergeDecisions.entries()) {
        const group = duplicateGroups[groupIndex];
        const itemsToMerge = group.map(item => item.id);
        
        const mergedCount = await onMergeDuplicates(itemsToMerge, keepItemId);
        totalMerged += mergedCount;
      }
      
      setMergeResults(`Successfully merged ${totalMerged} duplicate items!`);
      setMergeDecisions(new Map());
      
      // Refresh the duplicate detection
      setTimeout(() => {
        onRefresh();
      }, 1000);
      
    } catch (err) {
      console.error('Merge error:', err);
      setError(err instanceof Error ? err.message : 'Failed to merge duplicates');
    } finally {
      setIsMerging(false);
    }
  };

  const handleMergeAll = () => {
    // Auto-select the first item in each group to keep
    const newDecisions = new Map<number, string>();
    duplicateGroups.forEach((group, index) => {
      if (group.length > 0) {
        newDecisions.set(index, group[0].id);
      }
    });
    setMergeDecisions(newDecisions);
  };

  const getItemScore = (item: PhysicalMediaCollection) => {
    let score = 0;
    
    // Prefer items with more data
    if (item.poster_url) score += 2;
    if (item.purchase_date) score += 1;
    if (item.purchase_price) score += 1;
    if (item.purchase_location) score += 1;
    if (item.personal_rating) score += 2;
    if (item.notes) score += 1;
    if (item.technical_specs_id) score += 3;
    
    // Prefer better condition
    const conditionScores = { 'New': 5, 'Like New': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 };
    score += conditionScores[item.condition] || 0;
    
    return score;
  };

  const getSuggestedKeep = (group: PhysicalMediaCollection[]) => {
    return group.reduce((best, current) => 
      getItemScore(current) > getItemScore(best) ? current : best
    );
  };

  const selectedCount = mergeDecisions.size;
  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-slate-900">
              Duplicate Management
            </h2>
            <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">
              {duplicateGroups.length} groups found
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Results Message */}
          {mergeResults && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">{mergeResults}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* No Duplicates */}
          {duplicateGroups.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-600 mb-2">
                No duplicates found!
              </h3>
              <p className="text-slate-500">
                Your collection looks clean. Great job organizing!
              </p>
              <button
                onClick={onRefresh}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Check Again</span>
              </button>
            </div>
          )}

          {/* Duplicate Groups */}
          {duplicateGroups.length > 0 && (
            <div className="space-y-6">
              {/* Summary Actions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-blue-900">
                      Found {totalDuplicates} duplicate items in {duplicateGroups.length} groups
                    </h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Select which item to keep from each group, then merge to remove duplicates.
                    </p>
                  </div>
                  <button
                    onClick={handleMergeAll}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Auto-Select Best
                  </button>
                </div>
              </div>

              {/* Duplicate Groups */}
              {duplicateGroups.map((group, groupIndex) => {
                const suggested = getSuggestedKeep(group);
                const selectedKeep = mergeDecisions.get(groupIndex);
                
                return (
                  <div key={groupIndex} className="border border-slate-200 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-3">
                      Group {groupIndex + 1}: {group[0].title} ({group[0].year})
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.map((item) => {
                        const isSelected = selectedKeep === item.id;
                        const isSuggested = suggested.id === item.id;
                        const score = getItemScore(item);
                        
                        return (
                          <div
                            key={item.id}
                            className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-green-500 bg-green-50' 
                                : isSuggested
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            onClick={() => handleKeepSelection(groupIndex, item.id)}
                          >
                            {/* Item Header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {item.poster_url && (
                                  <img 
                                    src={item.poster_url} 
                                    alt={item.title}
                                    className="w-8 h-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{item.format}</div>
                                  <div className="text-xs text-slate-500">{item.condition}</div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end space-y-1">
                                {isSelected && (
                                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                    KEEP
                                  </span>
                                )}
                                {isSuggested && !isSelected && (
                                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                    SUGGESTED
                                  </span>
                                )}
                                <span className="text-xs text-slate-500">
                                  Score: {score}
                                </span>
                              </div>
                            </div>

                            {/* Item Details */}
                            <div className="space-y-1 text-xs text-slate-600">
                              {item.purchase_date && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(item.purchase_date).toLocaleDateString()}
                                </div>
                              )}
                              {item.purchase_price && (
                                <div className="flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  ${item.purchase_price.toFixed(2)}
                                </div>
                              )}
                              {item.personal_rating && (
                                <div className="flex items-center">
                                  <Star className="h-3 w-3 mr-1" />
                                  {item.personal_rating}/10
                                </div>
                              )}
                              {item.technical_specs_id && (
                                <div className="text-blue-600">
                                  ✓ Has technical specs
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {duplicateGroups.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              {selectedCount > 0 ? (
                <span>
                  {selectedCount} of {duplicateGroups.length} groups ready to merge
                  <span className="text-orange-600 font-medium ml-2">
                    ({duplicateGroups.filter((_, i) => mergeDecisions.has(i)).reduce((sum, group) => sum + group.length - 1, 0)} items will be removed)
                  </span>
                </span>
              ) : (
                <span>Select items to keep from each duplicate group</span>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleMergeSelected}
                disabled={selectedCount === 0 || isMerging}
                className="inline-flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Merge className="h-4 w-4" />
                <span>
                  {isMerging 
                    ? 'Merging...' 
                    : selectedCount > 0 
                    ? `Merge ${selectedCount} Groups` 
                    : 'Select Groups to Merge'
                  }
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}