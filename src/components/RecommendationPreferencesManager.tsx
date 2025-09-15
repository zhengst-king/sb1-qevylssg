// src/components/RecommendationPreferencesManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Heart,
  X,
  Plus,
  Star,
  DollarSign,
  Target,
  TrendingUp,
  Lightbulb,
  Save,
  RotateCcw,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useRecommendationActions } from '../hooks/useRecommendationActions';
import type { UserRecommendationPreferences } from '../services/recommendationActionsService';

interface GenreTagProps {
  genre: string;
  isSelected: boolean;
  onToggle: (genre: string) => void;
  variant: 'preferred' | 'avoided';
}

const GenreTag: React.FC<GenreTagProps> = ({ genre, isSelected, onToggle, variant }) => {
  const baseClasses = "px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors";
  const variantClasses = {
    preferred: isSelected 
      ? "bg-green-100 text-green-800 border border-green-300" 
      : "bg-gray-100 text-gray-700 hover:bg-green-50 border border-gray-200",
    avoided: isSelected 
      ? "bg-red-100 text-red-800 border border-red-300" 
      : "bg-gray-100 text-gray-700 hover:bg-red-50 border border-gray-200"
  };

  return (
    <button
      onClick={() => onToggle(genre)}
      className={`${baseClasses} ${variantClasses[variant]}`}
    >
      {genre}
      {isSelected && variant === 'preferred' && <Heart className="h-3 w-3 ml-1 inline" />}
      {isSelected && variant === 'avoided' && <X className="h-3 w-3 ml-1 inline" />}
    </button>
  );
};

