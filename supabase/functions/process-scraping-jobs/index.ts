// supabase/functions/process-scraping-jobs/index.ts - FIXED VERSION
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapingJob {
  id: string
  title: string
  year?: number
  imdb_id?: string
  bluray_com_url?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  collection_item_id?: string
  attempts: number
  max_attempts: number
}

interface BluraySpecs {
  title: string
  year: number
  video_codec?: string
  video_resolution?: string
  hdr_format?: string[]
  audio_codecs?: string[]
  audio_channels?: string[]
  region_codes?: string[]
  special_features?: string[]
  disc_format: string
  studio?: string
  distributor?: string
  release_date?: string
  runtime_minutes?: number
  aspect_ratio?: string
  subtitles?: string[]
  audio_languages?: string[]
  bluray_com_url?: string
  data_quality: 'complete' | 'partial' | 'minimal'
  last_scraped_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[ScrapingWorker] Starting scraping worker...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending jobs (limit to 3 at a time to respect rate limits)
    const { data: pendingJobs, error: jobsError } = await supabaseClient
      .from('scraping_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`retry_after.is.null,retry_after.lt.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(3)

    if (jobsError) {
      console.error('[ScrapingWorker] Failed to fetch jobs:', jobsError)
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
    }

    console.log(`[ScrapingWorker] Found ${pendingJobs?.length || 0} pending jobs`)

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Process each job with rate limiting
    for (let i = 0; i < pendingJobs.length; i++) {
      const job = pendingJobs[i]
      console.log(`[ScrapingWorker] Processing job ${i + 1}/${pendingJobs.length}: ${job.title}`)

      try {
        // Mark job as processing
        await supabaseClient
          .from('scraping_queue')
          .update({ 
            status: 'processing',
            attempts: (job.attempts || 0) + 1,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Add delay BEFORE scraping (22-36 seconds as recommended)
        const baseDelay = 22000 // 22 seconds
        const randomDelay = Math.floor(Math.random() * 14000) // 0-14 seconds
        const totalDelay = baseDelay + randomDelay
        
        console.log(`[ScrapingWorker] Waiting ${totalDelay / 1000}s before scraping...`)
        await new Promise(resolve => setTimeout(resolve, totalDelay))

        // Scrape the specs
        const specs = await scrapeDiscSpecs(job)

        if (specs) {
          console.log(`[ScrapingWorker] Successfully scraped specs for: ${job.title}`)
          
          // Save specs to database
          const { data: savedSpecs, error: specsError } = await supabaseClient
            .from('bluray_technical_specs')
            .upsert([specs], { onConflict: 'title,year,disc_format' })
            .select()
            .single()

          if (specsError) {
            console.error('[ScrapingWorker] Failed to save specs:', specsError)
            throw new Error(`Failed to save specs: ${specsError.message}`)
          }

          // Link to collection item if specified
          if (job.collection_item_id && savedSpecs) {
            await supabaseClient
              .from('physical_media_collections')
              .update({ technical_specs_id: savedSpecs.id })
              .eq('id', job.collection_item_id)
          }

          // Mark job as completed
          await supabaseClient
            .from('scraping_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ 
            job_id: job.id, 
            title: job.title,
            status: 'completed', 
            specs_id: savedSpecs?.id 
          })
        } else {
          throw new Error('No specs found - search returned empty results')
        }

      } catch (error) {
        console.error(`[ScrapingWorker] Failed to process job ${job.id}:`, error.message)

        const currentAttempts = (job.attempts || 0) + 1
        const maxRetries = job.max_attempts || 3
        const shouldRetry = currentAttempts < maxRetries

        if (shouldRetry) {
          // Schedule retry with exponential backoff
          const retryDelay = Math.pow(2, currentAttempts) * 60 * 1000 // 2^attempts minutes
          const retryAfter = new Date(Date.now() + retryDelay).toISOString()

          console.log(`[ScrapingWorker] Scheduling retry ${currentAttempts}/${maxRetries} for ${job.title} at ${retryAfter}`)

          await supabaseClient
            .from('scraping_queue')
            .update({ 
              status: 'pending',
              retry_after: retryAfter,
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ 
            job_id: job.id, 
            title: job.title,
            status: 'retrying', 
            retry_after: retryAfter,
            attempts: currentAttempts,
            max_attempts: maxRetries,
            error: error.message
          })
        } else {
          // Mark as failed after max retries
          console.log(`[ScrapingWorker] Job ${job.title} failed after ${maxRetries} attempts`)
          
          await supabaseClient
            .from('scraping_queue')
            .update({ 
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ 
            job_id: job.id, 
            title: job.title,
            status: 'failed', 
            error: error.message 
          })
        }
      }
    }

    console.log(`[ScrapingWorker] Completed processing ${results.length} jobs`)

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} jobs`, 
        results,
        processed: results.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[ScrapingWorker] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Scraping function using web APIs
async function scrapeDiscSpecs(job: ScrapingJob): Promise<BluraySpecs | null> {
  try {
    console.log(`[Scraper] Starting scrape for: ${job.title}`)
    
    // If we have a direct URL, use it
    if (job.bluray_com_url) {
      console.log(`[Scraper] Using provided URL: ${job.bluray_com_url}`)
      const specs = await scrapeDiscDetails(job.bluray_com_url, job.title, job.year || new Date().getFullYear())
      return specs
    }

    // Otherwise, search for it
    const searchQuery = job.year ? `${job.title} ${job.year}` : job.title
    console.log(`[Scraper] Searching for: ${searchQuery}`)
    
    const searchResults = await searchBlurayDotCom(searchQuery)
    console.log(`[Scraper] Found ${searchResults.length} search results`)
    
    if (searchResults.length === 0) {
      console.log(`[Scraper] No results found for: ${job.title}`)
      return null
    }

    // Get the best match
    const bestMatch = selectBestMatch(searchResults, job.title, job.year)
    console.log(`[Scraper] Best match: ${bestMatch.title} (${bestMatch.year})`)
    
    // Scrape detailed specs from the page
    const specs = await scrapeDiscDetails(bestMatch.url, job.title, job.year || new Date().getFullYear())
    console.log(`[Scraper] Scraped specs successfully`)
    
    return specs
  } catch (error) {
    console.error(`[Scraper] Scraping failed for ${job.title}:`, error.message)
    throw error
  }
}

// Search function
async function searchBlurayDotCom(query: string): Promise<Array<{url: string, title: string, year: number}>> {
  try {
    const searchUrl = `https://www.blu-ray.com/search/?quicksearch=1&quicksearch_country=US&quicksearch_keyword=${encodeURIComponent(query)}&section=bluraymovies`
    
    console.log(`[Scraper] Fetching search URL: ${searchUrl}`)
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    console.log(`[Scraper] Search response status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`Search failed with status: ${response.status}`)
    }

    const html = await response.text()
    console.log(`[Scraper] Received HTML length: ${html.length} characters`)
    
    // Parse search results
    const results = parseSearchResults(html)
    console.log(`[Scraper] Parsed ${results.length} results from HTML`)
    
    return results.slice(0, 5) // Return top 5 results
  } catch (error) {
    console.error('[Scraper] Search failed:', error.message)
    return []
  }
}

// Parse search results from HTML
function parseSearchResults(html: string): Array<{url: string, title: string, year: number}> {
  const results = []
  
  // Try multiple regex patterns to match different HTML structures
  const patterns = [
    // Pattern 1: Standard format
    /<a[^>]+href="(\/movies\/[^"]+)"[^>]*>.*?<b>([^<]+)<\/b>.*?\((\d{4})\)/gi,
    // Pattern 2: Alternative format
    /<a[^>]+href="(\/movies\/[^"]+)"[^>]*>[^<]*<[^>]+>([^<]+)<\/[^>]+>[^(]*\((\d{4})\)/gi,
    // Pattern 3: Simple format
    /href="(\/movies\/[^"]+)"[^>]*>([^<]+)<.*?(\d{4})/gi
  ]
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const [, relativeUrl, title, year] = match
      if (relativeUrl && title && year) {
        results.push({
          url: `https://www.blu-ray.com${relativeUrl}`,
          title: title.trim().replace(/<[^>]+>/g, ''), // Strip any remaining HTML
          year: parseInt(year)
        })
      }
    }
    if (results.length > 0) break // If we found results, stop trying patterns
  }
  
  console.log(`[Scraper] Pattern matching found ${results.length} results`)
  return results
}

