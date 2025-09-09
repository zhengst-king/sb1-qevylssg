import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';

// ✅ ENHANCED: Updated interface with all OMDb fields
interface ProcessedTitle {
  // Netflix data
  netflixId?: string;
  netflixTitle?: string;
  netflixType: 'movie' | 'series';
  netflixSynopsis?: string;
  netflixImageUrl?: string;
  
  // ✅ Core OMDb enriched data (existing)
  title: string;
  year?: number;
  genre?: string;
  director?: string;
  actors?: string;
  plot?: string;
  imdb_id?: string;
  imdb_score?: number;
  poster_url?: string;
  
  // ✅ ENHANCED: Additional OMDb fields for complete title cards
  country?: string;
  runtime?: number;
  awards?: string;
  metascore?: number;
  imdb_votes?: string;
  box_office?: number;
  production?: string;
  website?: string;
  rated?: string;
  released?: string;
  language?: string;
  writer?: string;
  
  // Import metadata
  watchStatus: 'To Watch' | 'Watching' | 'Watched';
  dateImported: Date;
  source: 'netflix-import';
  
  // Processing status
  enrichmentStatus: 'success' | 'failed' | 'not_found';
  errorMessage?: string;
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

  // ✅ ENHANCED: Hard-coded junk title exclusions
  const isJunkTitle = (title: string): boolean => {
    const normalizedTitle = title.toLowerCase().trim();
    
    // ✅ HARD-CODED EXCLUSIONS: Titles that have IMDB presence but are clearly not entertainment
    const hardCodedExclusions = [
      // Tech/Browser related
      'chrome', 'firefox', 'safari', 'edge', 'internet explorer',
      'browser', 'web browser', 'google chrome', 'mozilla firefox',
      
      // Educational/Technical content
      'API Cybersecurity 101', 'cybersecurity 101', 'api security',
      'programming 101', 'coding 101', 'python 101', 'javascript 101',
      'web development', 'software engineering', 'computer science',
      
      // Language/Communication
      'american english', 'british english', 'spanish', 'french', 'german',
      'mandarin', 'language learning', 'english lessons', 'conversation',
      
      // Generic terms
      'test', 'demo', 'sample', 'example', 'tutorial', 'guide', 'manual',
      'documentation', 'help', 'support', 'faq', 'readme', 'license',
      'terms', 'privacy', 'policy', 'about', 'contact', 'login', 'signup',
      
      // Tech infrastructure
      'api', 'database', 'server', 'client', 'frontend', 'backend',
      'framework', 'library', 'plugin', 'extension', 'addon', 'widget',
      
      // Operating systems
      'windows', 'macos', 'linux', 'ubuntu', 'android', 'ios','mac',
      
      // Software/Apps
      'microsoft office', 'google docs', 'photoshop', 'excel', 'powerpoint',
      'zoom', 'teams', 'slack', 'discord', 'whatsapp', 'telegram',
      
      // Generic content types
      'trailer', 'preview', 'commercial', 'advertisement', 'ad', 'promo',
      'behind the scenes', 'making of', 'deleted scenes', 'bloopers',
      
      // Streaming service UI elements
      'continue watching', 'watch next', 'recommended', 'trending now',
      'new releases', 'coming soon', 'expiring soon', 'added recently'
    ];
    
    // Check hard-coded exclusions first
    if (hardCodedExclusions.includes(normalizedTitle)) {
      return true;
    }
    
    // Netflix interface elements
    const interfaceElements = [
      'netflix', 'movies', 'tv shows', 'home', 'browse', 'search', 'mylist', 'my list',
      'recently added', 'watchlist', 'continue watching', 'trending', 'popular',
      'new releases', 'because you watched', 'top picks', 'made for you', 'more like this',
      'watch again', 'keep watching', 'trending now', 'new & popular'
    ];
    
    // Genre/category tags
    const genreTags = [
      'drama', 'comedy', 'action', 'thriller', 'horror', 'romance', 'sci-fi', 'fantasy',
      'documentary', 'crime', 'mystery', 'adventure', 'animation', 'family', 'war',
      'western', 'musical', 'sport', 'biography', 'history', 'music', 'reality',
      'talk show', 'game show', 'news', 'adult animation', 'anime', 'sitcom',
      'social experiment', 'visually striking', 'critically acclaimed', 'award winning'
    ];
    
    // Award/descriptor categories
    const descriptors = [
      'emmy nominee', 'oscar winner', 'golden globe', 'critically acclaimed',
      'award winning', 'binge worthy', 'feel good', 'coming soon', 'new arrival',
      'staff picks', 'viewer favorites', 'highly rated'
    ];
    
    // Common people's names (actors, directors that appear as separate entries)
    const commonNames = [
      'masi oka', 'brenda song', 'maya erskine', 'john smith', 'sarah lee',
      'michael chen', 'david kim', 'jennifer wu', 'robert johnson'
    ];
    
    // Technical/URL patterns
    if (normalizedTitle.includes('.')) {
      if (normalizedTitle.includes('nflxvideo') || normalizedTitle.includes('netflix.com') ||
          normalizedTitle.includes('http') || normalizedTitle.includes('www') ||
          normalizedTitle.includes('.net') || normalizedTitle.includes('.com') ||
          normalizedTitle.includes('.io') || normalizedTitle.includes('lax009') ||
          normalizedTitle.includes('c172')) {
        return true;
      }
    }
    
    // Check against all junk categories
    const allJunkTerms = [...interfaceElements, ...genreTags, ...descriptors, ...commonNames];
    if (allJunkTerms.includes(normalizedTitle)) return true;
    
    // Additional patterns
    if (normalizedTitle.length < 3) return true; // Too short
    if (/^[0-9]+$/.test(normalizedTitle)) return true; // Just numbers
    if (/^[a-z]{1,2}$/.test(normalizedTitle)) return true; // Single/double letters
    if (normalizedTitle.includes('episode')) return true; // Episode references
    if (normalizedTitle.includes('season')) return true; // Season references
    
    return false;
  };

