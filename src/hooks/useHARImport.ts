// src/hooks/useHARImport.ts
import { useState, useCallback } from 'react';
import { harProcessingService, ImportProgress, ImportResult, ProcessedTitle } from '../services/harProcessingService';
import { useAuth } from './useAuth';

interface HARImportState {
  isImporting: boolean;
  progress: ImportProgress | null;
  result: ImportResult | null;
  error: string | null;
}

interface HARImportConfig {
  streamingService: 'netflix' | 'hulu' | 'disney' | 'prime';
  defaultWatchStatus: 'To Watch' | 'Watching' | 'Watched';
  file: File | null;
}

export function useHARImport() {
  const { user } = useAuth();
  const [state, setState] = useState<HARImportState>({
    isImporting: false,
    progress: null,
    result: null,
    error: null
  });

  const resetState = useCallback(() => {
    setState({
      isImporting: false,
      progress: null,
      result: null,
      error: null
    });
  }, []);

  const handleProgressUpdate = useCallback((progress: ImportProgress) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const saveToSupabaseWatchlists = async (processedTitles: ProcessedTitle[]): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Group by content type
    const movies = processedTitles.filter(title => title.netflixType === 'movie');
    const tvSeries = processedTitles.filter(title => title.netflixType === 'series');

    try {
      // Import movies
      for (const movie of movies) {
        const movieData = {
          title: movie.title,
          genre: movie.genre,
          year: movie.year,
          imdb_score: movie.imdb_score,
          imdb_id: movie.imdb_id,
          poster_url: movie.poster_url,
          director: movie.director,
          actors: movie.actors,
          plot: movie.plot,
          user_id: user.id,
          media_type: 'movie' as const,
          watch_status: movie.watchStatus,
          date_added: movie.dateImported.toISOString(),
          // Netflix-specific metadata
          netflix_id: movie.netflixId,
          netflix_title: movie.netflixTitle,
          netflix_synopsis: movie.netflixSynopsis,
          import_source: movie.source,
          enrichment_status: movie.enrichmentStatus
        };

        // TODO: Replace with your actual Supabase insert
        console.log('Would save movie to Supabase:', movieData);
        
        // Example Supabase call (you'll need to adapt this to your schema):
        // await supabase
        //   .from('user_movies')
        //   .insert(movieData);
      }

      // Import TV series
      for (const series of tvSeries) {
        const seriesData = {
          title: series.title,
          genre: series.genre,
          year: series.year,
          imdb_score: series.imdb_score,
          imdb_id: series.imdb_id,
          poster_url: series.poster_url,
          director: series.director,
          actors: series.actors,
          plot: series.plot,
          user_id: user.id,
          media_type: 'tv' as const,
          watch_status: series.watchStatus,
          date_added: series.dateImported.toISOString(),
          // Netflix-specific metadata
          netflix_id: series.netflixId,
          netflix_title: series.netflixTitle,
          netflix_synopsis: series.netflixSynopsis,
          import_source: series.source,
          enrichment_status: series.enrichmentStatus
        };

        // TODO: Replace with your actual Supabase insert
        console.log('Would save TV series to Supabase:', seriesData);
        
        // Example Supabase call (you'll need to adapt this to your schema):
        // await supabase
        //   .from('user_tv_series')
        //   .insert(seriesData);
      }

    } catch (error) {
      console.error('[HAR Import] Error saving to Supabase:', error);
      throw new Error('Failed to save imported titles to database');
    }
  };

  const importFromHAR = useCallback(async (config: HARImportConfig): Promise<ImportResult> => {
    if (!user) {
      throw new Error('Please sign in to import titles');
    }

    if (!config.file) {
      throw new Error('Please select a HAR file');
    }

    if (config.streamingService !== 'netflix') {
      throw new Error('Only Netflix import is currently supported');
    }

    setState(prev => ({
      ...prev,
      isImporting: true,
      progress: null,
      result: null,
      error: null
    }));

    try {
      // Set up progress callback
      harProcessingService.setProgressCallback(handleProgressUpdate);

      // Process the HAR file
      const result = await harProcessingService.processNetflixHAR(
        config.file,
        config.defaultWatchStatus
      );

      // Save to Supabase
      setState(prev => ({
        ...prev,
        progress: {
          phase: 'saving',
          current: 0,
          total: result.processed.length,
          message: 'Saving to your watchlists...'
        }
      }));

      await saveToSupabaseWatchlists(result.processed);

      // Update final progress
      setState(prev => ({
        ...prev,
        progress: {
          phase: 'complete',
          current: result.summary.totalFound,
          total: result.summary.totalFound,
          message: `Successfully imported ${result.summary.moviesAdded} movies and ${result.summary.tvSeriesAdded} TV series!`
        }
      }));

      setState(prev => ({
        ...prev,
        isImporting: false,
        result
      }));

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isImporting: false,
        error: errorMessage,
        progress: null
      }));

      throw error;
    }
  }, [user, handleProgressUpdate]);

  return {
    // State
    isImporting: state.isImporting,
    progress: state.progress,
    result: state.result,
    error: state.error,
    
    // Actions
    importFromHAR,
    resetState
  };
}