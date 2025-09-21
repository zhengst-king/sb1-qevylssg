// src/components/ImportListsModal.tsx - UPDATED WITH CONSOLIDATED OPTIONS
import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Database,
  FileText,
  Cloud
} from 'lucide-react';
import { CSVImportModal } from './CSVImportModal';
import { useAuth } from '../hooks/useAuth';

interface ImportListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageType: 'collections' | 'movies' | 'tv-series';
}

export function ImportListsModal({ isOpen, onClose, pageType }: ImportListsModalProps) {
  const { user } = useAuth();
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);

  if (!isOpen) return null;

  const getPageTitle = () => {
    switch (pageType) {
      case 'collections': return 'My Disc Collections';
      case 'movies': return 'Movie Watchlist';
      case 'tv-series': return 'TV Series Watchlist';
      default: return 'Lists';
    }
  };

  // Consolidated import options (reduced from 6 to 3)
  const importOptions = [
    {
      id: 'csv',
      name: 'CSV/Excel Import',
      description: 'Upload CSV or Excel files from IMDb, Letterboxd, or custom formats',
      icon: FileText,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600',
      coming: false,
      subtitle: 'Supports: IMDb exports, Letterboxd exports, Excel files'
    },
    {
      id: 'airtable',
      name: 'Airtable',
      description: 'Connect to your Airtable base',
      icon: Database,
      color: 'bg-red-50 hover:bg-red-100 border-red-200',
      iconColor: 'text-red-600',
      coming: true
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Import from Google Sheets',
      icon: Cloud,
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      iconColor: 'text-green-600',
      coming: true
    }
  ];

  const handleImportClick = (optionId: string) => {
    if (optionId === 'csv') {
      // Open our enhanced CSV import modal
      onClose(); // Close the selection modal
      setShowCSVImportModal(true); // Open CSV import modal
    } else {
      // Show coming soon for other options
      alert(`${optionId.charAt(0).toUpperCase() + optionId.slice(1)} import coming soon!`);
    }
  };

  const handleCSVImportSuccess = (importedCount: number) => {
    setShowCSVImportModal(false);
    // You might want to trigger a refresh of the parent component here
    // The parent component should handle this through props if needed
  };

  return (
    <>
      {/* Main Import Selection Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={onClose}
          />

          {/* Modal panel */}
          <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Upload className="h-5 w-5 text-blue-600 mr-2" />
                  Import Lists to {getPageTitle()}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Choose your import source to add items to your {pageType === 'collections' ? 'collection' : 'watchlist'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Import Options Grid - Now showing 3 consolidated options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {importOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleImportClick(option.id)}
                    disabled={option.coming}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${option.color} ${
                      option.coming 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-white ${option.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 flex items-center">
                          {option.name}
                          {option.coming && (
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </p>
                        {option.subtitle && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            {option.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Enhanced Help Text */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">💡 Import Tips</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• <strong>IMDb:</strong> Go to "Your Ratings" → Export → Download CSV</li>
                <li>• <strong>Letterboxd:</strong> Settings → Account Export → Download ZIP</li>
                <li>• <strong>Excel files:</strong> Save as CSV format before importing</li>
                <li>• <strong>Template available:</strong> Download our template for proper formatting</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Your data will be processed securely and added to your {pageType === 'collections' ? 'collection' : 'watchlist'}.
                </p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced CSV Import Modal - Opens when CSV/Excel option is selected */}
      <CSVImportModal
        isOpen={showCSVImportModal}
        onClose={() => setShowCSVImportModal(false)}
        onSuccess={handleCSVImportSuccess}
      />
    </>
  );
}