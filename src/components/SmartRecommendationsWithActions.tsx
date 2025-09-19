// src/components/SmartRecommendationsWithActions.tsx
import React, { useState } from 'react';
import { 
  Heart, Package, X, CheckCircle, AlertTriangle, Sparkles, 
  Star, Calendar, Play, RefreshCw, TrendingUp, 
  Eye, Target, Zap, Info
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollections } from '../hooks/useCollections';

// ✅ FIXED: Use proper ES6 imports instead of require()
let smartRecommendationsService: any = null;
let serviceImportError: string | null = null;

try {
  // Use dynamic import for better compatibility
  import('../services/smartRecommendationsService').then((module) => {
    smartRecommendationsService = module.smartRecommendationsService;
    console.log('[Fixed] Service imported successfully via ES6:', !!smartRecommendationsService);
  }).catch((error) => {
    serviceImportError = error.message;
    console.warn('[Fixed] Service import failed:', error);
  });
} catch (error) {
  serviceImportError = error.message;
  console.error('[Fixed] Service import failed:', error);
}

// Define types locally
type FeedbackReason = 'not_my_genre' | 'already_seen' | 'too_expensive' | 'not_available' | 'poor_quality' | 'other';

// Mock recommendation data for fallback
const mockRecommendations = [
  {
    imdb_id: 'tt0111161',
    title: 'The Shawshank Redemption',
    year: 1994,
    genre: 'Drama',
    director: 'Frank Darabont',
    poster_url: 'https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg',
    imdb_rating: 9.3,
    recommendation_type: 'similar_title',
    reasoning: 'Based on your collection of drama films, this highly-rated classic would be a perfect addition.',
    score: {
      relevance: 0.9,
      confidence: 0.85,
      urgency: 0.6
    }
  },
  {
    imdb_id: 'tt0068646',
    title: 'The Godfather',
    year: 1972,
    genre: 'Crime, Drama',
    director: 'Francis Ford Coppola',
    poster_url: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzAwOTU2ODE@._V1_SX300.jpg',
    imdb_rating: 9.2,
    recommendation_type: 'collection_gap',
    reasoning: 'You\'re missing this essential classic from your crime drama collection.',
    score: {
      relevance: 0.95,
      confidence: 0.9,
      urgency: 0.7
    }
  }
];

interface ActionButton {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

interface FeedbackModal {
  isOpen: boolean;
  recommendation: any | null;
}

interface DiagnosticInfo {
  serviceAvailable: boolean;
  serviceError: string | null;
  collectionCount: number;
  collectionSample: any[];
  omdbConfigured: boolean;
  lastError: string | null;
}

// Action Button Component
const ActionButtonComponent: React.FC<ActionButton> = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant, 
  loading = false, 
  disabled = false 
}) => {
  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800",
    secondary: "bg-slate-200 text-slate-700 hover:bg-slate-300 active:bg-slate-400",
    danger: "bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span>{loading ? 'Processing...' : label}</span>
    </button>
  );
};

