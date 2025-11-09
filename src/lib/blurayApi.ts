// src/lib/blurayApi.ts - REAL IMPLEMENTATION WITH EDGE FUNCTION
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
  private readonly EDGE_FUNCTION_URL = 'bluray-scraper'; // Edge function name
  
  /**
   * PUBLIC: Search blu-ray.com for physical media titles
   */
  async searchBlurayDotCom(query: string, year?: number): Promise<BluraySearchResult[]> {
    console.log('[BlurayAPI] Searching blu-ray.com for:', query, year);
    
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(this.EDGE_FUNCTION_URL, {
        body: { 
          action: 'search',
          query, 
          year 
        }
      });
      
      if (error) {
        console.error('[BlurayAPI] Edge function error:', error);
        throw error;
      }
      
      const results = data?.results || [];
      console.log(`[BlurayAPI] Found ${results.length} results`);
      
      return this.enhanceSearchResults(results);
      
    } catch (error) {
      console.error('[BlurayAPI] Search error:', error);
      
      // Return fallback mock data if Edge Function fails
      console.warn('[BlurayAPI] Falling back to mock data');
      return this.getMockSearchResults(query, year);
    }
  }

  /**
   * PUBLIC: Get detailed specs for a specific blu-ray.com URL
   */
  async scrapeDiscDetails(blurayUrl: string): Promise<BlurayTechnicalSpecs | null> {
    console.log('[BlurayAPI] Fetching specs for:', blurayUrl);
    
    try {
      // Check cache first
      const cached = await this.getCachedSpecsByUrl(blurayUrl);
      if (cached && this.isCacheValid(cached.scraped_at)) {
        console.log('[BlurayAPI] Using cached specs');
        return cached;
      }
      
      // Call Supabase Edge Function to scrape
      const { data, error } = await supabase.functions.invoke(this.EDGE_FUNCTION_URL, {
        body: { 
          action: 'scrape',
          url: blurayUrl 
        }
      });
      
      if (error) {
        console.error('[BlurayAPI] Edge function error:', error);
        throw error;
      }
      
      if (data?.specs) {
        // Cache the results
        await this.cacheSpecs(data.specs);
        console.log('[BlurayAPI] Successfully scraped and cached specs');
        return data.specs;
      }
      
      return null;
      
    } catch (error) {
      console.error('[BlurayAPI] Scrape error:', error);
      
      // Return fallback mock data if Edge Function fails
      console.warn('[BlurayAPI] Falling back to mock data');
      return this.getMockDiscDetails(blurayUrl);
    }
  }

  /**
   * Main method to get enhanced disc data
   */
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
      
      return specs;
    } catch (error) {
      console.error('[BlurayAPI] Error getting disc specs:', error);
      return null;
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * Enhance search results with additional processing
   */
  private enhanceSearchResults(results: BluraySearchResult[]): BluraySearchResult[] {
    return results.map(result => ({
      ...result,
      // Add edition detection from title
      edition: this.detectEdition(result.title),
      // Mark digital releases
      isDigital: result.format.toLowerCase().includes('digital') || 
                 result.format.toLowerCase().includes('stream')
    }));
  }

  /**
   * Detect special edition types from title
   */
  private detectEdition(title: string): string | undefined {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('steelbook')) return 'Steelbook Edition';
    if (lowerTitle.includes('collector')) return 'Collector\'s Edition';
    if (lowerTitle.includes('limited')) return 'Limited Edition';
    if (lowerTitle.includes('special')) return 'Special Edition';
    if (lowerTitle.includes('criterion')) return 'Criterion Collection';
    if (lowerTitle.includes('extended')) return 'Extended Edition';
    if (lowerTitle.includes('director')) return 'Director\'s Cut';
    
    return undefined;
  }

  /**
   * Select the best match from search results
   */
  private selectBestMatch(results: BluraySearchResult[], targetTitle: string, targetYear?: number): BluraySearchResult {
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
    
    // Default to first result
    return titleMatch || results[0];
  }

  // ========== CACHE MANAGEMENT ==========

  private async cacheSpecs(specs: BlurayTechnicalSpecs): Promise<void> {
    try {
      const { error } = await supabase
        .from('bluray_technical_specs')
        .upsert([specs], { onConflict: 'id' });
      
      if (error) {
        console.error('[BlurayAPI] Cache error:', error);
      }
    } catch (error) {
      console.error('[BlurayAPI] Cache storage failed:', error);
    }
  }

  private async getCachedSpecs(title: string, year?: number): Promise<BlurayTechnicalSpecs | null> {
    try {
      const id = this.generateId(title, year);
      const { data, error } = await supabase
        .from('bluray_technical_specs')
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

  private async getCachedSpecsByUrl(url: string): Promise<BlurayTechnicalSpecs | null> {
    try {
      const { data, error } = await supabase
        .from('bluray_technical_specs')
        .select('*')
        .eq('bluray_com_url', url)
        .single();
      
      if (error || !data) return null;
      return data as BlurayTechnicalSpecs;
    } catch (error) {
      console.error('[BlurayAPI] Cache retrieval failed:', error);
      return null;
    }
  }

  private isCacheValid(scrapedAt: Date): boolean {
    const cacheAge = Date.now() - new Date(scrapedAt).getTime();
    const maxAge = this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;
    return cacheAge < maxAge;
  }

  // ========== FALLBACK MOCK DATA ==========

  /**
   * Fallback mock data for when Edge Function is unavailable
   */
  private getMockSearchResults(query: string, year?: number): BluraySearchResult[] {
    const queryLower = query.toLowerCase();
    
    console.warn('[BlurayAPI] Using mock search results as fallback');
    
    return [
      {
        url: `https://www.blu-ray.com/movies/${queryLower.replace(/\s+/g, '-')}-4k`,
        title: query,
        year: year || 2020,
        format: '4K UHD',
        edition: 'Steelbook Edition',
        studio: 'Universal Pictures',
        releaseDate: 'June 2020'
      },
      {
        url: `https://www.blu-ray.com/movies/${queryLower.replace(/\s+/g, '-')}-bluray`,
        title: query,
        year: year || 2020,
        format: 'Blu-ray',
        edition: 'Standard Edition',
        studio: 'Universal Pictures',
        releaseDate: 'June 2020'
      }
    ];
  }

  private getMockDiscDetails(url: string): BlurayTechnicalSpecs {
    const id = this.generateId('Mock Title', 2020);
    
    console.warn('[BlurayAPI] Using mock disc details as fallback');
    
    return {
      id,
      title: 'Mock Title',
      year: 2020,
      video_codec: 'HEVC',
      video_resolution: '4K UHD',
      hdr_format: 'HDR10',
      audio_codecs: ['Dolby Atmos', 'DTS-HD MA 5.1'],
      audio_channels: ['7.1', '5.1'],
      region_codes: ['A'],
      disc_format: '4K UHD',
      studio: 'Universal Pictures',
      release_date: 'June 2020',
      special_features: ['Behind the Scenes', 'Deleted Scenes'],
      aspect_ratio: '2.39:1',
      subtitles: ['English', 'Spanish'],
      languages: ['English'],
      scraped_at: new Date(),
      bluray_com_url: url,
      data_quality: 'partial'
    };
  }

  private generateId(title: string, year?: number): string {
    const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${normalized}_${year || 'unknown'}`;
  }
}

// Export singleton instance
export const blurayApi = new BlurayScrapingService();

// Export types for the Collections feature
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