  // Improved title validation
  const isValidTitle = (title: string): boolean => {
    if (!title || title.length < 2) return false;
    if (isJunkTitle(title)) return false;
    
    // Must have at least some letters
    if (!/[a-zA-Z]/.test(title)) return false;
    
    // Reasonable length (most titles are 3-50 characters)
    if (title.length > 100) return false;
    
    return true;
  };

  // Helper function to decode URL-encoded titles
  const decodeTitle = (title: string): string => {
    try {
      let decoded = title
        .replace(/\\x20/g, ' ')
        .replace(/%20/g, ' ')
        .replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/%([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
        .trim();
      
      return decoded;
    } catch (e) {
      return title;
    }
  };

  // ✅ ENHANCED: Preserve sequel numbers and only keep IMDB matches
  const enrichWithOMDB = async (titles: string[], onProgress?: (current: number, total: number, title: string) => void): Promise<ProcessedTitle[]> => {
    const enrichedTitles: ProcessedTitle[] = [];
    
    // ✅ Helper function to detect and preserve sequel/part numbers
    const preserveSequelInfo = (originalTitle: string, omdbTitle: string): string => {
      const sequelPatterns = [
        /\b(II|III|IV|V|VI|VII|VIII|IX|X)\b/i,           // Roman numerals
        /\b(Part\s+\d+)\b/i,                             // Part 1, Part 2, etc.
        /\b(Volume\s+\d+)\b/i,                           // Volume 1, Volume 2, etc.
        /\b(Season\s+\d+)\b/i,                           // Season 1, Season 2, etc.
        /\b(\d+)\b/g,                                    // Numbers like 2, 3, etc.
        /\b(Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/i // Written numbers
      ];
      
      // Check if original has sequel info that OMDB result doesn't
      for (const pattern of sequelPatterns) {
        const originalMatch = originalTitle.match(pattern);
        const omdbMatch = omdbTitle.match(pattern);
        
        if (originalMatch && !omdbMatch) {
          // Check if the base titles are similar (without sequel info)
          const originalBase = originalTitle.replace(pattern, '').trim();
          const omdbBase = omdbTitle.replace(pattern, '').trim();
          
          // If base titles are very similar, use original title to preserve sequel info
          if (originalBase.toLowerCase().includes(omdbBase.toLowerCase()) ||
              omdbBase.toLowerCase().includes(originalBase.toLowerCase())) {
            console.log(`[HAR Import] Preserving sequel info: "${originalTitle}" instead of "${omdbTitle}"`);
            return originalTitle;
          }
        }
      }
      
      // Default to OMDB title if no sequel preservation needed
      return omdbTitle;
    };
    
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      
      if (onProgress) {
        onProgress(i + 1, titles.length, title);
      }
      
      try {
        // Add a small delay to respect OMDB rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Search for the title in OMDB
        const searchResults = await omdbApi.searchMovies(title);
        
        if (searchResults.Search && searchResults.Search.length > 0) {
          // Find the best match (prefer exact matches)
          const exactMatch = searchResults.Search.find(result => 
            result.Title.toLowerCase() === title.toLowerCase()
          );
          const bestMatch = exactMatch || searchResults.Search[0];
          
          // Get detailed information
          const details = await omdbApi.getMovieDetails(bestMatch.imdbID);
          
          // ✅ PRESERVE SEQUEL INFO: Use smart title matching
          const finalTitle = preserveSequelInfo(title, details.Title);
          
          // ✅ ONLY ADD TITLES THAT HAVE SUCCESSFUL IMDB MATCHES
          enrichedTitles.push({
            title: finalTitle, // ✅ Use preserved title instead of raw OMDB title
            genre: details.Genre !== 'N/A' ? details.Genre : undefined,
            year: details.Year !== 'N/A' ? parseInt(details.Year) : undefined,
            director: details.Director !== 'N/A' ? details.Director : undefined,
            actors: details.Actors !== 'N/A' ? details.Actors : undefined,
            plot: details.Plot !== 'N/A' ? details.Plot : undefined,
            imdb_score: details.imdbRating !== 'N/A' ? parseFloat(details.imdbRating) : undefined,
            imdb_id: details.imdbID,
            poster_url: details.Poster !== 'N/A' ? details.Poster : undefined,
            netflixType: details.Type === 'series' ? 'series' : 'movie',
            watchStatus: 'To Watch',
            source: 'netflix-import',
            enrichmentStatus: 'success',
            dateImported: new Date(),
            
            // ✅ ADD MISSING OMDB FIELDS FOR COMPLETE DATA
            country: details.Country !== 'N/A' ? details.Country : undefined,
            runtime: details.Runtime && details.Runtime !== 'N/A' ? parseInt(details.Runtime.replace(' min', '')) : undefined,
            awards: details.Awards !== 'N/A' ? details.Awards : undefined,
            metascore: details.Metascore !== 'N/A' ? parseInt(details.Metascore) : undefined,
            imdb_votes: details.imdbVotes !== 'N/A' ? details.imdbVotes : undefined,
            box_office: details.BoxOffice && details.BoxOffice !== 'N/A' ? parseFloat(details.BoxOffice.replace(/[$,]/g, '')) : undefined,
            production: details.Production !== 'N/A' ? details.Production : undefined,
            website: details.Website !== 'N/A' ? details.Website : undefined,
            rated: details.Rated !== 'N/A' ? details.Rated : undefined,
            released: details.Released !== 'N/A' ? details.Released : undefined,
            language: details.Language !== 'N/A' ? details.Language : undefined,
            writer: details.Writer !== 'N/A' ? details.Writer : undefined
          });
          
        }
        // ❌ REMOVED: No longer adding titles without IMDB matches
        // This eliminates junk titles like "prs_g001-at006-ix", "aws-us-west-2", etc.
        
      } catch (error) {
        console.error(`[HAR Import] Failed to enrich "${title}":`, error);
        // ❌ REMOVED: No longer adding failed enrichment titles
      }
    }
    
    return enrichedTitles;
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

  // ✅ FIX 2: Enhanced data fields for title cards
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
      // ✅ ENHANCED: Include ALL OMDb fields for complete title cards
      const moviesToInsert = uniqueTitles.map(title => ({
        user_id: user.id,
        title: title.title,
        
        // ✅ Core OMDb fields (existing)
        genre: title.genre || null,
        year: title.year || null,
        director: title.director || null,
        actors: title.actors || null,
        plot: title.plot || null,
        imdb_score: title.imdb_score || null,
        imdb_id: title.imdb_id || null,
        poster_url: title.poster_url || null,
        media_type: title.netflixType,
        status: title.watchStatus,
        
        // ✅ ENHANCED: Additional OMDb fields for rich title cards
        country: title.country || null,
        runtime: title.runtime || null,
        awards: title.awards || null,
        metascore: title.metascore || null,
        imdb_votes: title.imdb_votes || null,
        box_office: title.box_office || null,
        production: title.production || null,
        website: title.website || null,
        rated: title.rated || null,
        released: title.released || null,
        language: title.language || null,
        writer: title.writer || null,
        
        // ✅ ENHANCED: Generate IMDb URL for the "View on IMDb" button
        imdb_url: title.imdb_id ? `https://www.imdb.com/title/${title.imdb_id}/` : null,
        
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

      console.log(`[HAR Import] Successfully saved ${data?.length || 0} titles with enhanced data to Supabase`);

    } catch (error) {
      console.error('[HAR Import] Error saving to Supabase:', error);
      throw error;
    }
  };

  // Helper function to recursively extract titles from JSON objects
  const extractTitlesFromObject = (obj: any, titles: Set<string>, depth = 0): void => {
    if (depth > 5 || !obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => extractTitlesFromObject(item, titles, depth + 1));
      return;
    }
    
    // Look for title-like properties
    const titleKeys = ['title', 'name', 'displayName', 'itemTitle', 'showTitle'];
    titleKeys.forEach(key => {
      if (obj[key] && typeof obj[key] === 'string') {
        let title = decodeTitle(obj[key]);
        if (isValidTitle(title)) {
          titles.add(title);
        }
      }
    });
    
    // Recursively check nested objects
    Object.values(obj).forEach(value => {
      extractTitlesFromObject(value, titles, depth + 1);
    });
  };

  const processHARFile = async (file: File, service: string): Promise<ProcessedTitle[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const harContent = JSON.parse(event.target?.result as string);
          const entries = harContent.log?.entries || [];
          
          console.log(`[HAR Import] Processing ${entries.length} total entries`);
          
          // Filter for Netflix entries
          const netflixEntries = entries.filter((entry: any) => 
            entry.request?.url?.includes('netflix.com')
          );
          
          console.log(`[HAR Import] Found ${netflixEntries.length} Netflix entries`);
          
          const rawTitles = new Set<string>();
          
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
                
                // Extract titles using multiple patterns
                const titlePatterns = [
                  /"title":\s*"([^"]+)"/g,
                  /"name":\s*"([^"]+)"/g,
                  /"displayName":\s*"([^"]+)"/g,
                ];
                
                titlePatterns.forEach(pattern => {
                  let match;
                  while ((match = pattern.exec(responseText)) !== null) {
                    let title = decodeTitle(match[1]);
                    if (isValidTitle(title)) {
                      rawTitles.add(title);
                    }
                  }
                });
                
                // Try structured JSON extraction too
                try {
                  const data = JSON.parse(responseText);
                  extractTitlesFromObject(data, rawTitles);
                } catch (e) {
                  // Not valid JSON, continue
                }
                
              } catch (parseError) {
                // Skip entries that can't be processed
              }
            }
          });
          
          const uniqueTitles = Array.from(rawTitles);
          console.log(`[HAR Import] Extracted ${uniqueTitles.length} valid titles`);
          
          if (uniqueTitles.length === 0) {
            reject(new Error('No valid titles found in HAR file. Please ensure you browsed your Netflix "My List" while recording.'));
            return;
          }
          
          // Limit to reasonable number to avoid hitting API limits
          const titlesToProcess = uniqueTitles.slice(0, 50);
          console.log(`[HAR Import] Processing ${titlesToProcess.length} titles (limited from ${uniqueTitles.length})`);
          
          resolve(await enrichWithOMDB(titlesToProcess, (current, total, title) => {
            setProgress({
              phase: 'Enriching titles',
              current: (current / total) * 75 + 25, // 25-100% of progress
              total: 100,
              message: `Enriching with OMDB data: ${title}`,
              currentTitle: title
            });
          }));
          
        } catch (error) {
          console.error('[HAR Import] Error processing HAR file:', error);
          reject(new Error('Invalid HAR file format or corrupted file.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Add this function to the useHARImport hook (around line 400, before the importFromHAR function)

const saveImportHistory = async (options: ImportOptions, result: ImportResult) => {
  if (!user) return;
  
  try {
    const historyRecord = {
      user_id: user.id,
      upload_datetime: new Date().toISOString(),
      streaming_service: options.streamingService,
      default_status: options.defaultWatchStatus,
      har_filename: options.file.name,
      movies_added: result.summary.moviesAdded,
      tv_series_added: result.summary.tvSeriesAdded,
      total_imported: result.summary.moviesAdded + result.summary.tvSeriesAdded
    };

    const { error } = await supabase
      .from('import_history')
      .insert([historyRecord]);

    if (error) {
      console.error('[HAR Import] Failed to save import history:', error);
      // Don't throw error - import was successful, just history saving failed
    } else {
      console.log('[HAR Import] Import history saved successfully');
    }
  } catch (error) {
    console.error('[HAR Import] Error saving import history:', error);
  }
};

// Then modify the importFromHAR function to call this after successful import
// Find this section in the importFromHAR function (around line 450):

      setResult({
        summary: {
          moviesAdded: movieCount,
          tvSeriesAdded: seriesCount,
          enrichmentFailed: titlesWithStatus.filter(t => t.enrichmentStatus === 'failed').length
        }
      });

      // ✅ ADD THIS: Save import history
      await saveImportHistory(options, {
        summary: {
          moviesAdded: movieCount,
          tvSeriesAdded: seriesCount,
          enrichmentFailed: titlesWithStatus.filter(t => t.enrichmentStatus === 'failed').length
        }
      });
  
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

      // Phase 2: Update watch status
      const titlesWithStatus = processedTitles.map(title => ({
        ...title,
        watchStatus: options.defaultWatchStatus
      }));

      // Phase 3: Save to database
      setProgress({
        phase: 'Saving to database',
        current: 90,
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