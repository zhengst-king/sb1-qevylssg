// src/components/CollectionToolbar.tsx - UPDATED WITH CSV IMPORT
import React, { useState } from 'react';
import { 
  Plus, 
  CheckSquare, 
  Download, 
  Upload, 
  Loader, 
  Package, 
  BarChart3, 
  Copy,
  X
} from 'lucide-react';
import { PhysicalMediaCollection } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { csvExportService } from '../services/csvExportService';
import { CSVImportModal } from './CSVImportModal'; // Import the new modal

interface CollectionToolbarProps {
  collections: PhysicalMediaCollection[];
  selectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
  onAddItem: () => void;
  onBulkEdit: () => void;
  onDuplicateManagement: () => void;
  exportSuccess: string | null;
  setExportSuccess: (message: string | null) => void;
  onImportSuccess?: () => void; // NEW: Callback for successful import
}

export function CollectionToolbar({
  collections,
  selectionMode,
  setSelectionMode,
  selectedItems,
  setSelectedItems,
  onAddItem,
  onBulkEdit,
  onDuplicateManagement,
  exportSuccess,
  setExportSuccess,
  onImportSuccess
}: CollectionToolbarProps) {
  const { user } = useAuth();
  const [exportingCsv, setExportingCsv] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // NEW: Import modal state

  const hasSelections = selectedItems.length > 0;
  const allSelected = selectedItems.length === collections.length && collections.length > 0;

  // Count duplicates for the duplicate management button
  const duplicateGroups = React.useMemo(() => {
    const titleGroups = collections.reduce((acc, item) => {
      const key = `${item.title}-${item.format}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, PhysicalMediaCollection[]>);

    return Object.values(titleGroups).filter(group => group.length > 1);
  }, [collections]);

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(collections.map(item => item.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const handleSelectionModeToggle = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) handleClearSelection();
  };

  const handleBulkEditClick = () => {
    onBulkEdit();
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

  // NEW: Handle CSV import success
  const handleImportSuccess = (importedCount: number) => {
    setShowImportModal(false);
    setExportSuccess(`Successfully imported ${importedCount} items from CSV`);
    setTimeout(() => setExportSuccess(null), 5000);
    
    // Trigger parent component refresh if callback provided
    if (onImportSuccess) {
      onImportSuccess();
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
              onClick={handleSelectionModeToggle}
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
                {allSelected ? (
                  <>
                    <X className="h-3 w-3" />
                    <span>Clear All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3 w-3" />
                    <span>Select All</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Right Section - Tools & Actions */}
          <div className="flex items-center space-x-2">
            {/* Bulk Edit - only show when items are selected */}
            {hasSelections && (
              <button
                onClick={onBulkEdit}
                className="inline-flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Package className="h-4 w-4" />
                <span>Bulk Edit ({selectedItems.length})</span>
              </button>
            )}

            {/* Duplicate Management */}
            <button
              onClick={onDuplicateManagement}
              className={`p-2 rounded-lg transition-colors ${
                duplicateGroups.length > 0
                  ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
              disabled={duplicateGroups.length === 0}
              title={
                duplicateGroups.length > 0 
                  ? `Manage ${duplicateGroups.length} duplicate groups`
                  : 'No duplicates found'
              }
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">
                Duplicate Management{duplicateGroups.length > 0 ? ` (${duplicateGroups.length})` : ''}
              </span>
            </button>

            {/* Export/Import Actions */}
            <div className="flex items-center space-x-1">
              {/* CSV Export */}
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

              {/* CSV Import - UPDATED */}
              <button
                onClick={() => setShowImportModal(true)}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Import from CSV"
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
      </div>

      {/* CSV Import Modal - NEW */}
      <CSVImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </>
  );
}