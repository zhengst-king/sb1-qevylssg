import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface ProcessedTitle {
  title: string;
  genre?: string;
  year?: number;
  director?: string;
  actors?: string;
  plot?: string;
  imdb_score?: number;
  imdb_id?: string;
  poster_url?: string;
  netflixType: 'movie' | 'series';
  watchStatus: 'To Watch' | 'Watching' | 'Watched';
  netflixId?: string;
  netflixTitle?: string;
  netflixSynopsis?: string;
  source: string;
  enrichmentStatus?: 'success' | 'failed' | 'not_found';
  dateImported: Date;
}

interface ImportProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
  currentTitle?: string;
}

interface ImportResult {
  summary: {
    moviesAdded: number;
    tvSeriesAdded: number;
    enrichmentFailed: number;
  };
}

interface ImportOptions {
  streamingService: 'netflix' | 'hulu' | 'disney' | 'prime';
  defaultWatchStatus: 'To Watch' | 'Watching' | 'Watched';
  file: File;
}

export function useHARImport() {
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setIsImporting(false);
    setProgress(null);
    setResult(null);
    setError(null);
  };

  const checkForDuplicates = async (processedTitles: ProcessedTitle[]): Promise<ProcessedTitle[]> => {
    if (!user) return processedTitles;

    try {
      const titles = processedTitles.map(t => t.title);
      const { data: existingTitles } = await supabase
        .from('movies')
        .select('title')
        .eq('user_id', user.id)
        .in('title', titles);

      const existingTitleSet = new Set(existingTitles?.map(t => t.title) || []);
      return processedTitles.filter(title => !existingTitleSet.has(title.title));
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return processedTitles;
    }
  };

  const saveToSupabaseWatchlists = async (processedTitles: ProcessedTitle[]): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check for duplicates first
    const uniqueTitles = await checkForDuplicates(processedTitles);
    
    if (uniqueTitles.length === 0) {
      throw new Error('All titles already exist in your watchlist');
    }

    try {
      // Prepare data for Supabase insert
      const moviesToInsert = uniqueTitles.map(title => ({
        user_id: user.id,
        title: title.title,
        genre: title.genre || null,
        year: title.year || null,
        director: title.director || null,
        actors: title.actors || null,
        plot: title.plot || null,
        imdb_score: title.imdb_score || null,
        imdb_id: title.imdb_id || null,
        poster_url: title.poster_url || null,
        media_type: title.netflixType, // 'movie' or 'series'
        status: title.watchStatus, // 'To Watch', 'Watching', 'Watched'
        
        // Netflix-specific metadata
        netflix_id: title.netflixId,
        netflix_title: title.netflixTitle,
        netflix_synopsis: title.netflixSynopsis,
        import_source: title.source,
        enrichment_status: title.enrichmentStatus,
        import_date: title.dateImported.toISOString(),
        
        created_at: new Date().toISOString()
      }));

      // Insert all titles in a single batch
      const { data, error } = await supabase
        .from('movies')
        .insert(moviesToInsert)
        .select();

      if (error) {
        console.error('[HAR Import] Supabase insert error:', error);
        throw new Error(`Failed to save titles to database: ${error.message}`);
      }

      console.log(`[HAR Import] Successfully saved ${data?.length || 0} titles to Supabase`);

    } catch (error) {
      console.error('[HAR Import] Error saving to Supabase:', error);
      throw error;
    }
  };

  const processHARFile = async (file: File, service: string): Promise<ProcessedTitle[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const harContent = JSON.parse(event.target?.result as string);
          const entries = harContent.log?.entries || [];
          
          console.log(`[HAR Import] Processing ${entries.length} total entries`);
          
          // Filter for Netflix entries
          const netflixEntries = entries.filter((entry: any) => 
            entry.request?.url?.includes('netflix.com')
          );
          
          console.log(`[HAR Import] Found ${netflixEntries.length} Netflix entries`);
          
          const titles: ProcessedTitle[] = [];
          
          // Navigation/interface elements to filter out
          const filterOutList = new Set([
            'netflix', 'movies', 'tv shows', 'home', 'browse', 'search',
            'mylist', 'recently added', 'watchlist', 'continue watching',
            'trending', 'popular', 'new releases', 'because you watched',
            'top picks', 'made for you', 'more like this'
          ]);
          
          netflixEntries.forEach((entry: any) => {
            const url = entry.request?.url || '';
            const response = entry.response;
            
            if (response?.content?.text) {
              try {
                let responseText = response.content.text;
                
                // Handle Netflix's JSON format that might start with )]}' 
                if (responseText.startsWith(')]}\'')) {
                  responseText = responseText.substring(4);
                }
                
                // Try to extract titles using multiple patterns
                const titlePatterns = [
                  /"title":\s*"([^"]+)"/g,
                  /"name":\s*"([^"]+)"/g,
                  /"displayName":\s*"([^"]+)"/g,
                  /"summary":\s*{[^}]*"title":\s*"([^"]+)"/g,
                  /"video":\s*{[^}]*"title":\s*"([^"]+)"/g
                ];
                
                titlePatterns.forEach(pattern => {
                  let match;
                  while ((match = pattern.exec(responseText)) !== null) {
                    let title = match[1];
                    
                    if (title) {
                      // Decode URL encoding
                      title = decodeTitle(title);
                      
                      // Filter out invalid/unwanted titles
                      if (isValidTitle(title, filterOutList)) {
                        // Check if we already have this title
                        if (!titles.find(t => t.title === title)) {
                          titles.push({
                            title: title,
                            netflixType: Math.random() > 0.7 ? 'series' : 'movie', // Default guess
                            watchStatus: 'To Watch',
                            source: service,
                            dateImported: new Date(),
                            enrichmentStatus: 'not_found'
                          });
                        }
                      }
                    }
                  }
                });
                
                // Try to parse as JSON for more structured extraction
                try {
                  const data = JSON.parse(responseText);
                  extractTitlesFromObject(data, titles, service, filterOutList);
                } catch (e) {
                  // Not valid JSON, continue with pattern matching only
                }
                
              } catch (parseError) {
                // Skip entries that can't be processed
                console.log('[HAR Import] Skipping unparseable entry');
              }
            }
          });
          
          console.log(`[HAR Import] Extracted ${titles.length} titles from HAR file`);
          
          if (titles.length === 0) {
            reject(new Error('No valid titles found in HAR file. Please ensure you browsed your Netflix "My List" while recording the HAR file.'));
            return;
          }
          
          resolve(titles);
        } catch (error) {
          console.error('[HAR Import] Error processing HAR file:', error);
          reject(new Error('Invalid HAR file format or corrupted file.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Helper function to decode URL-encoded titles
  const decodeTitle = (title: string): string => {
    try {
      // Handle hex encoding (\x20) and URL encoding (%20)
      let decoded = title
        .replace(/\\x20/g, ' ')
        .replace(/%20/g, ' ')
        .replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/%([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .trim();
      
      return decoded;
    } catch (e) {
      return title; // Return original if decoding fails
    }
  };

  // Helper function to validate if a title should be included
  const isValidTitle = (title: string, filterOutList: Set<string>): boolean => {
    if (!title || title.length < 2) return false;
    if (/^[0-9]+$/.test(title)) return false; // Skip numeric-only strings
    if (title.includes('http')) return false; // Skip URLs
    if (title.includes('netflix.com')) return false; // Skip Netflix URLs
    
    const normalizedTitle = title.toLowerCase().trim();
    if (filterOutList.has(normalizedTitle)) return false;
    
    // Skip very short titles or common interface elements
    if (normalizedTitle.length < 3) return false;
    if (['ok', 'yes', 'no', 'and', 'the', 'for', 'get', 'set'].includes(normalizedTitle)) return false;
    
    return true;
  };

  // Helper function to recursively extract titles from JSON objects
  const extractTitlesFromObject = (obj: any, titles: ProcessedTitle[], service: string, filterOutList: Set<string>, depth = 0): void => {
    if (depth > 5 || !obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => extractTitlesFromObject(item, titles, service, filterOutList, depth + 1));
      return;
    }
    
    // Look for title-like properties
    const titleKeys = ['title', 'name', 'displayName', 'itemTitle', 'showTitle'];
    titleKeys.forEach(key => {
      if (obj[key] && typeof obj[key] === 'string') {
        let title = decodeTitle(obj[key]);
        
        if (isValidTitle(title, filterOutList)) {
          if (!titles.find(t => t.title === title)) {
            titles.push({
              title: title,
              netflixType: Math.random() > 0.7 ? 'series' : 'movie',
              watchStatus: 'To Watch',
              source: service,
              dateImported: new Date(),
              enrichmentStatus: 'not_found'
            });
          }
        }
      }
    });
    
    // Recursively check nested objects
    Object.values(obj).forEach(value => {
      extractTitlesFromObject(value, titles, service, filterOutList, depth + 1);
    });
  };

  const importFromHAR = async (options: ImportOptions) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsImporting(true);
    setError(null);
    setResult(null);

    try {
      // Phase 1: Parse HAR file
      setProgress({
        phase: 'Parsing HAR file',
        current: 0,
        total: 100,
        message: 'Reading and parsing HAR file...'
      });

      const processedTitles = await processHARFile(options.file, options.streamingService);

      // Phase 2: Process titles
      setProgress({
        phase: 'Processing titles',
        current: 25,
        total: 100,
        message: `Found ${processedTitles.length} titles to import...`
      });

      // Update watch status for all titles
      const titlesWithStatus = processedTitles.map(title => ({
        ...title,
        watchStatus: options.defaultWatchStatus
      }));

      // Phase 3: Save to database
      setProgress({
        phase: 'Saving to database',
        current: 75,
        total: 100,
        message: 'Saving titles to your watchlist...'
      });

      await saveToSupabaseWatchlists(titlesWithStatus);

      // Phase 4: Complete
      setProgress({
        phase: 'Complete',
        current: 100,
        total: 100,
        message: 'Import completed successfully!'
      });

      const movieCount = titlesWithStatus.filter(t => t.netflixType === 'movie').length;
      const seriesCount = titlesWithStatus.filter(t => t.netflixType === 'series').length;

      setResult({
        summary: {
          moviesAdded: movieCount,
          tvSeriesAdded: seriesCount,
          enrichmentFailed: titlesWithStatus.filter(t => t.enrichmentStatus === 'failed').length
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('HAR Import Error:', err);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    progress,
    result,
    error,
    importFromHAR,
    resetState
  };
}