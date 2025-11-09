// src/lib/blurayApi.ts - UPDATED WITH PUBLIC SEARCH METHODS
import { spawn } from 'child_process';
import { supabase } from './supabase';

export interface BlurayTechnicalSpecs {
  id: string;
  title: string;
  year: number;
  // Technical specifications
  video_codec?: string;
  video_resolution?: string; // "1080p", "4K UHD", "3D"
  hdr_format?: string; // "HDR10", "Dolby Vision", "HDR10+"
  audio_codecs?: string[]; // ["Dolby Atmos", "DTS-X", "DTS-HD MA"]
  audio_channels?: string[]; // ["7.1", "5.1", "2.0"]
  region_codes?: string[]; // ["A", "B", "C"]
  disc_format: string; // "Blu-ray", "4K UHD", "DVD", "3D Blu-ray"
  studio?: string;
  distributor?: string;
  release_date?: string;
  special_features?: string[];
  // Marketplace data
  upc_code?: string;
  runtime_minutes?: number;
  aspect_ratio?: string;
  subtitles?: string[];
  languages?: string[];
  // Scraping metadata
  scraped_at: Date;
  bluray_com_url: string;
  data_quality: 'complete' | 'partial' | 'minimal';
}

// Search result interface for physical media editions
export interface BluraySearchResult {
  url: string;
  title: string;
  year: number;
  format: string;
  edition?: string;
  studio?: string;
  releaseDate?: string;
  isDigital?: boolean;
}

class BlurayScrapingService {
  private readonly CACHE_DURATION_DAYS = 30; // Cache for 30 days
  
  // Main method to get enhanced disc data
  async getDiscSpecs(title: string, year?: number): Promise<BlurayTechnicalSpecs | null> {
    try {
      // First check cache
      const cached = await this.getCachedSpecs(title, year);
      if (cached && this.isCacheValid(cached.scraped_at)) {
        console.log('[BlurayAPI] Using cached specs for:', title);
        return cached;
      }

      // Search blu-ray.com for the title
      const searchResults = await this.searchBlurayDotCom(title, year);
      if (searchResults.length === 0) {
        console.log('[BlurayAPI] No results found on blu-ray.com for:', title);
        return null;
      }

      // Get detailed specs for the best match
      const bestMatch = this.selectBestMatch(searchResults, title, year);
      const specs = await this.scrapeDiscDetails(bestMatch.url);
      
      if (specs) {
        // Cache the results
        await this.cacheSpecs(specs);
        return specs;
      }

      return null;
    } catch (error) {
      console.error('[BlurayAPI] Error getting disc specs:', error);
      return null;
    }
  }

