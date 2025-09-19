// src/components/CollectionLinkingAdmin.tsx
// Admin component to link collections to technical specifications

import React, { useState, useEffect } from 'react';
import { 
  Link, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  Zap, 
  BarChart3,
  Play,
  RefreshCw,
  Download,
  Eye,
  X
} from 'lucide-react';
import { collectionLinkingService } from '../services/collectionLinkingService';
import { useAuth } from '../hooks/useAuth';

interface LinkingProgress {
  step: string;
  progress: number;
  total: number;
  message: string;
}

interface LinkingResult {
  totalCollections: number;
  totalTechnicalSpecs: number;
  linkedBefore: number;
  linkedAfter: number;
  newlyLinked: number;
  stillUnlinked: number;
  success: boolean;
  error?: string;
}

export function CollectionLinkingAdmin() {
  const { user } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [progress, setProgress] = useState<LinkingProgress | null>(null);
  const [result, setResult] = useState<LinkingResult | null>(null);
  const [report, setReport] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial report on mount
  useEffect(() => {
    loadReport();
  }, [user]);

  const loadReport = async () => {
    if (!user) return;
    
    try {
      const reportData = await collectionLinkingService.getLinkingReport(user.id);
      setReport(reportData);
    } catch (err) {
      console.error('Error loading report:', err);
    }
  };

  const handleLinkCollections = async () => {
    setIsLinking(true);
    setProgress(null);
    setResult(null);
    setError(null);

    try {
      const linkingResult = await collectionLinkingService.linkAllCollectionsToTechnicalSpecs(
        (progressData) => {
          setProgress(progressData);
        }
      );

      setResult(linkingResult);
      
      // Reload report to show updated data
      await loadReport();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLinking(false);
      setProgress(null);
    }
  };

  const ProgressBar = ({ progress, total, className = '' }: { progress: number; total: number; className?: string }) => {
    const percentage = total > 0 ? (progress / total) * 100 : 0;
    
    return (
      <div className={`w-full bg-slate-200 rounded-full h-2 ${className}`}>
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Link className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Collection Technical Specs Linking</h2>
          </div>
          <button
            onClick={loadReport}
            disabled={isLinking}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh Report"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">What this does:</p>
              <p>This tool links your physical media collections to their technical specifications (video/audio formats, specs, etc.) so they appear properly in CSV exports and collection details.</p>
            </div>
          </div>
        </div>

        {/* Current Statistics */}
        {report && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Total Collections</p>
                  <p className="text-2xl font-bold text-blue-600">{report.summary.total}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Linked to Specs</p>
                  <p className="text-2xl font-bold text-green-600">{report.summary.linked}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-900">Missing Links</p>
                  <p className="text-2xl font-bold text-orange-600">{report.summary.unlinked}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Completion</p>
                  <p className="text-2xl font-bold text-purple-600">{report.summary.percentage}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Progress Display */}
        {isLinking && progress && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">{progress.step}</span>
              <span className="text-sm text-blue-700">{progress.progress}/{progress.total}</span>
            </div>
            <ProgressBar progress={progress.progress} total={progress.total} className="mb-2" />
            <p className="text-sm text-blue-700">{progress.message}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className={`mb-6 p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                <p className="font-medium mb-2">
                  {result.success ? 'Linking completed successfully!' : 'Linking failed'}
                </p>
                {result.success && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p><strong>Total Collections:</strong> {result.totalCollections}</p>
                      <p><strong>Total Technical Specs:</strong> {result.totalTechnicalSpecs}</p>
                    </div>
                    <div>
                      <p><strong>Newly Linked:</strong> {result.newlyLinked}</p>
                      <p><strong>Still Unlinked:</strong> {result.stillUnlinked}</p>
                    </div>
                  </div>
                )}
                {result.error && (
                  <p className="text-red-700 mt-2">{result.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Error occurred:</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLinkCollections}
              disabled={isLinking}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isLinking
                  ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLinking ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Linking...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Link Collections to Technical Specs</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowReport(!showReport)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>{showReport ? 'Hide' : 'Show'} Detailed Report</span>
            </button>
          </div>
        </div>

        {/* Detailed Report */}
        {showReport && report && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900">Detailed Collection Report</h3>
              <button
                onClick={() => setShowReport(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Collection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Technical Specs
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {report.collections.slice(0, 20).map((collection: any) => (
                    <tr key={collection.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{collection.title}</p>
                          {collection.year && (
                            <p className="text-sm text-slate-500">({collection.year})</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {collection.hasSpecs ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Linked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Not Linked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {collection.hasSpecs ? (
                          <div>
                            {collection.videoCodec && (
                              <p><strong>Video:</strong> {collection.videoCodec}</p>
                            )}
                            {collection.audioCodecs && collection.audioCodecs.length > 0 && (
                              <p><strong>Audio:</strong> {collection.audioCodecs.join(', ')}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No specs linked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {report.collections.length > 20 && (
                <p className="text-sm text-slate-500 mt-4">
                  Showing first 20 of {report.collections.length} collections...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}