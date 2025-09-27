// src/components/JobProcessorMonitor.tsx
// Simple monitoring component for the background job processor
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react';
import { integrationService } from '../services/integrationService';

interface SystemStatus {
  jobProcessor: {
    running: boolean;
    stats: any;
  };
  database: {
    connected: boolean;
    episodeCount: number;
    seriesCount: number;
  };
  lastSync: Date | null;
}

export function JobProcessorMonitor() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [queueDetails, setQueueDetails] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize the system on component mount
  useEffect(() => {
    const initializeSystem = async () => {
      console.log('[Monitor] Initializing system...');
      const result = await integrationService.initialize();
      setIsInitialized(result.success);
      
      if (result.success) {
        console.log('[Monitor] ✅ System initialized successfully');
        loadData();
      } else {
        console.error('[Monitor] ❌ System initialization failed:', result.message);
      }
      
      setLoading(false);
    };

    initializeSystem();
  }, []);

  // Load monitoring data
  const loadData = async () => {
    try {
      const [statusData, activityData, queueData] = await Promise.all([
        integrationService.getSystemStatus(),
        integrationService.getRecentActivity(),
        integrationService.getQueueDetails()
      ]);

      setStatus(statusData);
      setRecentActivity(activityData);
      setQueueDetails(queueData);
    } catch (error) {
      console.error('[Monitor] Error loading data:', error);
    }
  };

  // Auto-refresh data every 5 seconds
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [isInitialized]);

  const addTestSeries = async () => {
    const testSeries = [
      { imdbId: 'tt0944947', title: 'Game of Thrones' },
      { imdbId: 'tt0903747', title: 'Breaking Bad' },
      { imdbId: 'tt1475582', title: 'Sherlock' },
      { imdbId: 'tt2306299', title: 'Vikings' },
      { imdbId: 'tt2560140', title: 'Attack on Titan' }
    ];

    const randomSeries = testSeries[Math.floor(Math.random() * testSeries.length)];
    
    const result = await integrationService.queueSeriesDiscovery(
      randomSeries.imdbId,
      randomSeries.title,
      'high'
    );

    console.log('[Monitor] Added test series:', result);
    loadData(); // Refresh data immediately
  };

  const clearFailedJobs = async () => {
    const result = await integrationService.clearFailedJobs();
    console.log('[Monitor] Cleared failed jobs:', result);
    loadData();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span>Initializing background job processor...</span>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">System initialization failed</span>
        </div>
        <p className="text-red-600 text-sm mt-2">
          Check console for details. Make sure your database is properly configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Episode Discovery Monitor</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={addTestSeries}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Add Test Series
            </button>
            <button
              onClick={clearFailedJobs}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Clear Failed
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job Processor Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Job Processor</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Running</span>
              </span>
            </div>
            {status?.jobProcessor.stats && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Queue Length:</span>
                  <span className="font-medium">{status.jobProcessor.stats.queueLength}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Processing:</span>
                  <span className="font-medium">
                    {status.jobProcessor.stats.isProcessing ? 'Yes' : 'No'}
                  </span>
                </div>
                {status.jobProcessor.stats.currentJob && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Job:</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {status.jobProcessor.stats.currentJob}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Database</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">Connected</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Episodes Cached:</span>
              <span className="font-medium">{status?.database.episodeCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Series Tracked:</span>
              <span className="font-medium">{status?.database.seriesCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Queue Statistics */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Queue Stats</h3>
          </div>
          {queueDetails && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Queued:</span>
                <span className="text-blue-600 font-medium">{queueDetails.summary.queued}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing:</span>
                <span className="text-yellow-600 font-medium">{queueDetails.summary.processing}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed:</span>
                <span className="text-green-600 font-medium">{queueDetails.summary.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Failed:</span>
                <span className="text-red-600 font-medium">{queueDetails.summary.failed}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {activity.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {activity.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  {activity.status === 'processing' && <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />}
                  {activity.status === 'queued' && <Clock className="h-4 w-4 text-gray-600" />}
                  
                  <div>
                    <div className="font-medium text-gray-900">
                      {activity.series_title || activity.series_imdb_id}
                    </div>
                    <div className="text-sm text-gray-600">
                      {activity.status === 'completed' && activity.progress && (
                        `${activity.progress.totalEpisodes} episodes discovered`
                      )}
                      {activity.status === 'failed' && activity.error_message && (
                        `Error: ${activity.error_message}`
                      )}
                      {activity.status === 'processing' && 'Currently processing...'}
                      {activity.status === 'queued' && 'Waiting in queue'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p>No recent activity</p>
              <p className="text-sm">Add a test series to start episode discovery</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">How It Works</h3>
            <div className="text-blue-800 text-sm space-y-1">
              <p>• When you click "Episodes" on a TV series, it gets added to the discovery queue</p>
              <p>• The background processor automatically fetches episode data from OMDb API</p>
              <p>• Episodes are cached in the database and become instantly available</p>
              <p>• The system handles rate limiting and retries failed requests automatically</p>
              <p>• Click "Add Test Series" to see the system in action!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}