  /**
   * PUBLIC: Search blu-ray.com for physical media titles
   * Returns array of search results with URLs and enhanced metadata
   */
  async searchBlurayDotCom(query: string, year?: number): Promise<BluraySearchResult[]> {
    return new Promise((resolve, reject) => {
      const searchQuery = year ? `${query} ${year}` : query;
      
      // Use the scraper's search functionality
      const process = spawn('python3', [
        './scripts/blu-ray-scraper/blu-ray.py',
        '--search-only',
        '--query', searchQuery,
        '--max-results', '10'
      ]);

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          console.error('[BlurayAPI] Search error:', errorOutput);
          reject(new Error(`Scraper failed: ${errorOutput}`));
          return;
        }

        try {
          const results = JSON.parse(output);
          const searchResults = results.search_results || [];
          
          // Enhanced results with format detection and metadata
          const enhancedResults: BluraySearchResult[] = searchResults.map((result: any) => {
            // Detect format from title or explicit format field
            let format = result.format || 'Blu-ray';
            const titleLower = result.title.toLowerCase();
            
            if (titleLower.includes('4k') || titleLower.includes('ultra hd') || titleLower.includes('uhd')) {
              format = '4K UHD';
            } else if (titleLower.includes('dvd')) {
              format = 'DVD';
            } else if (titleLower.includes('3d')) {
              format = '3D Blu-ray';
            } else if (titleLower.includes('digital') || titleLower.includes('movies anywhere')) {
              format = 'Digital';
            }
            
            // Detect edition type
            let edition = result.edition;
            if (!edition) {
              if (titleLower.includes('steelbook')) edition = 'Steelbook';
              else if (titleLower.includes('collector')) edition = "Collector's Edition";
              else if (titleLower.includes('limited')) edition = 'Limited Edition';
              else if (titleLower.includes('special')) edition = 'Special Edition';
              else if (titleLower.includes('criterion')) edition = 'Criterion Collection';
            }
            
            return {
              url: result.url,
              title: result.title,
              year: result.year,
              format,
              edition,
              studio: result.studio,
              releaseDate: result.release_date || result.releaseDate,
              isDigital: format === 'Digital' || titleLower.includes('digital')
            };
          });
          
          resolve(enhancedResults);
        } catch (parseError) {
          console.error('[BlurayAPI] Parse error:', parseError);
          reject(parseError);
        }
      });
    });
  }

  /**
   * PUBLIC: Scrape detailed specifications for a specific blu-ray.com URL
   * Returns complete technical specs for the physical media
   */
  async scrapeDiscDetails(blurayUrl: string): Promise<BlurayTechnicalSpecs | null> {
    return new Promise((resolve, reject) => {
      const process = spawn('python3', [
        './scripts/blu-ray-scraper/blu-ray.py',
        '--single-page',
        blurayUrl,
        '--output-format', 'json'
      ]);

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[BlurayAPI] Scraper warning for ${blurayUrl}: ${errorOutput}`);
        }

        try {
          const rawData = JSON.parse(output);
          const specs = this.parseScrapedData(rawData, blurayUrl);
          resolve(specs);
        } catch (parseError) {
          console.error('[BlurayAPI] Parse error:', parseError);
          resolve(null);
        }
      });
    });
  }

  // Parse the raw scraped data into our format
  private parseScrapedData(rawData: any, sourceUrl: string): BlurayTechnicalSpecs {
    return {
      id: this.generateId(rawData.title, rawData.year),
      title: rawData.title || 'Unknown',
      year: parseInt(rawData.year) || new Date().getFullYear(),
      
      // Video specifications
      video_codec: rawData.video_codec,
      video_resolution: this.normalizeResolution(rawData.video_resolution),
      hdr_format: rawData.hdr_format,
      
      // Audio specifications  
      audio_codecs: Array.isArray(rawData.audio_codecs) ? rawData.audio_codecs : [],
      audio_channels: Array.isArray(rawData.audio_channels) ? rawData.audio_channels : [],
      
      // Disc information
      region_codes: Array.isArray(rawData.region_codes) ? rawData.region_codes : [],
      disc_format: rawData.disc_format || 'Blu-ray',
      studio: rawData.studio,
      distributor: rawData.distributor,
      release_date: rawData.release_date,
      
      // Additional data
      special_features: Array.isArray(rawData.special_features) ? rawData.special_features : [],
      upc_code: rawData.upc,
      runtime_minutes: parseInt(rawData.runtime) || undefined,
      aspect_ratio: rawData.aspect_ratio,
      subtitles: Array.isArray(rawData.subtitles) ? rawData.subtitles : [],
      languages: Array.isArray(rawData.languages) ? rawData.languages : [],
      
      // Metadata
      scraped_at: new Date(),
      bluray_com_url: sourceUrl,
      data_quality: this.assessDataQuality(rawData)
    };
  }

  // Cache specs in Supabase
  private async cacheSpecs(specs: BlurayTechnicalSpecs): Promise<void> {
    try {
      const { error } = await supabase
        .from('bluray_specs_cache')
        .upsert([specs], { onConflict: 'id' });
      
      if (error) {
        console.error('[BlurayAPI] Cache error:', error);
      }
    } catch (error) {
      console.error('[BlurayAPI] Cache storage failed:', error);
    }
  }

  // Get cached specs
  private async getCachedSpecs(title: string, year?: number): Promise<BlurayTechnicalSpecs | null> {
    try {
      const id = this.generateId(title, year);
      const { data, error } = await supabase
        .from('bluray_specs_cache')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) return null;
      return data as BlurayTechnicalSpecs;
    } catch (error) {
      console.error('[BlurayAPI] Cache retrieval failed:', error);
      return null;
    }
  }

  // Helper methods
  private generateId(title: string, year?: number): string {
    const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${normalized}_${year || 'unknown'}`;
  }

  private selectBestMatch(results: BluraySearchResult[], targetTitle: string, targetYear?: number): BluraySearchResult {
    // Find best match by title and year
    const targetLower = targetTitle.toLowerCase();
    
    // First try exact year match
    if (targetYear) {
      const exactYearMatch = results.find(r => 
        Math.abs(r.year - targetYear) <= 1 &&
        r.title.toLowerCase().includes(targetLower)
      );
      if (exactYearMatch) return exactYearMatch;
    }
    
    // Then try title match
    const titleMatch = results.find(r =>
      r.title.toLowerCase().includes(targetLower) ||
      targetLower.includes(r.title.toLowerCase())
    );
    
    return titleMatch || results[0];
  }

  private normalizeResolution(resolution?: string): string | undefined {
    if (!resolution) return undefined;
    
    const res = resolution.toLowerCase();
    if (res.includes('4k') || res.includes('2160p')) return '4K UHD';
    if (res.includes('1080p') || res.includes('1080i')) return '1080p';
    if (res.includes('720p')) return '720p';
    if (res.includes('3d')) return '3D';
    return resolution;
  }

  private assessDataQuality(rawData: any): 'complete' | 'partial' | 'minimal' {
    const hasVideoSpecs = !!(rawData.video_codec && rawData.video_resolution);
    const hasAudioSpecs = !!(rawData.audio_codecs && rawData.audio_codecs.length > 0);
    const hasDiscInfo = !!(rawData.disc_format && rawData.region_codes);
    
    const specCount = [hasVideoSpecs, hasAudioSpecs, hasDiscInfo].filter(Boolean).length;
    
    if (specCount === 3) return 'complete';
    if (specCount === 2) return 'partial';
    return 'minimal';
  }

  private isCacheValid(scrapedAt: Date): boolean {
    const cacheAge = Date.now() - new Date(scrapedAt).getTime();
    const maxAge = this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;
    return cacheAge < maxAge;
  }
}

// Export singleton instance
export const blurayApi = new BlurayScrapingService();

// Export types
export interface PhysicalMediaCollection {
  id: string;
  user_id: string;
  // Core movie data (from OMDb)
  imdb_id: string;
  title: string;
  year: number;
  genre?: string;
  director?: string;
  poster_url?: string;
  
  // Physical collection specific
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  purchase_date?: Date;
  purchase_price?: number;
  purchase_location?: string;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  
  // Enhanced technical specs from blu-ray.com
  technical_specs?: BlurayTechnicalSpecs;
  
  // User metadata
  personal_rating?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}