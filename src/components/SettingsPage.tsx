// src/components/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { User, Download, Upload, Trash2, Key, Shield, Palette, Monitor, Moon, Sun, CheckCircle, AlertCircle, X, FileText, Clock, List, Sparkles, Eye } from 'lucide-react';
import { useHARImport } from '../hooks/useHARImport';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { RecommendationPreferencesManager } from './RecommendationPreferencesManager';
import { CollectionLinkingAdmin } from './CollectionLinkingAdmin';
import { Link } from 'lucide-react';

interface ImportHistoryRecord {
  id: string;
  upload_datetime: string;
  streaming_service: string;
  default_status: string;
  har_filename: string;
  movies_added: number;
  tv_series_added: number;
  total_imported: number;
}

export function SettingsPage() {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const [cardsPerRow, setCardsPerRow] = useState('4');
  const [showRatings, setShowRatings] = useState(true);
  const [posterSize, setPosterSize] = useState('medium');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [showLinkingTool, setShowLinkingTool] = useState(false);
  
  // NEW: Recommendation preferences modal state
  const [showRecommendationPrefs, setShowRecommendationPrefs] = useState(false);
  
  // Import state
  const [selectedService, setSelectedService] = useState<'netflix' | 'hulu' | 'disney' | 'prime'>('netflix');
  const [defaultWatchStatus, setDefaultWatchStatus] = useState<'To Watch' | 'Watching' | 'Watched'>('To Watch');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Import history state
  const [importHistory, setImportHistory] = useState<ImportHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const { isImporting, progress, result, error, importFromHAR, resetState } = useHARImport();

  const handleImportMyLists = () => {
    resetState();
    setSelectedFile(null);
    setImportModalOpen(true);
    fetchImportHistory(); // Fetch history when modal opens
  };

  const fetchImportHistory = async () => {
    if (!user) return;
    
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_datetime', { ascending: false })
        .limit(20); // Show last 20 imports

      if (error) {
        console.error('Error fetching import history:', error);
        return;
      }

      setImportHistory(data || []);
    } catch (err) {
      console.error('Error fetching import history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;
    
    try {
      await importFromHAR(selectedFile, selectedService, defaultWatchStatus);
      // Refresh history after successful import
      await fetchImportHistory();
    } catch (error) {
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
    // TODO: Implement export functionality
    alert('Export functionality coming soon!');
  };

  const handleBackupData = () => {
    // TODO: Implement backup functionality
    alert('Backup functionality coming soon!');
  };

  const handleClearAllData = () => {
    const confirm = window.confirm('Are you sure you want to delete all your data? This cannot be undone.');
    if (confirm) {
      // TODO: Implement clear all data functionality
      alert('Clear all data functionality coming soon!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Manage your account, preferences, and data</p>
      </div>

      <div className="space-y-8">
        {/* Account Settings */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-slate-600 mr-2" />
            <h2 className="text-xl font-semibold text-slate-900">Account Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input 
                type="email" 
                value={user?.email || ''}
                disabled
                className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500"
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

        {/* NEW: Smart Recommendations Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Smart Recommendations</h2>
              <p className="text-sm text-slate-600">Customize your recommendation experience</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              Configure how the recommendation system learns your preferences and suggests new movies for your collection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowRecommendationPrefs(true)}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <Sparkles className="h-4 w-4" />
                <span>Manage Recommendation Preferences</span>
              </button>
              
              <button
                onClick={() => window.location.hash = '#recommendations'}
                className="inline-flex items-center space-x-2 px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                <Eye className="h-4 w-4" />
                <span>View Recommendations</span>
              </button>
            </div>

            {/* Quick stats or info */}
            <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-purple-900">How it works</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Our smart recommendation system analyzes your collection to find missing movies from franchises you collect, 
                    format upgrades for your favorites, and similar titles you might love. The more you use it, the better it gets!
                  </p>
                </div>
              </div>
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
              className="flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Backup Data
            </button>
            
            <button 
              onClick={handleClearAllData}
              className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </button>

            <button 
  onClick={() => setShowLinkingTool(true)}
  className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
>
  <Link className="w-4 h-4 mr-2" />
  Fix Technical Specs
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
                className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="3">3 cards</option>
                <option value="4">4 cards</option>
                <option value="5">5 cards</option>
                <option value="6">6 cards</option>
              </select>
            </div>

            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="show-ratings"
                checked={showRatings}
                onChange={(e) => setShowRatings(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="show-ratings" className="ml-2 text-sm text-slate-700">
                Show ratings on cards
              </label>
            </div>
          </div>
        </section>

        {/* Security & Privacy Section */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-slate-600 mr-2" />
            <h2 className="text-xl font-semibold text-slate-900">Security & Privacy</h2>
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
        </section>
      </div>

      {/* Import Modal (existing) */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
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
                  <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                  <span className="text-red-800 text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Show import result */}
            {result && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                  <div className="text-green-800 text-sm">
                    <div className="font-medium mb-2">Import completed successfully!</div>
                    <div className="space-y-1">
                      <div>Movies added: {result.moviesAdded}</div>
                      <div>TV series added: {result.tvSeriesAdded}</div>
                      <div>Total items processed: {result.totalProcessed}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!result && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Streaming Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value as typeof selectedService)}
                    disabled={isImporting}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="netflix">Netflix</option>
                    <option value="hulu">Hulu</option>
                    <option value="disney">Disney+</option>
                    <option value="prime">Prime Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Default Watch Status
                  </label>
                  <select
                    value={defaultWatchStatus}
                    onChange={(e) => setDefaultWatchStatus(e.target.value as typeof defaultWatchStatus)}
                    disabled={isImporting}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="To Watch">To Watch</option>
                    <option value="Watching">Watching</option>
                    <option value="Watched">Watched</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    HAR File
                  </label>
                  <input
                    type="file"
                    accept=".har"
                    onChange={handleFileChange}
                    disabled={isImporting}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  {selectedFile && (
                    <p className="text-sm text-slate-600 mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importing...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Import History */}
                {importHistory.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Import History
                    </h4>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Service</th>
                            <th className="px-3 py-2 text-left">Movies</th>
                            <th className="px-3 py-2 text-left">TV Shows</th>
                            <th className="px-3 py-2 text-left">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importHistory.map((record) => (
                            <tr key={record.id} className="border-t border-slate-200">
                              <td className="px-3 py-2">
                                {new Date(record.upload_datetime).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 capitalize">{record.streaming_service}</td>
                              <td className="px-3 py-2">{record.movies_added}</td>
                              <td className="px-3 py-2">{record.tv_series_added}</td>
                              <td className="px-3 py-2 font-medium">{record.total_imported}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal buttons */}
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

      {/* NEW: Recommendation Preferences Modal */}
      {showRecommendationPrefs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Recommendation Preferences</h3>
              <button 
                onClick={() => setShowRecommendationPrefs(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0">
              <RecommendationPreferencesManager />
            </div>
          </div>
        </div>
      )}

      {/* Collection Technical Specs Linking Tool Modal */}
{showLinkingTool && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[95vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Fix Technical Specifications Linking</h3>
        <button 
          onClick={() => setShowLinkingTool(false)}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-0">
        <CollectionLinkingAdmin />
      </div>
    </div>
  );
}