// src/components/ImportListsModal.tsx - ENHANCED VERSION WITH INLINE IMPORT SECTION
import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Database,
  FileText,
  Cloud,
  ArrowLeft,
  File,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { csvImportService } from '../services/csvImportService';

interface ImportListsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageType: 'collections' | 'movies' | 'tv-series';
  onImportSuccess?: () => void;
}

type ImportType = 'csv' | 'airtable' | 'google-sheets' | null;

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  notEnriched: Array<{title: string, year?: number}>;
}

export function ImportListsModal({ 
  isOpen, 
  onClose, 
  pageType,
  onImportSuccess 
}: ImportListsModalProps) {
  const { user } = useAuth();
  const [selectedImportType, setSelectedImportType] = useState<ImportType>(null);
  
  // CSV Import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  const getPageTitle = () => {
    switch (pageType) {
      case 'collections': return 'My Disc Collections';
      case 'movies': return 'Movie Watchlist';
      case 'tv-series': return 'TV Series Watchlist';
      default: return 'Lists';
    }
  };

  // Import options
  const importOptions = [
    {
      id: 'csv' as const,
      name: 'CSV/Excel Import',
      description: 'Upload CSV or Excel files from IMDb, Letterboxd, or custom formats',
      icon: FileText,
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      iconColor: 'text-blue-600',
      coming: false,
      subtitle: 'Supports: IMDb exports, Letterboxd exports, Excel files'
    },
    {
      id: 'airtable' as const,
      name: 'Airtable',
      description: 'Connect to your Airtable base',
      icon: Database,
      color: 'bg-red-50 hover:bg-red-100 border-red-200',
      iconColor: 'text-red-600',
      coming: true
    },
    {
      id: 'google-sheets' as const,
      name: 'Google Sheets',
      description: 'Import from Google Sheets',
      icon: Cloud,
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      iconColor: 'text-green-600',
      coming: true
    }
  ];

  const handleImportClick = (optionId: ImportType) => {
    if (optionId === 'csv') {
      setSelectedImportType('csv');
    } else {
      // Show coming soon for other options
      alert(`${optionId?.charAt(0).toUpperCase() + optionId?.slice(1)} import coming soon!`);
    }
  };

  const handleBackToOptions = () => {
    setSelectedImportType(null);
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleClose = () => {
    setSelectedImportType(null);
    setSelectedFile(null);
    setImportResult(null);
    onClose();
  };

  // CSV Import functions
  const handleFileSelect = (file: File) => {
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setImportResult(null);
    } else {
      alert('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const processImport = async () => {
    if (!selectedFile || !user) return;

    setIsProcessing(true);
    try {
      const result = await csvImportService.importFromFile(selectedFile, {
        userId: user.id,
        pageType,
        enrichData: true,
        skipDuplicates: true
      });

      setImportResult(result);
      
      if (result.success > 0 && onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        notEnriched: []
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              {selectedImportType && (
                <button
                  onClick={handleBackToOptions}
                  className="mr-3 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Upload className="h-5 w-5 text-blue-600 mr-2" />
                  {selectedImportType ? 'CSV/Excel Import' : `Import Lists to ${getPageTitle()}`}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedImportType 
                    ? 'Upload your CSV or Excel file to import items'
                    : `Choose your import source to add items to your ${pageType === 'collections' ? 'collection' : 'watchlist'}`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content based on selected import type */}
          {!selectedImportType ? (
            // Import Options Selection
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

              {/* Help Text */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">💡 Import Tips</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• <strong>IMDb:</strong> Go to "Your Ratings" → Export → Download CSV</li>
                  <li>• <strong>Letterboxd:</strong> Settings → Account Export → Download ZIP</li>
                  <li>• <strong>Excel files:</strong> Save as CSV format before importing</li>
                  <li>• <strong>Template available:</strong> Download our template for proper formatting</li>
                </ul>
              </div>
            </>
          ) : selectedImportType === 'csv' ? (
            // CSV Import Section
            <div className="space-y-6">
              {!importResult ? (
                <>
                  {/* File Upload Area */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : selectedFile
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-green-900">{selectedFile.name}</p>
                          <p className="text-sm text-green-600">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready to import
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-sm text-green-600 hover:text-green-800 underline"
                        >
                          Choose different file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <File className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            Drop your CSV/Excel file here
                          </p>
                          <p className="text-sm text-gray-500">
                            or click to browse files
                          </p>
                        </div>
                        <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
                          <span>Supports:</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">.csv</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">.xlsx</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">.xls</span>
                        </div>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {/* Import Button */}
                  {selectedFile && (
                    <div className="flex justify-center">
                      <button
                        onClick={processImport}
                        disabled={isProcessing}
                        className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                          isProcessing
                            ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            <span>Processing Import...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5" />
                            <span>Import {selectedFile.name}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                // Import Results
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Results</h3>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                        <p className="text-sm text-green-700">Successfully Added</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                        <p className="text-sm text-red-700">Failed to Add</p>
                      </div>
                    </div>
                  </div>

                  {/* Errors */}
                  {importResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900">Import Issues ({importResult.failed})</h4>
                          <ul className="text-sm text-red-700 mt-2 space-y-1">
                            {importResult.errors.slice(0, 5).map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                            {importResult.errors.length > 5 && (
                              <li className="font-medium">... and {importResult.errors.length - 5} more issues</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {importResult.success > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-700">
                            <strong>Success!</strong> {importResult.success} items have been added to your {pageType === 'collections' ? 'collection' : 'watchlist'}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleBackToOptions}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Import More Files
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Footer (only show for options screen) */}
          {!selectedImportType && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Your data will be processed securely and added to your {pageType === 'collections' ? 'collection' : 'watchlist'}.
                </p>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}