// src/components/CollectionToolbar.tsx
import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Package, 
  AlertTriangle,
  CheckSquare,
  Square,
  RotateCcw,
  Download,
  Upload,
  Loader
} from 'lucide-react';
import type { PhysicalMediaCollection } from '../lib/supabase';
import { BulkOperationsModal } from './BulkOperationsModal';
import { DuplicateManagement } from './DuplicateManagement';
import { csvExportService } from '../services/csvExportService';
import { useAuth } from '../hooks/useAuth';

interface CollectionToolbarProps {
  collections: PhysicalMediaCollection[];
  selectedItems: PhysicalMediaCollection[];
  onSelectionChange: (items: PhysicalMediaCollection[]) => void;
  onAddItem: () => void;
  onBulkUpdate: (updates: any) => Promise<void>;
  onMergeDuplicates: (itemsToMerge: string[], keepItemId: string) => Promise<number>;
  duplicateGroups: PhysicalMediaCollection[][];
  onRefreshDuplicates: () => void;
}

export function CollectionToolbar({
  collections,
  selectedItems,
  onSelectionChange,
  onAddItem,
  onBulkUpdate,
  onMergeDuplicates,
  duplicateGroups,
  onRefreshDuplicates
}: CollectionToolbarProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  const hasSelections = selectedItems.length > 0;
  const allSelected = collections.length > 0 && selectedItems.length === collections.length;
  const hasDuplicates = duplicateGroups.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(collections);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
    setSelectionMode(false);
  };

  const handleBulkUpdateComplete = async (updates: any) => {
    await onBulkUpdate(updates);
    setShowBulkModal(false);
    handleClearSelection();
  };

  const handleCSVExport = async () => {
    if (!user?.id) {
      alert('Please log in to export your collection');
      return;
    }

    if (collections.length === 0) {
      alert('No collection items to export');
      return;
    }

    setExportingCsv(true);
    setExportSuccess(null);

    try {
      const result = await csvExportService.exportCollectionToCSV(user.id, {
        includeHeaders: true,
        includeTechnicalSpecs: true,
        dateFormat: 'iso',
        filename: 'my-physical-media-collection'
      });

      if (result.success) {
        setExportSuccess(`Successfully exported ${result.recordCount} items to ${result.filename}`);
        setTimeout(() => setExportSuccess(null), 5000); // Clear after 5 seconds
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('[Collection Toolbar] CSV export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <>
      {/* Main Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          {/* Left Section - Primary Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onAddItem}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Item</span>
            </button>

            {/* Selection Mode Toggle */}
            <button
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) handleClearSelection();
              }}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                selectionMode 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              <span>{selectionMode ? 'Exit Selection' : 'Select Items'}</span>
            </button>
          </div>

          {/* Center Section - Selection Info */}
          {selectionMode && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {selectedItems.length} of {collections.length} selected
              </span>
              
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
              </button>

              {hasSelections && (
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-slate-600 hover:text-slate-700 flex items-center space-x-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          )}

          {/* Right Section - Bulk Actions */}
          <div className="flex items-center space-x-3">
            {/* Bulk Edit */}
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={!hasSelections}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                hasSelections
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              <span>Bulk Edit {hasSelections ? `(${selectedItems.length})` : ''}</span>
            </button>

            {/* Duplicate Management */}
            <button
              onClick={() => setShowDuplicateModal(true)}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                hasDuplicates
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>
                Duplicates {hasDuplicates ? `(${duplicateGroups.length})` : ''}
              </span>
            </button>

            {/* Export/Import Actions */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCSVExport}
                disabled={exportingCsv || collections.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  exportingCsv 
                    ? 'text-blue-600 bg-blue-50 cursor-not-allowed'
                    : collections.length === 0
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={
                  exportingCsv 
                    ? 'Exporting CSV...' 
                    : collections.length === 0
                    ? 'No items to export'
                    : 'Export CSV'
                }
              >
                {exportingCsv ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {/* TODO: Implement CSV import */}}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Import CSV"
              >
                <Upload className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Export Success Message */}
        {exportSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <CheckSquare className="inline h-4 w-4 mr-1" />
              {exportSuccess}
            </p>
          </div>
        )}

        {/* Selection Mode Helper Text */}
        {selectionMode && !hasSelections && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <Package className="inline h-4 w-4 mr-1" />
              Selection mode is active. Click on collection items to select them for bulk operations.
            </p>
          </div>
        )}

        {/* Bulk Actions Helper */}
        {hasSelections && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <CheckSquare className="inline h-4 w-4 mr-1" />
              {selectedItems.length} items selected. Use "Bulk Edit" to update format, condition, or location for all selected items.
            </p>
          </div>
        )}

        {/* Duplicate Alert */}
        {hasDuplicates && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700">
              <AlertTriangle className="inline h-4 w-4 mr-1" />
              Found {duplicateGroups.length} groups of duplicate items. Click "Duplicates" to review and merge them.
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBulkModal && (
        <BulkOperationsModal
          selectedItems={selectedItems}
          onClose={() => setShowBulkModal(false)}
          onUpdate={handleBulkUpdateComplete}
        />
      )}

      {showDuplicateModal && (
        <DuplicateManagement
          duplicateGroups={duplicateGroups}
          onClose={() => setShowDuplicateModal(false)}
          onMerge={onMergeDuplicates}
          onRefresh={onRefreshDuplicates}
        />
      )}
    </>
  );
}