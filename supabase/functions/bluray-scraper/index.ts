// supabase/functions/bluray-scraper/index.ts
// ENHANCED VERSION - Better search URL and debugging

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT = {
  BASE_DELAY: 22000,
  MAX_RANDOM_DELAY: 14000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 60000
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, query, year, url } = await req.json();
    
    console.log('[BlurayEdge] Request:', { action, query, year, url });

    if (action === 'search') {
      console.warn(`[BlurayEdge] This will take ${RATE_LIMIT.BASE_DELAY/1000}-${(RATE_LIMIT.BASE_DELAY+RATE_LIMIT.MAX_RANDOM_DELAY)/1000}s due to rate limiting`);
      
      const results = await searchBlurayEnhanced(query, year);
      
      return new Response(
        JSON.stringify({ results }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } 
    else if (action === 'scrape') {
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
        JSON.stringify({ error: 'Invalid action' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
  } catch (error) {
    console.error('[BlurayEdge] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getBrowserHeaders(userAgent: string) {
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  };
}

// ENHANCED: Try multiple search URL formats
async function searchBlurayEnhanced(query: string, year?: number) {
  try {
    // Rate limiting
    const baseDelay = RATE_LIMIT.BASE_DELAY;
    const jitter = randomDelay(0, RATE_LIMIT.MAX_RANDOM_DELAY);
    const totalDelay = baseDelay + jitter;
    
    console.log(`[BluraySearch] Applying rate limit: ${totalDelay}ms (${Math.round(totalDelay/1000)}s)`);
    await delay(totalDelay);
    
    const searchQuery = encodeURIComponent(query);
    const userAgent = getRandomUserAgent();
    
    // ENHANCED: Try multiple URL formats in order
    const searchUrls = [
      // Format 1: Direct movie search
      `https://www.blu-ray.com/movies/movies.php?keyword=${searchQuery}`,
      
      // Format 2: Quick search (original)
      `https://www.blu-ray.com/search/?quicksearch=1&quicksearch_keyword=${searchQuery}&section=bluraymovies`,
      
      // Format 3: Advanced search
      `https://www.blu-ray.com/movies/search.php?action=search&keyword=${searchQuery}`,
      
      // Format 4: Simple search
      `https://www.blu-ray.com/search.php?action=search&keyword=${searchQuery}`
    ];
    
    console.log('[BluraySearch] Trying multiple search URL formats...');
    
    for (let attempt = 0; attempt < searchUrls.length && attempt < RATE_LIMIT.RETRY_ATTEMPTS; attempt++) {
      const searchUrl = searchUrls[attempt];
      
      try {
        console.log(`[BluraySearch] Attempt ${attempt + 1}/${searchUrls.length}`);
        console.log(`[BluraySearch] URL: ${searchUrl}`);
        
        const response = await fetch(searchUrl, {
          headers: getBrowserHeaders(userAgent)
        });
        
        console.log(`[BluraySearch] Response: ${response.status} ${response.statusText}`);
        
        if (response.status === 403 || response.status === 429) {
          console.warn(`[BluraySearch] Blocked (${response.status}). Trying next URL format...`);
          continue;
        }
        
        if (!response.ok) {
          console.warn(`[BluraySearch] HTTP ${response.status}. Trying next URL format...`);
          continue;
        }
        
        const html = await response.text();
        console.log(`[BluraySearch] HTML length: ${html.length}`);
        
        // DEBUG: Save first 2000 chars for inspection
        console.log(`[BluraySearch] HTML preview:\n${html.substring(0, 2000)}`);
        
        if (html.length < 1000) {
          console.warn('[BluraySearch] HTML too short, might be blocked');
          continue;
        }
        
        // Parse results with enhanced detection
        const results = parseSearchResultsEnhanced(html, query, year);
        
        if (results.length > 0) {
          console.log(`[BluraySearch] ✅ Success! Found ${results.length} results with URL format ${attempt + 1}`);
          return results;
        }
        
        console.log(`[BluraySearch] No results with URL format ${attempt + 1}, trying next...`);
        
      } catch (error) {
        console.error(`[BluraySearch] Attempt ${attempt + 1} failed:`, error);
        if (attempt < searchUrls.length - 1) {
          await delay(5000); // Short delay between URL attempts
        }
      }
    }
    
    console.log('[BluraySearch] ❌ All search URL formats failed');
    return [];
    
  } catch (error) {
    console.error('[BluraySearch] Fatal error:', error);
    return [];
  }
}

// ENHANCED: Better result detection
function parseSearchResultsEnhanced(html: string, query: string, year?: number): any[] {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) return [];
    
    const results: any[] = [];
    const seenUrls = new Set<string>();
    
    console.log('[Parse] Starting enhanced parsing...');
    
    // Strategy 1: Look for movie result containers
    const movieContainers = [
      'div.movietable',
      'table.list',
      'div[class*="movie"]',
      'tr[class*="movie"]',
      'div.results'
    ];
    
    for (const selector of movieContainers) {
      const containers = doc.querySelectorAll(selector);
      console.log(`[Parse] Strategy: ${selector} - Found ${containers.length} containers`);
      
      if (containers.length > 0) {
        for (const container of containers) {
          const links = container.querySelectorAll('a[href*="/movies/"]');
          console.log(`[Parse]   - Found ${links.length} movie links in container`);
          
          for (const link of links) {
            const result = parseMovieLink(link, seenUrls, year);
            if (result && result.title) { // Only add if has a title
              results.push(result);
            }
          }
        }
        
        if (results.length > 0) {
          console.log(`[Parse] ✅ Found ${results.length} results using ${selector}`);
          return results.slice(0, 20);
        }
      }
    }
    
    // Strategy 2: Look for any movie detail links (not navigation)
    console.log('[Parse] Strategy: Looking for movie detail pages...');
    const allLinks = doc.querySelectorAll('a[href*="/movies/"]');
    console.log(`[Parse] Found ${allLinks.length} total movie links`);
    
    for (const link of allLinks) {
      const href = link.getAttribute('href');
      
      // ENHANCED: Filter out navigation/menu links
      if (href && !isNavigationLink(href)) {
        const result = parseMovieLink(link, seenUrls, year);
        if (result && result.title && result.title.length > 2) { // Must have real title
          results.push(result);
        }
      }
    }
    
    console.log(`[Parse] Total extracted: ${results.length} results`);
    return results.slice(0, 20);
    
  } catch (error) {
    console.error('[Parse] Error:', error);
    return [];
  }
}

// ENHANCED: Filter out navigation links
function isNavigationLink(href: string): boolean {
  const navPatterns = [
    '/movies/movies.php',
    '/movies/reviews.php',
    '/movies/releasedates.php',
    '/movies/search.php',
    '/movies/top.php',
    'show=',
    'sortby=',
    'genre=',
    'quicksearch=',
    '/link/link.php'
  ];
  
  return navPatterns.some(pattern => href.includes(pattern));
}

function parseMovieLink(link: any, seenUrls: Set<string>, yearFilter?: number): any | null {
  try {
    const href = link.getAttribute('href');
    if (!href || seenUrls.has(href)) return null;
    
    // Skip navigation links
    if (isNavigationLink(href)) return null;
    
    const url = href.startsWith('http') ? href : `https://www.blu-ray.com${href}`;
    const titleText = link.textContent?.trim() || '';
    
    if (!titleText || titleText.length < 2) return null;
    
    // Skip common navigation text
    const skipTexts = ['new', 'browse', 'search', 'top', 'calendar', 'coming soon', 'recently', 'pre-order'];
    if (skipTexts.some(text => titleText.toLowerCase() === text)) return null;
    
    seenUrls.add(href);
    
    // Extract year
    const yearMatch = titleText.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 0;
    
    // Clean title
    const cleanTitle = titleText.replace(/\s*\(\d{4}\)/, '').replace(/\s*Blu-ray.*$/i, '').trim();
    
    // Year filter
    if (yearFilter && year !== 0 && Math.abs(year - yearFilter) > 2) {
      return null;
    }
    
    // Determine format
    let format = 'Blu-ray';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('4k') || urlLower.includes('uhd')) {
      format = '4K UHD';
    } else if (urlLower.includes('3d')) {
      format = '3D Blu-ray';
    } else if (urlLower.includes('dvd')) {
      format = 'DVD';
    }
    
    return {
      url,
      title: cleanTitle,
      year,
      format
    };
    
  } catch (error) {
    return null;
  }
}

async function scrapeDiscDetails(url: string) {
  try {
    const delay_ms = RATE_LIMIT.BASE_DELAY + randomDelay(0, RATE_LIMIT.MAX_RANDOM_DELAY);
    console.log(`[BlurayScrape] Applying rate limit: ${delay_ms}ms`);
    await delay(delay_ms);
    
    const userAgent = getRandomUserAgent();
    
    const response = await fetch(url, {
      headers: getBrowserHeaders(userAgent)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    if (!doc) throw new Error('Failed to parse HTML');
    
    const titleElement = doc.querySelector('h1');
    const titleText = titleElement?.textContent?.trim() || '';
    
    const yearMatch = titleText.match(/\((\d{4})\)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 0;
    const cleanTitle = titleText.replace(/\s*\(\d{4}\)/, '').trim();
    
    return {
      id: generateId(cleanTitle, year),
      title: cleanTitle,
      year,
      disc_format: 'Blu-ray',
      scraped_at: new Date().toISOString(),
      bluray_com_url: url,
      data_quality: 'minimal' as const
    };
    
  } catch (error) {
    console.error('[BlurayScrape] Error:', error);
    return null;
  }
}

function generateId(title: string, year: number): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${normalized}_${year || 'unknown'}`;
}