interface WeightSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const WeightSlider: React.FC<WeightSliderProps> = ({ 
  label, 
  value, 
  onChange, 
  description, 
  icon: Icon,
  color 
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-semibold text-gray-900">
            {(value * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="px-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

interface DirectorInputProps {
  directors: string[];
  onDirectorsChange: (directors: string[]) => void;
  variant: 'preferred' | 'avoided';
}

const DirectorInput: React.FC<DirectorInputProps> = ({ directors, onDirectorsChange, variant }) => {
  const [inputValue, setInputValue] = useState('');

  const addDirector = () => {
    if (inputValue.trim() && !directors.includes(inputValue.trim())) {
      onDirectorsChange([...directors, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeDirector = (director: string) => {
    onDirectorsChange(directors.filter(d => d !== director));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDirector();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter director name..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={addDirector}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {directors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {directors.map((director) => (
            <span
              key={director}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                variant === 'preferred' 
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {director}
              <button
                onClick={() => removeDirector(director)}
                className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const RecommendationPreferencesManager: React.FC = () => {
  const {
    userPreferences,
    updateUserPreferences,
    loadUserPreferences,
    loading
  } = useRecommendationActions();

  const [preferences, setPreferences] = useState<Partial<UserRecommendationPreferences>>({
    preferred_genres: [],
    avoided_genres: [],
    preferred_directors: [],
    avoided_directors: [],
    preferred_formats: ['Blu-ray'],
    min_rating: 6.0,
    max_price: 50.00,
    collection_gap_weight: 0.3,
    format_upgrade_weight: 0.3,
    similar_title_weight: 0.4
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Common genres for easy selection
  const commonGenres = [
    'Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary',
    'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance',
    'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
  ];

  const formatOptions = ['DVD', 'Blu-ray', '4K UHD', '3D Blu-ray'];

  // Load preferences on mount
  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

  // Update local state when preferences load
  useEffect(() => {
    if (userPreferences) {
      setPreferences({
        preferred_genres: userPreferences.preferred_genres || [],
        avoided_genres: userPreferences.avoided_genres || [],
        preferred_directors: userPreferences.preferred_directors || [],
        avoided_directors: userPreferences.avoided_directors || [],
        preferred_formats: userPreferences.preferred_formats || ['Blu-ray'],
        min_rating: userPreferences.min_rating || 6.0,
        max_price: userPreferences.max_price || 50.00,
        collection_gap_weight: userPreferences.collection_gap_weight || 0.3,
        format_upgrade_weight: userPreferences.format_upgrade_weight || 0.3,
        similar_title_weight: userPreferences.similar_title_weight || 0.4
      });
      setHasChanges(false);
    }
  }, [userPreferences]);

  const handleGenreToggle = (genre: string, variant: 'preferred' | 'avoided') => {
    const key = variant === 'preferred' ? 'preferred_genres' : 'avoided_genres';
    const otherKey = variant === 'preferred' ? 'avoided_genres' : 'preferred_genres';
    
    const currentList = preferences[key] || [];
    const otherList = preferences[otherKey] || [];
    
    let newList: string[];
    let newOtherList = otherList;
    
    if (currentList.includes(genre)) {
      // Remove from current list
      newList = currentList.filter(g => g !== genre);
    } else {
      // Add to current list and remove from other list if present
      newList = [...currentList, genre];
      newOtherList = otherList.filter(g => g !== genre);
    }
    
    setPreferences(prev => ({
      ...prev,
      [key]: newList,
      [otherKey]: newOtherList
    }));
    setHasChanges(true);
  };

  const handleFormatToggle = (format: string) => {
    const currentFormats = preferences.preferred_formats || [];
    const newFormats = currentFormats.includes(format)
      ? currentFormats.filter(f => f !== format)
      : [...currentFormats, format];
    
    setPreferences(prev => ({
      ...prev,
      preferred_formats: newFormats
    }));
    setHasChanges(true);
  };

  const handleWeightChange = (key: keyof UserRecommendationPreferences, value: number) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleNumberChange = (key: keyof UserRecommendationPreferences, value: number) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleDirectorsChange = (directors: string[], variant: 'preferred' | 'avoided') => {
    const key = variant === 'preferred' ? 'preferred_directors' : 'avoided_directors';
    setPreferences(prev => ({
      ...prev,
      [key]: directors
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    
    try {
      await updateUserPreferences(preferences);
      setHasChanges(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (userPreferences) {
      setPreferences({
        preferred_genres: userPreferences.preferred_genres || [],
        avoided_genres: userPreferences.avoided_genres || [],
        preferred_directors: userPreferences.preferred_directors || [],
        avoided_directors: userPreferences.avoided_directors || [],
        preferred_formats: userPreferences.preferred_formats || ['Blu-ray'],
        min_rating: userPreferences.min_rating || 6.0,
        max_price: userPreferences.max_price || 50.00,
        collection_gap_weight: userPreferences.collection_gap_weight || 0.3,
        format_upgrade_weight: userPreferences.format_upgrade_weight || 0.3,
        similar_title_weight: userPreferences.similar_title_weight || 0.4
      });
    } else {
      // Reset to defaults
      setPreferences({
        preferred_genres: [],
        avoided_genres: [],
        preferred_directors: [],
        avoided_directors: [],
        preferred_formats: ['Blu-ray'],
        min_rating: 6.0,
        max_price: 50.00,
        collection_gap_weight: 0.3,
        format_upgrade_weight: 0.3,
        similar_title_weight: 0.4
      });
    }
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Settings className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recommendation Preferences</h1>
          <p className="text-gray-600 mt-1">
            Customize how the recommendation system learns and suggests items for you
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <Settings className="h-4 w-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Algorithm Weights */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sliders className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Algorithm Weights</h2>
          <div className="ml-2">
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                Adjust how much each type of recommendation influences your suggestions
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <WeightSlider
            label="Collection Gaps"
            value={preferences.collection_gap_weight || 0.3}
            onChange={(value) => handleWeightChange('collection_gap_weight', value)}
            description="Find missing movies from directors and franchises you collect"
            icon={Target}
            color="bg-blue-500"
          />
          
          <WeightSlider
            label="Format Upgrades"
            value={preferences.format_upgrade_weight || 0.3}
            onChange={(value) => handleWeightChange('format_upgrade_weight', value)}
            description="Suggest better quality versions of movies you own"
            icon={TrendingUp}
            color="bg-green-500"
          />
          
          <WeightSlider
            label="Similar Titles"
            value={preferences.similar_title_weight || 0.4}
            onChange={(value) => handleWeightChange('similar_title_weight', value)}
            description="Recommend movies similar to ones you love"
            icon={Lightbulb}
            color="bg-purple-500"
          />
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Total weight:</strong> {((preferences.collection_gap_weight || 0) + (preferences.format_upgrade_weight || 0) + (preferences.similar_title_weight || 0)).toFixed(1)}
            {((preferences.collection_gap_weight || 0) + (preferences.format_upgrade_weight || 0) + (preferences.similar_title_weight || 0)) !== 1.0 && (
              <span className="text-blue-600 ml-2">
                (Weights will be automatically normalized)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Genre Preferences */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Genre Preferences</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preferred Genres */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-gray-900">Preferred Genres</h3>
              <span className="text-sm text-gray-500">
                ({preferences.preferred_genres?.length || 0} selected)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {commonGenres.map(genre => (
                <GenreTag
                  key={genre}
                  genre={genre}
                  isSelected={preferences.preferred_genres?.includes(genre) || false}
                  onToggle={(g) => handleGenreToggle(g, 'preferred')}
                  variant="preferred"
                />
              ))}
            </div>
          </div>
          
          {/* Avoided Genres */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <X className="h-5 w-5 text-red-600" />
              <h3 className="font-medium text-gray-900">Avoided Genres</h3>
              <span className="text-sm text-gray-500">
                ({preferences.avoided_genres?.length || 0} selected)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {commonGenres.map(genre => (
                <GenreTag
                  key={genre}
                  genre={genre}
                  isSelected={preferences.avoided_genres?.includes(genre) || false}
                  onToggle={(g) => handleGenreToggle(g, 'avoided')}
                  variant="avoided"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Director Preferences */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Director Preferences</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preferred Directors */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-gray-900">Preferred Directors</h3>
            </div>
            <DirectorInput
              directors={preferences.preferred_directors || []}
              onDirectorsChange={(directors) => handleDirectorsChange(directors, 'preferred')}
              variant="preferred"
            />
          </div>
          
          {/* Avoided Directors */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <X className="h-5 w-5 text-red-600" />
              <h3 className="font-medium text-gray-900">Avoided Directors</h3>
            </div>
            <DirectorInput
              directors={preferences.avoided_directors || []}
              onDirectorsChange={(directors) => handleDirectorsChange(directors, 'avoided')}
              variant="avoided"
            />
          </div>
        </div>
      </div>

      {/* Format and Quality Preferences */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Format & Quality Preferences</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preferred Formats */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Preferred Formats</h3>
            <div className="space-y-2">
              {formatOptions.map(format => (
                <label key={format} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.preferred_formats?.includes(format) || false}
                    onChange={() => handleFormatToggle(format)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{format}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Quality Thresholds */}
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-gray-900">Minimum Rating</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={preferences.min_rating || 6.0}
                  onChange={(e) => handleNumberChange('min_rating', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-900 min-w-[3rem]">
                  {(preferences.min_rating || 6.0).toFixed(1)}
                </span>
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-medium text-gray-900">Maximum Price</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={preferences.max_price || 50}
                  onChange={(e) => handleNumberChange('max_price', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-900 min-w-[4rem]">
                  ${(preferences.max_price || 50).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg ${
          saveStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {saveStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              saveStatus === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {saveStatus === 'success' ? 'Preferences saved successfully!' : 'Failed to save preferences'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};