// Select best matching result
function selectBestMatch(
  results: Array<{url: string, title: string, year: number}>, 
  targetTitle: string, 
  targetYear?: number
): {url: string, title: string, year: number} {
  if (results.length === 0) {
    throw new Error('No results to select from')
  }

  // If we have a year, prefer exact year matches
  if (targetYear) {
    const exactYearMatch = results.find(r => Math.abs(r.year - targetYear) <= 1)
    if (exactYearMatch) {
      console.log(`[Scraper] Found exact year match: ${exactYearMatch.title}`)
      return exactYearMatch
    }
  }

  // Find best title match
  const targetLower = targetTitle.toLowerCase()
  const bestMatch = results.find(r => 
    r.title.toLowerCase().includes(targetLower) || 
    targetLower.includes(r.title.toLowerCase())
  )

  if (bestMatch) {
    console.log(`[Scraper] Found title match: ${bestMatch.title}`)
    return bestMatch
  }

  console.log(`[Scraper] Using first result: ${results[0].title}`)
  return results[0]
}

// Scrape detailed specs from a movie page
async function scrapeDiscDetails(url: string, title: string, year: number): Promise<BluraySpecs> {
  try {
    console.log(`[Scraper] Fetching details from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    })

    console.log(`[Scraper] Details page response status: ${response.status}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch movie page: ${response.status}`)
    }

    const html = await response.text()
    console.log(`[Scraper] Received details HTML length: ${html.length} characters`)
    
    // Parse technical specifications from the HTML
    const specs = parseMovieSpecs(html, title, year, url)
    console.log(`[Scraper] Parsed specs with quality: ${specs.data_quality}`)
    
    return specs
  } catch (error) {
    console.error(`[Scraper] Failed to scrape ${url}:`, error.message)
    throw error
  }
}

// Parse movie specifications from HTML
function parseMovieSpecs(html: string, title: string, year: number, sourceUrl: string): BluraySpecs {
  const specs: BluraySpecs = {
    title,
    year,
    disc_format: 'Blu-ray',
    data_quality: 'minimal',
    last_scraped_at: new Date().toISOString(),
    bluray_com_url: sourceUrl
  }

  try {
    // Detect disc format from URL or content
    if (sourceUrl.includes('4K-Blu-ray') || html.match(/4K Ultra HD|UHD/i)) {
      specs.disc_format = '4K UHD'
    }

    // Extract video codec
    const videoCodecMatch = html.match(/Video\s*Codec[:\s]*([^<\n]+)/i)
    if (videoCodecMatch) {
      specs.video_codec = videoCodecMatch[1].trim()
      console.log(`[Scraper] Found video codec: ${specs.video_codec}`)
    }

    // Extract video resolution
    const resolutionMatch = html.match(/Resolution[:\s]*([^<\n]+)/i)
    if (resolutionMatch) {
      specs.video_resolution = normalizeResolution(resolutionMatch[1].trim())
      console.log(`[Scraper] Found resolution: ${specs.video_resolution}`)
    }

    // Extract HDR format
    const hdrMatch = html.match(/(HDR10|Dolby Vision|HDR10\+)/gi)
    if (hdrMatch) {
      specs.hdr_format = [...new Set(hdrMatch)]
      console.log(`[Scraper] Found HDR formats: ${specs.hdr_format.join(', ')}`)
    }

    // Extract audio codecs
    const audioMatches = html.match(/(DTS-HD Master Audio|Dolby Atmos|DTS-X|DTS-HD|Dolby TrueHD|LPCM|DTS:\s*X)/gi)
    if (audioMatches) {
      specs.audio_codecs = [...new Set(audioMatches)]
      console.log(`[Scraper] Found audio codecs: ${specs.audio_codecs.join(', ')}`)
    }

    // Extract audio channels
    const channelMatches = html.match(/(\d\.\d)/g)
    if (channelMatches) {
      specs.audio_channels = [...new Set(channelMatches)]
      console.log(`[Scraper] Found audio channels: ${specs.audio_channels.join(', ')}`)
    }

    // Extract runtime
    const runtimeMatch = html.match(/Runtime[:\s]*(\d+)/i)
    if (runtimeMatch) {
      specs.runtime_minutes = parseInt(runtimeMatch[1])
      console.log(`[Scraper] Found runtime: ${specs.runtime_minutes} minutes`)
    }

    // Extract aspect ratio
    const aspectMatch = html.match(/Aspect Ratio[:\s]*([^<\n]+)/i)
    if (aspectMatch) {
      specs.aspect_ratio = aspectMatch[1].trim()
      console.log(`[Scraper] Found aspect ratio: ${specs.aspect_ratio}`)
    }

    // Extract studio
    const studioMatch = html.match(/Studio[:\s]*([^<\n]+)/i)
    if (studioMatch) {
      specs.studio = studioMatch[1].trim()
      console.log(`[Scraper] Found studio: ${specs.studio}`)
    }

    // Assess data quality
    specs.data_quality = assessDataQuality(specs)
    console.log(`[Scraper] Data quality assessed as: ${specs.data_quality}`)

  } catch (error) {
    console.error('[Scraper] Error parsing specs:', error.message)
  }

  return specs
}

function normalizeResolution(resolution: string): string {
  const res = resolution.toLowerCase()
  if (res.includes('4k') || res.includes('2160p')) return '4K UHD'
  if (res.includes('1080p') || res.includes('1080i')) return '1080p'
  if (res.includes('720p')) return '720p'
  return resolution
}

function assessDataQuality(specs: BluraySpecs): 'complete' | 'partial' | 'minimal' {
  let score = 0
  if (specs.video_codec) score += 1
  if (specs.video_resolution) score += 1
  if (specs.audio_codecs && specs.audio_codecs.length > 0) score += 1
  if (specs.audio_channels && specs.audio_channels.length > 0) score += 1
  if (specs.runtime_minutes) score += 1
  if (specs.studio) score += 1

  if (score >= 5) return 'complete'
  if (score >= 3) return 'partial'
  return 'minimal'
}