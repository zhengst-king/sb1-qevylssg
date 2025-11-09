// supabase/functions/bluray-scraper/index.ts
// Supabase Edge Function for scraping blu-ray.com

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  url: string;
  title: string;
  year: number;
  format: string;
  edition?: string;
  studio?: string;
  releaseDate?: string;
  isDigital?: boolean;
}

interface TechnicalSpecs {
  id: string;
  title: string;
  year: number;
  video_codec?: string;
  video_resolution?: string;
  hdr_format?: string;
  audio_codecs?: string[];
  audio_channels?: string[];
  region_codes?: string[];
  disc_format: string;
  studio?: string;
  distributor?: string;
  release_date?: string;
  special_features?: string[];
  upc_code?: string;
  runtime_minutes?: number;
  aspect_ratio?: string;
  subtitles?: string[];
  languages?: string[];
  scraped_at: string;
  bluray_com_url: string;
  data_quality: 'complete' | 'partial' | 'minimal';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, query, year, url } = await req.json();

    if (action === 'search') {
      // Search blu-ray.com for titles
      const searchResults = await searchBluray(query, year);
      return new Response(
        JSON.stringify({ results: searchResults }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } 
    
    else if (action === 'scrape') {
      // Scrape details from a specific blu-ray.com URL
      const specs = await scrapeDiscDetails(url);
      return new Response(
        JSON.stringify({ specs }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "search" or "scrape".' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function searchBluray(query: string, year?: number): Promise<SearchResult[]> {
  try {
    // Build search URL
    const searchQuery = encodeURIComponent(query);
    const searchUrl = `https://www.blu-ray.com/search/?quicksearch=1&quicksearch_keyword=${searchQuery}&section=bluraymovies`;
    
    console.log('[BluraySearch] Fetching:', searchUrl);
    
    // Fetch search results
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }
    
    const results: SearchResult[] = [];
    
    // Parse search results from the page
    // Blu-ray.com search results are in table format
    const resultRows = doc.querySelectorAll('table.list tr');
    
    for (const row of resultRows) {
      try {
        const titleLink = row.querySelector('a[href*="/movies/"]');
        if (!titleLink) continue;
        
        const url = 'https://www.blu-ray.com' + titleLink.getAttribute('href');
        const titleText = titleLink.textContent?.trim() || '';
        
        // Extract year from title (format: "Title (YYYY)")
        const yearMatch = titleText.match(/\((\d{4})\)/);
        const extractedYear = yearMatch ? parseInt(yearMatch[1]) : 0;
        
        // Clean title (remove year)
        const cleanTitle = titleText.replace(/\s*\(\d{4}\)/, '').trim();
        
        // Determine format from the row or URL
        let format = 'Blu-ray'; // Default
        if (url.includes('4K') || url.includes('UHD')) {
          format = '4K UHD';
        } else if (url.includes('3D')) {
          format = '3D Blu-ray';
        } else if (url.includes('DVD')) {
          format = 'DVD';
        }
        
        // Check if it matches the year filter (if provided)
        if (year && extractedYear !== 0 && Math.abs(extractedYear - year) > 2) {
          continue; // Skip if year doesn't match (allow 2 year margin)
        }
        
        results.push({
          url,
          title: cleanTitle,
          year: extractedYear,
          format
        });
        
      } catch (err) {
        console.error('Error parsing result row:', err);
        continue;
      }
    }
    
    console.log(`[BluraySearch] Found ${results.length} results`);
    return results.slice(0, 20); // Limit to 20 results
    
  } catch (error) {
    console.error('[BluraySearch] Error:', error);
    return [];
  }
}

async function scrapeDiscDetails(url: string): Promise<TechnicalSpecs | null> {
  try {
    console.log('[BlurayScrape] Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }
    
    // Extract title and year
    const titleElement = doc.querySelector('h1');
    const titleText = titleElement?.textContent?.trim() || '';
    const yearMatch = titleText.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 0;
    const cleanTitle = titleText.replace(/\s*\(\d{4}\)/, '').trim();
    
    // Initialize specs object
    const specs: TechnicalSpecs = {
      id: generateId(cleanTitle, year),
      title: cleanTitle,
      year,
      disc_format: 'Blu-ray',
      scraped_at: new Date().toISOString(),
      bluray_com_url: url,
      data_quality: 'minimal'
    };
    
    // Parse technical specifications
    // Blu-ray.com has specs in a structured table
    const specRows = doc.querySelectorAll('.specs table tr, .technical_specs table tr');
    
    for (const row of specRows) {
      const label = row.querySelector('td:first-child')?.textContent?.trim().toLowerCase() || '';
      const value = row.querySelector('td:last-child')?.textContent?.trim() || '';
      
      if (!value || value === 'N/A') continue;
      
      // Video specs
      if (label.includes('video') && label.includes('resolution')) {
        specs.video_resolution = normalizeResolution(value);
      }
      if (label.includes('video') && label.includes('codec')) {
        specs.video_codec = value;
      }
      if (label.includes('aspect ratio')) {
        specs.aspect_ratio = value;
      }
      
      // HDR
      if (label.includes('hdr') || label.includes('high dynamic range')) {
        specs.hdr_format = value;
      }
      
      // Audio specs
      if (label.includes('audio') && !label.includes('commentary')) {
        const audioTracks = value.split(/,|;/).map(t => t.trim()).filter(t => t);
        specs.audio_codecs = audioTracks;
      }
      
      // Region
      if (label.includes('region')) {
        specs.region_codes = value.split(',').map(r => r.trim());
      }
      
      // Studio
      if (label.includes('studio') || label.includes('distributor')) {
        specs.studio = value;
      }
      
      // Release date
      if (label.includes('release date') || label.includes('release')) {
        specs.release_date = value;
      }
      
      // Runtime
      if (label.includes('runtime') || label.includes('running time')) {
        const runtimeMatch = value.match(/(\d+)/);
        if (runtimeMatch) {
          specs.runtime_minutes = parseInt(runtimeMatch[1]);
        }
      }
      
      // Languages
      if (label.includes('subtitle')) {
        specs.subtitles = value.split(',').map(l => l.trim());
      }
      if (label.includes('language') && !label.includes('subtitle')) {
        specs.languages = value.split(',').map(l => l.trim());
      }
      
      // UPC
      if (label.includes('upc')) {
        specs.upc_code = value;
      }
    }
    
    // Determine disc format from URL or content
    if (url.includes('4K') || url.includes('UHD') || specs.video_resolution?.includes('4K')) {
      specs.disc_format = '4K UHD';
    } else if (url.includes('3D')) {
      specs.disc_format = '3D Blu-ray';
    } else if (url.includes('DVD')) {
      specs.disc_format = 'DVD';
    }
    
    // Assess data quality
    specs.data_quality = assessDataQuality(specs);
    
    console.log('[BlurayScrape] Successfully scraped specs');
    return specs;
    
  } catch (error) {
    console.error('[BlurayScrape] Error:', error);
    return null;
  }
}

function generateId(title: string, year: number): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalized}_${year || 'unknown'}`;
}

function normalizeResolution(resolution: string): string {
  const res = resolution.toLowerCase();
  if (res.includes('4k') || res.includes('2160p') || res.includes('uhd')) return '4K UHD';
  if (res.includes('1080p') || res.includes('1080i')) return '1080p';
  if (res.includes('720p')) return '720p';
  if (res.includes('3d')) return '3D';
  return resolution;
}

function assessDataQuality(specs: TechnicalSpecs): 'complete' | 'partial' | 'minimal' {
  const hasVideoSpecs = !!(specs.video_codec && specs.video_resolution);
  const hasAudioSpecs = !!(specs.audio_codecs && specs.audio_codecs.length > 0);
  const hasDiscInfo = !!(specs.disc_format && specs.region_codes);
  
  const specCount = [hasVideoSpecs, hasAudioSpecs, hasDiscInfo].filter(Boolean).length;
  
  if (specCount === 3) return 'complete';
  if (specCount === 2) return 'partial';
  return 'minimal';
}