// src/components/SettingsPage.tsx
import React, { useState } from 'react';
import { User, Download, Upload, Trash2, Key, Shield, Palette, Monitor, Moon, Sun, CheckCircle, AlertCircle, X, FileText } from 'lucide-react';
import { useHARImport } from '../hooks/useHARImport';

export function SettingsPage() {
  const [theme, setTheme] = useState('light');
  const [cardsPerRow, setCardsPerRow] = useState('4');
  const [showRatings, setShowRatings] = useState(true);
  const [posterSize, setPosterSize] = useState('medium');
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  // Import state
  const [selectedService, setSelectedService] = useState<'netflix' | 'hulu' | 'disney' | 'prime'>('netflix');
  const [defaultWatchStatus, setDefaultWatchStatus] = useState<'To Watch' | 'Watching' | 'Watched'>('To Watch');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { isImporting, progress, result, error, importFromHAR, resetState } = useHARImport();

  const handleImportMyLists = () => {
    resetState();
    setSelectedFile(null);
    setImportModalOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleStartImport = async () => {
    if (!selectedFile) {
      alert('Please select a HAR file');
      return;
    }

    try {
      await importFromHAR({
        streamingService: selectedService,
        defaultWatchStatus,
        file: selectedFile
      });
    } catch (error) {
      // Error is handled by the hook
      console.error('Import failed:', error);
    }
  };

  const handleCloseModal = () => {
    if (!isImporting) {
      setImportModalOpen(false);
      resetState();
      setSelectedFile(null);
    }
  };

  const handleExportWatchlists = () => {
    // Export functionality to be implemented
    console.log('Exporting watchlists...');
  };

  const handleBackupData = () => {
    // Backup functionality to be implemented
    console.log('Creating backup...');
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear data functionality to be implemented
      console.log('Clearing all data...');
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)}KB`;
    }
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>
        
        <div className="space-y-8">
          {/* Account & Profile Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-slate-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">Account & Profile</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Profile Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
              
              <div className="flex space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Update Profile
                </button>
                <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors">
                  Change Password
                </button>
              </div>
            </div>
          </section>

          {/* Data Management Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Download className="w-5 h-5 text-slate-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">Data Management</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={handleImportMyLists}
                className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import My Lists
              </button>
              
              <button 
                onClick={handleExportWatchlists}
                className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Watchlists
              </button>
              
              <button 
                onClick={handleBackupData}
                className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                Backup Data
              </button>
              
              <button 
                onClick={handleClearAllData}
                className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </button>
            </div>
          </section>

          {/* Display Settings Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Palette className="w-5 h-5 text-slate-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">Display Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                <div className="flex space-x-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                      theme === 'light' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                      theme === 'dark' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </button>
                  <button 
                    onClick={() => setTheme('auto')}
                    className={`flex items-center px-4 py-2 rounded-md border transition-colors ${
                      theme === 'auto' 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Auto
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cards per row</label>
                <select 
                  value={cardsPerRow}
                  onChange={(e) => setCardsPerRow(e.target.value)}
                  className="w-48 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="2">2 cards</option>
                  <option value="3">3 cards</option>
                  <option value="4">4 cards</option>
                  <option value="5">5 cards</option>
                  <option value="6">6 cards</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Poster size</label>
                <select 
                  value={posterSize}
                  onChange={(e) => setPosterSize(e.target.value)}
                  className="w-48 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="showRatings"
                  checked={showRatings}
                  onChange={(e) => setShowRatings(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="showRatings" className="ml-2 text-sm font-medium text-slate-700">
                  Show ratings on cards
                </label>
              </div>
            </div>
          </section>

          {/* API & Services Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Key className="w-5 h-5 text-slate-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">API & Services</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">OMDb API Key (Optional)</label>
                <input 
                  type="password" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your OMDb API key for better performance"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Providing your own API key removes rate limits and improves performance
                </p>
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="enableExternalRatings"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="enableExternalRatings" className="ml-2 text-sm font-medium text-slate-700">
                  Enable external rating sources
                </label>
              </div>
            </div>
          </section>

          {/* Privacy & Security Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Shield className="w-5 h-5 text-slate-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">Privacy & Security</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="shareData"
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="shareData" className="ml-2 text-sm font-medium text-slate-700">
                  Allow anonymous usage data collection
                </label>
              </div>
              
              <div className="space-y-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  View active sessions
                </button>
                <br />
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  Privacy policy
                </button>
                <br />
                <button className="text-red-600 hover:text-red-800 text-sm">
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Import Modal */}
        {importModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Import My Lists</h3>
                {!isImporting && (
                  <button 
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Show error if any */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Show success result */}
              {result && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-green-700 font-medium">Import Successful!</span>
                  </div>
                  <div className="text-sm text-green-600 space-y-1">
                    <p>• {result.summary.moviesAdded} movies added</p>
                    <p>• {result.summary.tvSeriesAdded} TV series added</p>
                    {result.summary.enrichmentFailed > 0 && (
                      <p>• {result.summary.enrichmentFailed} titles could not be enriched with OMDb data</p>
                    )}
                  </div>
                </div>
              )}

              {/* Import form */}
              {!result && (
                <>
                  <p className="text-slate-600 mb-4">
                    Import your watchlists from streaming services using HAR files.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select streaming service:
                      </label>
                      <select 
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value as any)}
                        disabled={isImporting}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      >
                        <option value="netflix">Netflix</option>
                        <option value="hulu" disabled>Hulu (Coming Soon)</option>
                        <option value="disney" disabled>Disney+ (Coming Soon)</option>
                        <option value="prime" disabled>Prime Video (Coming Soon)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Default status for imported titles:
                      </label>
                      <select 
                        value={defaultWatchStatus}
                        onChange={(e) => setDefaultWatchStatus(e.target.value as any)}
                        disabled={isImporting}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      >
                        <option value="To Watch">To Watch</option>
                        <option value="Watching">Currently Watching</option>
                        <option value="Watched">Already Watched</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Upload HAR file:
                      </label>
                      <input 
                        type="file" 
                        accept=".har"
                        onChange={handleFileSelect}
                        disabled={isImporting}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-500">
                          Max file size: 200MB
                        </p>
                        {selectedFile && (
                          <div className="flex items-center text-xs text-slate-600">
                            <FileText className="w-3 h-3 mr-1" />
                            {selectedFile.name} ({formatFileSize(selectedFile.size)})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Progress indicator */}
              {isImporting && progress && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700">
                      {progress.message}
                    </span>
                    <span className="text-sm text-slate-500">
                      {getProgressPercentage()}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    {progress.currentTitle && `Processing: ${progress.currentTitle}`}
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    Phase: {progress.phase} ({progress.current}/{progress.total})
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                {result ? (
                  <button 
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleCloseModal}
                      disabled={isImporting}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleStartImport}
                      disabled={isImporting || !selectedFile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isImporting ? 'Importing...' : 'Import'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}