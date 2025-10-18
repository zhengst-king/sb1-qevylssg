// src/services/omdbEnrichmentService.ts
// Service to enrich movies/TV shows with OMDb data after they're added

import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';

export const omdbEnrichmentService = {
  /**
   * Enrich a movie or TV series with complete OMDb data
   * This is called after adding titles from Cast/Crew or Recommendations tabs
   * 
   * @param movieId - The UUID of the movie record in the database
   * @param imdbId - The IMDb ID (e.g., "tt0848228")
   */
  async enrichMovie(movieId: string, imdbId: string): Promise<void> {
    if (!imdbId || !movieId) {
      console.log('[OMDbEnrichment] Missing movieId or imdbId, skipping enrichment');
      return;
    }

    try {
      console.log(`[OMDbEnrichment] Fetching OMDb details for ${imdbId}...`);
      
      // Fetch complete details from OMDb API
      const details = await omdbApi.getMovieDetails(imdbId);
      
      if (!details || details.Response === 'False') {
        console.error('[OMDbEnrichment] OMDb API returned no results for:', imdbId);
        return;
      }

      // Build update object with all available IMDB fields
      const updates: any = {};
      
      // Runtime
      if (details.Runtime && details.Runtime !== 'N/A') {
        updates.runtime = omdbApi.parseRuntime(details.Runtime);
      }
      
      // Director
      if (details.Director && details.Director !== 'N/A') {
        updates.director = details.Director;
      }
      
      // Actors/Cast
      if (details.Actors && details.Actors !== 'N/A') {
        updates.actors = details.Actors;
      }
      
      // Country
      if (details.Country && details.Country !== 'N/A') {
        updates.country = details.Country;
      }
      
      // Language
      if (details.Language && details.Language !== 'N/A') {
        updates.language = details.Language;
      }
      
      // Box Office
      if (details.BoxOffice && details.BoxOffice !== 'N/A') {
        updates.box_office = details.BoxOffice;
      }
      
      // Genre (only update if not already set)
      if (details.Genre && details.Genre !== 'N/A') {
        updates.genre = details.Genre;
      }

      // Plot/Overview (only update if not already set or is better)
      if (details.Plot && details.Plot !== 'N/A') {
        updates.plot = details.Plot;
      }

      // Production Company
      if (details.Production && details.Production !== 'N/A') {
        updates.production = details.Production;
      }

      // Writer
      if (details.Writer && details.Writer !== 'N/A') {
        updates.writer = details.Writer;
      }

      // Awards
      if (details.Awards && details.Awards !== 'N/A') {
        updates.awards = details.Awards;
      }

      // IMDb Rating (update if different from TMDB rating)
      if (details.imdbRating && details.imdbRating !== 'N/A') {
        const imdbRating = parseFloat(details.imdbRating);
        if (!isNaN(imdbRating)) {
          updates.imdb_score = imdbRating;
        }
      }

      // IMDb Votes
      if (details.imdbVotes && details.imdbVotes !== 'N/A') {
        updates.imdb_votes = details.imdbVotes;
      }

      // Rated (MPAA rating)
      if (details.Rated && details.Rated !== 'N/A') {
        updates.rated = details.Rated;
      }

      // Released date
      if (details.Released && details.Released !== 'N/A') {
        updates.release_date = details.Released;
      }

      // Only perform update if we have data to update
      if (Object.keys(updates).length > 0) {
        console.log(`[OMDbEnrichment] Updating movie ${movieId} with ${Object.keys(updates).length} fields`);
        
        const { error } = await supabase
          .from('movies')
          .update(updates)
          .eq('id', movieId);

        if (error) {
          console.error('[OMDbEnrichment] Database update failed:', error);
          throw error;
        }

        console.log('[OMDbEnrichment] ✅ Successfully enriched movie:', movieId);
      } else {
        console.log('[OMDbEnrichment] No new data to update for:', movieId);
      }
    } catch (error) {
      console.error('[OMDbEnrichment] Enrichment failed for', imdbId, ':', error);
      // Don't throw - we don't want enrichment failures to break the add operation
    }
  },

  /**
   * Batch enrich multiple movies
   * Useful for background processing or catching up on un-enriched movies
   */
  async enrichMultiple(movies: Array<{ id: string; imdb_id: string }>): Promise<void> {
    console.log(`[OMDbEnrichment] Starting batch enrichment for ${movies.length} movies`);
    
    for (const movie of movies) {
      // Add small delay between requests to respect OMDb API rate limits
      await new Promise(resolve => setTimeout(resolve, 300));
      await this.enrichMovie(movie.id, movie.imdb_id);
    }
    
    console.log('[OMDbEnrichment] Batch enrichment complete');
  },

  /**
   * Find and enrich all movies that are missing OMDb data
   * Can be run as a one-time cleanup or scheduled task
   */
  async enrichAllMissing(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[OMDbEnrichment] No user authenticated');
        return;
      }

      // Find movies that have IMDb ID but are missing key OMDb fields
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, imdb_id, title')
        .eq('user_id', user.id)
        .not('imdb_id', 'is', null)
        .or('runtime.is.null,director.is.null,actors.is.null');

      if (error) {
        console.error('[OMDbEnrichment] Error fetching movies to enrich:', error);
        return;
      }

      if (!movies || movies.length === 0) {
        console.log('[OMDbEnrichment] No movies need enrichment');
        return;
      }

      console.log(`[OMDbEnrichment] Found ${movies.length} movies to enrich`);
      
      await this.enrichMultiple(
        movies.map(m => ({ id: m.id, imdb_id: m.imdb_id! }))
      );
    } catch (error) {
      console.error('[OMDbEnrichment] Error in enrichAllMissing:', error);
    }
  }
};