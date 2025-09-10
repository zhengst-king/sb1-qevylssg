import React from 'react';
import { Download, Clock, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useTechnicalSpecs } from '../hooks/useTechnicalSpecs';

interface TechnicalSpecsRequestProps {
  title: string;
  year?: number;
  discFormat?: string;
  collectionItemId?: string;
  compact?: boolean;
}

export function TechnicalSpecsRequest({ 
  title, 
  year, 
  discFormat, 
  collectionItemId,
  compact = false 
}: TechnicalSpecsRequestProps) {
  const { 
    scrapingJob, 
    requesting, 
    requestSpecs, 
    isProcessing, 
    isPending, 
    hasFailed 
  } = useTechnicalSpecs(title, year, discFormat, collectionItemId);

  const handleRequest = async () => {
    const success = await requestSpecs(1); // Normal priority
    if (success) {
      // Could show a toast notification here
      console.log('Technical specs requested successfully');
    }
  };

  if (compact) {
    if (isPending) {
      return (
        <div className="flex items-center space-x-1 text-xs text-yellow-600">
          <Clock className="h-3 w-3" />
          <span>Specs pending</span>
        </div>
      );
    }

    if (isProcessing) {
      return (
        <div className="flex items-center space-x-1 text-xs text-blue-600">
          <Loader className="h-3 w-3 animate-spin" />
          <span>Getting specs...</span>
        </div>
      );
    }

    if (hasFailed) {
      return (
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          <AlertCircle className="h-3 w-3" />
          <span>Retry specs</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleRequest}
        disabled={requesting}
        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
      >
        <Download className="h-3 w-3" />
        <span>{requesting ? 'Requesting...' : 'Get specs'}</span>
      </button>
    );
  }

  // Full size component
  if (isPending) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Clock className="h-5 w-5 text-yellow-600" />
          <div>
            <h4 className="font-medium text-yellow-800">Technical Specs Requested</h4>
            <p className="text-sm text-yellow-700">
              Your request is in the queue. We'll gather detailed technical specifications shortly.
            </p>
            {scrapingJob && (
              <p className="text-xs text-yellow-600 mt-1">
                Requested {new Date(scrapingJob.created_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Loader className="h-5 w-5 text-blue-600 animate-spin" />
          <div>
            <h4 className="font-medium text-blue-800">Gathering Technical Specs</h4>
            <p className="text-sm text-blue-700">
              We're currently collecting detailed technical specifications for this title.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This usually takes 1-2 minutes...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasFailed) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <h4 className="font-medium text-red-800">Specs Request Failed</h4>
              <p className="text-sm text-red-700">
                We couldn't find detailed technical specifications for this title.
              </p>
              {scrapingJob?.error_message && (
                <p className="text-xs text-red-600 mt-1">
                  {scrapingJob.error_message}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {requesting ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // Default state - no specs requested yet
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Download className="h-5 w-5 text-slate-600" />
          <div>
            <h4 className="font-medium text-slate-800">Get Technical Specifications</h4>
            <p className="text-sm text-slate-600">
              Get detailed audio, video, and disc specifications from Blu-ray.com
            </p>
          </div>
        </div>
        <button
          onClick={handleRequest}
          disabled={requesting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {requesting ? (
            <div className="flex items-center space-x-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Requesting...</span>
            </div>
          ) : (
            'Get Specs'
          )}
        </button>
      </div>
    </div>
  );
}