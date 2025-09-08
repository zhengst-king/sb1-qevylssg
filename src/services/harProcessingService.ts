// src/services/harProcessingService.ts
import { omdbApi } from '../lib/omdb';

export interface NetflixTitle {
  id: string;
  title: string;
  year?: number;
  type: 'movie' | 'series';
  synopsis?: string;
  imageUrl?: string;
  netflixUrl?: string;
}

export interface ProcessedTitle {
  // Netflix data
  netflixId: string;
  netflixTitle: string;
  netflixType: 'movie' | 'series';
  netflixSynopsis?: string;
  netflixImageUrl?: string;
  
  // OMDb enriched data
  title: string;
  year?: number;
  genre?: string;
  director?: string;
  actors?: string;
  plot?: string;
  imdb_id?: string;
  imdb_score?: number;
  poster_url?: string;
  
  // Import metadata
  watchStatus: 'To Watch' | 'Watching' | 'Watched';
  dateImported: Date;
  source: 'netflix-import';
  
  // Processing status
  enrichmentStatus: 'success' | 'failed' | 'not_found';
  errorMessage?: string;
}

export interface ImportProgress {
  phase: 'parsing' | 'extracting' | 'enriching' | 'saving' | 'complete';
  current: number;
  total: number;
  currentTitle?: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  processed: ProcessedTitle[];
  failed: Array<{ title: string; error: string }>;
  summary: {
    totalFound: number;
    moviesAdded: number;
    tvSeriesAdded: number;
    duplicatesSkipped: number;
    enrichmentFailed: number;
  };
}

class HARProcessingService {
  private progressCallback?: (progress: ImportProgress) => void;

  setProgressCallback(callback: (progress: ImportProgress) => void) {
    this.progressCallback = callback;
  }

