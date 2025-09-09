// src/components/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { User, Download, Upload, Trash2, Key, Shield, Palette, Monitor, Moon, Sun, CheckCircle, AlertCircle, X, FileText, Clock, List } from 'lucide-react';
import { useHARImport } from '../hooks/useHARImport';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

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
      } else {
        setImportHistory(data || []);
      }
    } catch (error) {
      console.error('Error fetching import history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case 'netflix':
        return '🎬';
      case 'hulu':
        return '📺';
      case 'disney':
        return '🏰';
      case 'prime':
        return '📦';
      default:
        return '🎭';
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    return Math.round((progress.current / progress.total) * 100);
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
      
      // Refresh history after successful import
      if (result) {
        fetchImportHistory();
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleCloseModal = () => {
    if (!isImporting) {
      setImportModalOpen(false);
      resetState();
      setSelectedFile(null);
      setImportHistory([]);
    }
  };

  const handleExportWatchlists = () => {
    console.log('Exporting watchlists...');
  };

  const handleBackupData = () => {
    console.log('Creating backup...');
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      console.log('Clearing all data...');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Settings</h1>
          <p className="text-lg text-slate-600">Customize your movie tracking experience</p>
        </div>

        <div className="space-y-8">
          {/* User Profile Section */}
          <section className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-slate-600 mr-2" />
              <h2 className="text-xl font-semibold text-slate-900">User Profile</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Display Name
                </label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
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
            </div>
          </section>
        </div>

        {/* ✅ UPDATED: Import Modal with History Table */}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Import Form */}
                <div>
                  <h4 className="text-md font-medium text-slate-900 mb-4">New Import</h4>
                  
                  {!result && (
                    <>
                      <p className="text-slate-600 mb-4 text-sm">
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
                            Select HAR file:
                          </label>
                          <input
                            type="file"
                            accept=".har"
                            onChange={handleFileSelect}
                            disabled={isImporting}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {selectedFile && (
                            <p className="text-sm text-slate-600 mt-1">
                              Selected: {selectedFile.name}
                            </p>
                          )}
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
                </div>

                {/* Right Column: Import History */}
                <div>
                  <div className="flex items-center mb-4">
                    <List className="w-4 h-4 text-slate-600 mr-2" />
                    <h4 className="text-md font-medium text-slate-900">Import History</h4>
                  </div>
                  
                  {historyLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-slate-500">Loading history...</p>
                    </div>
                  ) : importHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm">No import history yet</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                      <div className="overflow-x-auto max-h-80">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Upload Date/Time
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Streaming Service
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Default Status
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                HAR File Name
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Results
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {importHistory.map((record) => (
                              <tr key={record.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-900">
                                  {formatDateTime(record.upload_datetime)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <div className="flex items-center">
                                    <span className="mr-1">{getServiceIcon(record.streaming_service)}</span>
                                    <span className="text-slate-900 capitalize">{record.streaming_service}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs">
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                    {record.default_status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600" title={record.har_filename}>
                                  {record.har_filename.length > 20 
                                    ? `${record.har_filename.substring(0, 17)}...` 
                                    : record.har_filename
                                  }
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                                  <div className="space-y-1">
                                    <div>{record.movies_added}🎬 {record.tv_series_added}📺</div>
                                    <div className="text-slate-400">({record.total_imported} total)</div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
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