// Diagnostic Panel Component
const DiagnosticPanel: React.FC<{ 
  diagnostic: DiagnosticInfo;
  isVisible: boolean;
  onToggle: () => void;
}> = ({ diagnostic, isVisible, onToggle }) => {
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="mb-4 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
      >
        <Info className="h-4 w-4 inline mr-2" />
        Show Diagnostics
      </button>
    );
  }

  return (
    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Diagnostic Information
        </h3>
        <button
          onClick={onToggle}
          className="text-slate-500 hover:text-slate-700 text-sm"
        >
          Hide
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium mb-2">Service Status</h4>
          <ul className="space-y-1">
            <li className={`flex items-center gap-2 ${diagnostic.serviceAvailable ? 'text-green-700' : 'text-red-700'}`}>
              <span className={`w-2 h-2 rounded-full ${diagnostic.serviceAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
              Service Available: {diagnostic.serviceAvailable ? 'Yes' : 'No'}
            </li>
            <li className={`flex items-center gap-2 ${diagnostic.omdbConfigured ? 'text-green-700' : 'text-red-700'}`}>
              <span className={`w-2 h-2 rounded-full ${diagnostic.omdbConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
              OMDB Configured: {diagnostic.omdbConfigured ? 'Yes' : 'No'}
            </li>
          </ul>
          
          {diagnostic.serviceError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              <strong>Import Error:</strong> {diagnostic.serviceError}
            </div>
          )}
          
          {diagnostic.lastError && (
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-700 text-xs">
              <strong>Runtime Error:</strong> {diagnostic.lastError}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2">Collection Data</h4>
          <ul className="space-y-1">
            <li>Count: {diagnostic.collectionCount}</li>
            <li>Sample Data Available: {diagnostic.collectionSample.length > 0 ? 'Yes' : 'No'}</li>
          </ul>
          
          {diagnostic.collectionSample.length > 0 && (
            <div className="mt-2 p-2 bg-slate-100 rounded text-xs">
              <strong>Sample Item:</strong>
              <div className="mt-1 font-mono text-xs bg-white p-2 rounded overflow-x-auto">
                Title: {diagnostic.collectionSample[0]?.title || 'N/A'}<br/>
                IMDB ID: {diagnostic.collectionSample[0]?.imdb_id || 'N/A'}<br/>
                Year: {diagnostic.collectionSample[0]?.year || 'N/A'}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Import Status */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-medium text-blue-900 mb-2">🔧 Import Method: ES6 Dynamic Import (Fixed)</h4>
        <p className="text-blue-800 text-sm">
          Previous issue: Used Node.js <code className="bg-blue-100 px-1 rounded">require()</code> in browser.<br/>
          <strong>Fixed:</strong> Now using ES6 <code className="bg-blue-100 px-1 rounded">import()</code> for compatibility.
        </p>
      </div>
    </div>
  );
};

// Recommendation Card Component (same as before but shorter for brevity)
const RecommendationCard: React.FC<{
  recommendation: any;
  onAddToWishlist: () => void;
  onMarkAsOwned: () => void;
  onDismiss: () => void;
  loading: boolean;
  hasActed: boolean;
}> = ({ recommendation, onAddToWishlist, onMarkAsOwned, onDismiss, loading, hasActed }) => {
  
  const getReasoningIcon = (type: string) => {
    switch (type) {
      case 'collection_gap': return <Target className="h-4 w-4 text-orange-600" />;
      case 'format_upgrade': return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'similar_title': return <Sparkles className="h-4 w-4 text-purple-600" />;
      default: return <Eye className="h-4 w-4 text-slate-600" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'collection_gap': return 'Complete Your Collection';
      case 'format_upgrade': return 'Format Upgrade';
      case 'similar_title': return 'Similar Title';
      default: return 'Recommended';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200">
      <div className="flex">
        {/* Poster */}
        <div className="flex-shrink-0 w-32 h-48 bg-slate-100">
          {recommendation.poster_url ? (
            <img
              src={recommendation.poster_url}
              alt={recommendation.title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getReasoningIcon(recommendation.recommendation_type)}
                <span className="text-sm font-medium text-slate-600">
                  {getTypeLabel(recommendation.recommendation_type)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {recommendation.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                {recommendation.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {recommendation.year}
                  </span>
                )}
                {recommendation.imdb_rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {recommendation.imdb_rating}/10
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Confidence</div>
              <div className="text-lg font-bold text-purple-600">
                {Math.round((recommendation.score?.confidence || 0) * 100)}%
              </div>
            </div>
          </div>

          {recommendation.genre && (
            <p className="text-sm text-slate-600 mb-2">
              <span className="font-medium">Genre:</span> {recommendation.genre}
            </p>
          )}
          
          {recommendation.director && (
            <p className="text-sm text-slate-600 mb-3">
              <span className="font-medium">Director:</span> {recommendation.director}
            </p>
          )}

          <div className="bg-slate-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Why we recommend this:</span><br />
              {recommendation.reasoning}
            </p>
          </div>

          {hasActed ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">
                You've already acted on this recommendation
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <ActionButtonComponent
                icon={Heart}
                label="Add to Wishlist"
                onClick={onAddToWishlist}
                variant="primary"
                loading={loading}
              />
              <ActionButtonComponent
                icon={Package}
                label="Already Own"
                onClick={onMarkAsOwned}
                variant="secondary"
                loading={loading}
              />
              <ActionButtonComponent
                icon={X}
                label="Not Interested"
                onClick={onDismiss}
                variant="danger"
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Feedback Modal Component (same as before)
const FeedbackModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: FeedbackReason, comment?: string) => void;
  loading: boolean;
}> = ({ isOpen, onClose, onSubmit, loading }) => {
  const [selectedReason, setSelectedReason] = useState<FeedbackReason>('not_my_genre');
  const [comment, setComment] = useState('');

  const reasons: { value: FeedbackReason; label: string }[] = [
    { value: 'not_my_genre', label: "Not my genre" },
    { value: 'already_seen', label: "Already seen/owned" },
    { value: 'too_expensive', label: "Too expensive" },
    { value: 'not_available', label: "Not available to buy" },
    { value: 'poor_quality', label: "Poor quality/reviews" },
    { value: 'other', label: "Other" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason, comment.trim() || undefined);
    setComment('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Why not interested?</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {reasons.map(reason => (
              <label key={reason.value} className="flex items-center">
                <input
                  type="radio"
                  name="reason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={(e) => setSelectedReason(e.target.value as FeedbackReason)}
                  className="mr-2"
                />
                {reason.label}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Additional feedback (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-md"
              rows={3}
              placeholder="Help us improve our recommendations..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Component
export const SmartRecommendationsWithActions: React.FC = () => {
  const { user } = useAuth();
  const { collections = [], addToCollection } = useCollections() || { collections: [], addToCollection: null };
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [isRealMode, setIsRealMode] = useState(false);
  const [lastRuntimeError, setLastRuntimeError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [serviceReady, setServiceReady] = useState(false);
  
  // UI State
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [actedRecommendations, setActedRecommendations] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModal>({ isOpen: false, recommendation: null });
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Simple notification system
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Safe collection size calculation
  const collectionSize = Array.isArray(collections) ? collections.length : 0;
  const canGenerate = collectionSize >= 3;
  const hasRecommendations = recommendations.length > 0;

  // Check if OMDB is configured
  const omdbConfigured = !!(
    typeof import.meta !== 'undefined' && 
    import.meta.env?.VITE_OMDB_API_KEY ||
    process.env?.VITE_OMDB_API_KEY
  );

  // Create diagnostic info
  const diagnosticInfo: DiagnosticInfo = {
    serviceAvailable: !!smartRecommendationsService && serviceReady,
    serviceError: serviceImportError,
    collectionCount: collectionSize,
    collectionSample: Array.isArray(collections) ? collections.slice(0, 1) : [],
    omdbConfigured,
    lastError: lastRuntimeError
  };

  // Check service readiness periodically
  React.useEffect(() => {
    const checkService = () => {
      if (smartRecommendationsService && !serviceReady) {
        setServiceReady(true);
        console.log('[Fixed] ✅ Service is now ready!');
      }
    };
    
    checkService();
    const interval = setInterval(checkService, 1000);
    return () => clearInterval(interval);
  }, [serviceReady]);

  // Enhanced recommendation generation with better service loading
  const generateRecommendations = async () => {
    if (!user) {
      setError('Please sign in to get recommendations');
      return;
    }

    if (collectionSize < 3) {
      setError(collectionSize === 0 
        ? "Add some movies to your collection first to get recommendations!" 
        : `Add ${3 - collectionSize} more movies to get recommendations!`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setLastRuntimeError(null);

    try {
      let generatedRecommendations = [];
      let usingRealService = false;

      console.log('[Fixed] Starting recommendation generation...');
      console.log('[Fixed] Service available:', !!smartRecommendationsService);
      console.log('[Fixed] Service ready:', serviceReady);
      console.log('[Fixed] OMDB configured:', omdbConfigured);
      console.log('[Fixed] Collection count:', collectionSize);

      // Try the real service first if available and ready
      if (smartRecommendationsService && serviceReady && Array.isArray(collections) && collections.length >= 3) {
        try {
          console.log('[Fixed] 🚀 Attempting real service generation...');
          
          const startTime = Date.now();
          generatedRecommendations = await smartRecommendationsService.generateRecommendations(
            collections,
            {
              max_results: 6,
              exclude_owned: true,
              exclude_wishlist: false,
              min_confidence: 0.5
            }
          );
          const endTime = Date.now();
          
          console.log('[Fixed] Service call completed in', endTime - startTime, 'ms');
          console.log('[Fixed] Recommendations returned:', generatedRecommendations);
          
          if (generatedRecommendations && generatedRecommendations.length > 0) {
            usingRealService = true;
            console.log('[Fixed] ✅ Real service succeeded:', generatedRecommendations.length, 'recommendations');
          } else {
            console.log('[Fixed] ⚠️ Real service returned empty results');
            setLastRuntimeError('Service returned no recommendations');
          }
        } catch (serviceError) {
          console.error('[Fixed] ❌ Real service failed:', serviceError);
          setLastRuntimeError(serviceError.message || 'Unknown service error');
        }
      } else {
        const reasons = [];
        if (!smartRecommendationsService) reasons.push('service not imported');
        if (!serviceReady) reasons.push('service not ready');
        if (!Array.isArray(collections)) reasons.push('collections not array');
        if (collections.length < 3) reasons.push('insufficient collections');
        
        console.log('[Fixed] ⚠️ Skipping real service:', reasons.join(', '));
        setLastRuntimeError(`Service not attempted: ${reasons.join(', ')}`);
      }

      // Fallback to mock data if real service didn't work
      if (!usingRealService) {
        console.log('[Fixed] 🔄 Using mock data fallback');
        await new Promise(resolve => setTimeout(resolve, 1000));
        generatedRecommendations = mockRecommendations;
      }
      
      setRecommendations(generatedRecommendations);
      setHasGeneratedOnce(true);
      setIsRealMode(usingRealService);
      
      const message = usingRealService 
        ? `✅ Generated ${generatedRecommendations.length} real recommendations!`
        : `🎭 Generated ${generatedRecommendations.length} demo recommendations`;
      showNotification(message, 'success');
      
      console.log('[Fixed] 🎉 Generation complete. Mode:', usingRealService ? 'Real' : 'Demo');
      
    } catch (err) {
      console.error('[Fixed] 💥 Unexpected error:', err);
      setError('Failed to generate recommendations. Please try again.');
      setLastRuntimeError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // Handle add to wishlist - same as before
  const handleAddToWishlist = async (recommendation: any) => {
    const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
    if (processingActions.has(actionId)) return;

    setProcessingActions(prev => new Set(prev).add(actionId));
    
    try {
      if (addToCollection) {
        await addToCollection({
          title: recommendation.title,
          year: recommendation.year,
          genre: recommendation.genre,
          director: recommendation.director,
          poster_url: recommendation.poster_url,
          imdb_id: recommendation.imdb_id,
          imdb_rating: recommendation.imdb_rating,
          collection_type: 'wishlist',
          watch_status: 'To Watch'
        });
        showNotification(`Added "${recommendation.title}" to your wishlist!`, 'success');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        showNotification(`Added "${recommendation.title}" to wishlist (demo)`, 'success');
      }
      
      setActedRecommendations(prev => new Set(prev).add(actionId));
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      showNotification(`Added "${recommendation.title}" to wishlist (demo)`, 'success');
      setActedRecommendations(prev => new Set(prev).add(actionId));
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  // Handle mark as owned - same as before  
  const handleMarkAsOwned = async (recommendation: any) => {
    const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
    if (processingActions.has(actionId)) return;

    setProcessingActions(prev => new Set(prev).add(actionId));
    
    try {
      if (addToCollection) {
        await addToCollection({
          title: recommendation.title,
          year: recommendation.year,
          genre: recommendation.genre,
          director: recommendation.director,
          poster_url: recommendation.poster_url,
          imdb_id: recommendation.imdb_id,
          imdb_rating: recommendation.imdb_rating,
          collection_type: 'owned',
          watch_status: 'Watched'
        });
        showNotification(`Added "${recommendation.title}" to your collection!`, 'success');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        showNotification(`Added "${recommendation.title}" to collection (demo)`, 'success');
      }
      
      setActedRecommendations(prev => new Set(prev).add(actionId));
    } catch (error) {
      console.error('Failed to mark as owned:', error);
      showNotification(`Added "${recommendation.title}" to collection (demo)`, 'success');
      setActedRecommendations(prev => new Set(prev).add(actionId));
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionId);
        return newSet;
      });
    }
  };

  // Handle dismiss recommendation
  const handleDismiss = (recommendation: any) => {
    setFeedbackModal({ isOpen: true, recommendation });
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (reason: FeedbackReason, comment?: string) => {
    if (!feedbackModal.recommendation) return;

    const actionId = `${feedbackModal.recommendation.imdb_id}_${feedbackModal.recommendation.recommendation_type}`;
    setActedRecommendations(prev => new Set(prev).add(actionId));
    
    console.log('User feedback:', { reason, comment, recommendation: feedbackModal.recommendation });
    
    showNotification('Thanks for your feedback!', 'success');
    setFeedbackModal({ isOpen: false, recommendation: null });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-purple-600" />
              Smart Recommendations
            </h1>
            <p className="text-slate-600 mt-2">
              Personalized movie suggestions based on your collection
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={generateRecommendations}
              disabled={loading || !canGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : (hasGeneratedOnce ? 'Refresh' : 'Generate Recommendations')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <span>Collection size: {collectionSize}</span>
          {hasRecommendations && <span>Recommendations: {recommendations.length}</span>}
          <span className={`px-2 py-1 rounded text-xs ${
            isRealMode 
              ? 'bg-green-100 text-green-700' 
              : 'bg-purple-100 text-purple-700'
          }`}>
            {isRealMode ? '✅ Real Mode' : '🎭 Demo Mode'}
          </span>
          {smartRecommendationsService && serviceReady && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              🔧 Import Fixed
            </span>
          )}
        </div>
      </div>

      {/* Diagnostic Panel */}
      <DiagnosticPanel 
        diagnostic={diagnosticInfo}
        isVisible={showDiagnostics}
        onToggle={() => setShowDiagnostics(!showDiagnostics)}
      />

      {/* Error State */}
      {error && (
        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 mr-2" />
            <div>
              <p className="text-orange-800 font-medium">Unable to Generate Recommendations</p>
              <p className="text-orange-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-slate-600">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-lg">Analyzing your collection and generating recommendations...</span>
          </div>
        </div>
      )}

      {/* Recommendations Grid */}
      {hasRecommendations && !loading && (
        <div className="space-y-6">
          {recommendations.map((recommendation: any, index: number) => {
            const actionId = `${recommendation.imdb_id}_${recommendation.recommendation_type}`;
            const hasActed = actedRecommendations.has(actionId);
            const isProcessing = processingActions.has(actionId);

            return (
              <RecommendationCard
                key={`${recommendation.imdb_id}-${recommendation.recommendation_type}-${index}`}
                recommendation={recommendation}
                onAddToWishlist={() => handleAddToWishlist(recommendation)}
                onMarkAsOwned={() => handleMarkAsOwned(recommendation)}
                onDismiss={() => handleDismiss(recommendation)}
                loading={isProcessing}
                hasActed={hasActed}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasRecommendations && !loading && !error && (
        <div className="text-center py-12">
          <Zap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to Discover?</h2>
          <p className="text-slate-600 mb-6">
            Click "Generate Recommendations" to get personalized movie suggestions based on your collection.
          </p>
          {!canGenerate && (
            <p className="text-sm text-orange-600 bg-orange-50 rounded-lg p-3 inline-block">
              Add {3 - collectionSize} more movies to unlock recommendations
            </p>
          )}
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, recommendation: null })}
        onSubmit={handleFeedbackSubmit}
        loading={false}
      />

      {/* Simple Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};