  private updateProgress(progress: ImportProgress) {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  async processNetflixHAR(
    file: File, 
    defaultWatchStatus: 'To Watch' | 'Watching' | 'Watched' = 'To Watch'
  ): Promise<ImportResult> {
    try {
      // Validate file
      this.validateHARFile(file);

      // Phase 1: Parse HAR file
      this.updateProgress({
        phase: 'parsing',
        current: 0,
        total: 1,
        message: 'Parsing HAR file...'
      });

      const harData = await this.parseHARFile(file);

      // Phase 2: Extract Netflix data
      this.updateProgress({
        phase: 'extracting',
        current: 0,
        total: 1,
        message: 'Extracting Netflix data...'
      });

      const netflixTitles = this.extractNetflixTitles(harData);

      if (netflixTitles.length === 0) {
        throw new Error('No Netflix "My List" data found in HAR file. Make sure you browsed your My List while recording.');
      }

      // Phase 3: Enrich with OMDb data
      this.updateProgress({
        phase: 'enriching',
        current: 0,
        total: netflixTitles.length,
        message: 'Enriching with movie database...'
      });

      const processed = await this.enrichWithOMDb(netflixTitles, defaultWatchStatus);

      // Phase 4: Save to watchlists
      this.updateProgress({
        phase: 'saving',
        current: 0,
        total: processed.length,
        message: 'Adding to watchlists...'
      });

      const result = await this.saveToWatchlists(processed);

      // Phase 5: Complete
      this.updateProgress({
        phase: 'complete',
        current: result.summary.totalFound,
        total: result.summary.totalFound,
        message: `Import complete! Added ${result.summary.moviesAdded} movies and ${result.summary.tvSeriesAdded} TV series.`
      });

      return result;

    } catch (error) {
      console.error('[HAR Processing] Error:', error);
      throw error;
    }
  }

  private validateHARFile(file: File): void {
    const MAX_SIZE = 200 * 1024 * 1024; // 200MB
    
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 200MB.`);
    }

    if (!file.name.toLowerCase().endsWith('.har')) {
      throw new Error('Please select a valid HAR file (.har extension).');
    }
  }

  private async parseHARFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const harData = JSON.parse(content);
          
          if (!harData.log || !harData.log.entries) {
            throw new Error('Invalid HAR file format');
          }
          
          resolve(harData);
        } catch (error) {
          reject(new Error('Failed to parse HAR file. Please ensure it\'s a valid HAR file.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read HAR file'));
      };
      
      reader.readAsText(file);
    });
  }

  private extractNetflixTitles(harData: any): NetflixTitle[] {
    const netflixTitles: NetflixTitle[] = [];
    const seenIds = new Set<string>();

    try {
      // Filter HAR entries for Netflix Shakti API calls
      const netflixEntries = harData.log.entries.filter((entry: any) => {
        const url = entry.request?.url || '';
        return url.includes('netflix.com/api/shakti') && 
               entry.request?.method === 'POST' &&
               entry.request?.postData?.text?.includes('mylist');
      });

      console.log(`[HAR Processing] Found ${netflixEntries.length} Netflix API entries`);

      for (const entry of netflixEntries) {
        try {
          const responseText = entry.response?.content?.text;
          if (!responseText) continue;

          const responseData = JSON.parse(responseText);
          
          // Netflix uses JSONGraph format - look for video objects
          if (responseData.value && responseData.value.videos) {
            const videos = responseData.value.videos;
            
            Object.keys(videos).forEach(videoId => {
              if (seenIds.has(videoId)) return;
              
              const video = videos[videoId];
              if (!video || !video.title) return;

              const netflixTitle: NetflixTitle = {
                id: videoId,
                title: video.title,
                type: this.determineContentType(video),
                synopsis: video.synopsis || video.summary,
                imageUrl: this.extractImageUrl(video),
                year: this.extractYear(video)
              };

              netflixTitles.push(netflixTitle);
              seenIds.add(videoId);
            });
          }

          // Also check for direct lolomo responses
          if (responseData.value && responseData.value.lolomo) {
            this.extractFromLolomo(responseData.value.lolomo, netflixTitles, seenIds);
          }

        } catch (parseError) {
          console.warn('[HAR Processing] Failed to parse Netflix API response:', parseError);
          continue;
        }
      }

      console.log(`[HAR Processing] Extracted ${netflixTitles.length} unique titles`);
      return netflixTitles;

    } catch (error) {
      console.error('[HAR Processing] Error extracting Netflix titles:', error);
      throw new Error('Failed to extract Netflix data from HAR file');
    }
  }

  private extractFromLolomo(lolomo: any, titles: NetflixTitle[], seenIds: Set<string>): void {
    try {
      Object.keys(lolomo).forEach(listKey => {
        const list = lolomo[listKey];
        if (list && typeof list === 'object') {
          Object.keys(list).forEach(itemKey => {
            const item = list[itemKey];
            if (item && item.reference && typeof item.reference === 'string') {
              const videoId = item.reference.replace('videos/', '');
              if (!seenIds.has(videoId)) {
                // This is a reference - we'll need the actual video data from elsewhere
                // For now, just mark as seen to avoid duplicates
                seenIds.add(videoId);
              }
            }
          });
        }
      });
    } catch (error) {
      console.warn('[HAR Processing] Error extracting from lolomo:', error);
    }
  }

  private determineContentType(video: any): 'movie' | 'series' {
    if (video.type) {
      return video.type.toLowerCase().includes('movie') ? 'movie' : 'series';
    }
    
    // Check for series indicators
    if (video.episodeCount || video.seasonCount || video.seasons) {
      return 'series';
    }
    
    // Default to movie if uncertain
    return 'movie';
  }

  private extractImageUrl(video: any): string | undefined {
    if (video.boxArt) {
      // Netflix boxArt is usually an object with different sizes
      if (typeof video.boxArt === 'object') {
        // Try to get the largest available image
        const sizes = Object.keys(video.boxArt);
        if (sizes.length > 0) {
          const largestSize = sizes.sort((a, b) => {
            const aWidth = parseInt(a.split('x')[0]) || 0;
            const bWidth = parseInt(b.split('x')[0]) || 0;
            return bWidth - aWidth;
          })[0];
          return video.boxArt[largestSize]?.url;
        }
      } else if (typeof video.boxArt === 'string') {
        return video.boxArt;
      }
    }
    
    return video.image || video.poster;
  }

  private extractYear(video: any): number | undefined {
    if (video.releaseYear) return video.releaseYear;
    if (video.year) return video.year;
    
    // Try to extract from title if it has (YYYY) format
    const yearMatch = video.title?.match(/\((\d{4})\)/);
    if (yearMatch) {
      return parseInt(yearMatch[1]);
    }
    
    return undefined;
  }

  private async enrichWithOMDb(
    netflixTitles: NetflixTitle[], 
    defaultWatchStatus: 'To Watch' | 'Watching' | 'Watched'
  ): Promise<ProcessedTitle[]> {
    const processed: ProcessedTitle[] = [];
    const BATCH_SIZE = 5; // Process 5 at a time to avoid overwhelming OMDb
    
    for (let i = 0; i < netflixTitles.length; i += BATCH_SIZE) {
      const batch = netflixTitles.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (netflixTitle, batchIndex) => {
        const currentIndex = i + batchIndex;
        
        this.updateProgress({
          phase: 'enriching',
          current: currentIndex,
          total: netflixTitles.length,
          currentTitle: netflixTitle.title,
          message: `Enriching "${netflixTitle.title}"...`
        });

        try {
          // Search OMDb for the title
          const searchResults = await omdbApi.searchMovies(
            `${netflixTitle.title}${netflixTitle.year ? ` ${netflixTitle.year}` : ''}`
          );

          let omdbDetails = null;
          
          if (searchResults.Search && searchResults.Search.length > 0) {
            // Find best match
            const bestMatch = this.findBestOMDbMatch(netflixTitle, searchResults.Search);
            
            if (bestMatch) {
              // Add delay to respect rate limits
              await new Promise(resolve => setTimeout(resolve, 250));
              omdbDetails = await omdbApi.getMovieDetails(bestMatch.imdbID);
            }
          }

          const processedTitle: ProcessedTitle = {
            // Netflix data
            netflixId: netflixTitle.id,
            netflixTitle: netflixTitle.title,
            netflixType: netflixTitle.type,
            netflixSynopsis: netflixTitle.synopsis,
            netflixImageUrl: netflixTitle.imageUrl,
            
            // OMDb enriched data (or fallback to Netflix data)
            title: omdbDetails?.Title || netflixTitle.title,
            year: omdbDetails ? omdbApi.parseYear(omdbDetails.Year) : netflixTitle.year,
            genre: omdbApi.formatValue(omdbDetails?.Genre),
            director: omdbApi.formatValue(omdbDetails?.Director),
            actors: omdbApi.formatValue(omdbDetails?.Actors),
            plot: omdbApi.formatValue(omdbDetails?.Plot) || netflixTitle.synopsis,
            imdb_id: omdbDetails?.imdbID,
            imdb_score: omdbDetails ? omdbApi.parseRating(omdbDetails.imdbRating) : undefined,
            poster_url: (omdbDetails?.Poster && omdbDetails.Poster !== 'N/A') 
              ? omdbDetails.Poster 
              : netflixTitle.imageUrl,
            
            // Import metadata
            watchStatus: defaultWatchStatus,
            dateImported: new Date(),
            source: 'netflix-import',
            
            // Processing status
            enrichmentStatus: omdbDetails ? 'success' : 'not_found'
          };

          return processedTitle;

        } catch (error) {
          console.error(`[HAR Processing] Failed to enrich "${netflixTitle.title}":`, error);
          
          // Create title with Netflix data only
          const processedTitle: ProcessedTitle = {
            netflixId: netflixTitle.id,
            netflixTitle: netflixTitle.title,
            netflixType: netflixTitle.type,
            netflixSynopsis: netflixTitle.synopsis,
            netflixImageUrl: netflixTitle.imageUrl,
            
            title: netflixTitle.title,
            year: netflixTitle.year,
            plot: netflixTitle.synopsis,
            poster_url: netflixTitle.imageUrl,
            
            watchStatus: defaultWatchStatus,
            dateImported: new Date(),
            source: 'netflix-import',
            
            enrichmentStatus: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          };

          return processedTitle;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processed.push(...batchResults);
      
      // Small delay between batches
      if (i + BATCH_SIZE < netflixTitles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return processed;
  }

  private findBestOMDbMatch(netflixTitle: NetflixTitle, searchResults: any[]): any | null {
    // Filter by type first
    const typeMatches = searchResults.filter(result => {
      if (netflixTitle.type === 'movie') {
        return result.Type === 'movie';
      } else {
        return result.Type === 'series';
      }
    });

    const candidates = typeMatches.length > 0 ? typeMatches : searchResults;

    // Find exact title match
    const exactMatch = candidates.find(result => 
      result.Title.toLowerCase() === netflixTitle.title.toLowerCase()
    );

    if (exactMatch) return exactMatch;

    // Find year match if available
    if (netflixTitle.year) {
      const yearMatch = candidates.find(result => 
        result.Year === netflixTitle.year.toString()
      );
      if (yearMatch) return yearMatch;
    }

    // Return first candidate as fallback
    return candidates[0] || null;
  }

  private async saveToWatchlists(processed: ProcessedTitle[]): Promise<ImportResult> {
    // This would integrate with your existing watchlist save functionality
    // For now, we'll simulate the save process and return the result
    
    const result: ImportResult = {
      success: true,
      processed: processed,
      failed: [],
      summary: {
        totalFound: processed.length,
        moviesAdded: processed.filter(p => p.netflixType === 'movie').length,
        tvSeriesAdded: processed.filter(p => p.netflixType === 'series').length,
        duplicatesSkipped: 0,
        enrichmentFailed: processed.filter(p => p.enrichmentStatus === 'failed').length
      }
    };

    // TODO: Integrate with your Supabase watchlist storage
    // You would call your existing watchlist save functions here
    // For each processed title, add to the appropriate watchlist (movies or tv_series)

    return result;
  }
}

export const harProcessingService = new HARProcessingService();