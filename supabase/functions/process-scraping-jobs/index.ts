// supabase/functions/process-scraping-jobs/index.ts
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
  status: 'pending' | 'processing' | 'completed' | 'failed'
  collection_item_id?: string
}

interface BluraySpecs {
  id: string
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
  languages?: string[]
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending jobs (limit to 5 at a time to respect rate limits)
    const { data: pendingJobs, error: jobsError } = await supabaseClient
      .from('scraping_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_after', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5)

    if (jobsError) {
      throw new Error(`Failed to fetch jobs: ${jobsError.message}`)
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []

    // Process each job with rate limiting
    for (const job of pendingJobs) {
      try {
        // Mark job as processing
        await supabaseClient
          .from('scraping_queue')
          .update({ 
            status: 'processing',
            retry_count: (job.retry_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Scrape the specs
        const specs = await scrapeDiscSpecs(job)

        if (specs) {
          // Save specs to database
          const { data: savedSpecs, error: specsError } = await supabaseClient
            .from('bluray_technical_specs')
            .upsert([specs], { onConflict: 'title,year' })
            .select()
            .single()

          if (specsError) {
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

          results.push({ job_id: job.id, status: 'completed', specs_id: savedSpecs?.id })
        } else {
          throw new Error('No specs found')
        }

        // Rate limiting: wait 22 seconds between requests
        if (pendingJobs.indexOf(job) < pendingJobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 22000))
        }

      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error)

        const maxRetries = 3
        const shouldRetry = (job.retry_count || 0) < maxRetries

        if (shouldRetry) {
          // Schedule retry with exponential backoff
          const retryDelay = Math.pow(2, job.retry_count || 0) * 60 * 1000 // minutes
          const retryAfter = new Date(Date.now() + retryDelay).toISOString()

          await supabaseClient
            .from('scraping_queue')
            .update({ 
              status: 'pending',
              retry_after: retryAfter,
              error_message: error.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ job_id: job.id, status: 'retrying', retry_after: retryAfter })
        } else {
          // Mark as failed after max retries
          await supabaseClient
            .from('scraping_queue')
            .update({ 
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          results.push({ job_id: job.id, status: 'failed', error: error.message })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} jobs`, 
        results,
        processed: results.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scraping processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Scraping function using web APIs instead of Python subprocess
async function scrapeDiscSpecs(job: ScrapingJob): Promise<BluraySpecs | null> {
  try {
    const searchQuery = job.year ? `${job.title} ${job.year}` : job.title
    
    // Search blu-ray.com using web scraping
    const searchResults = await searchBlurayDotCom(searchQuery)
    
    if (searchResults.length === 0) {
      console.log(`No results found for: ${job.title}`)
      return null
    }

    // Get the best match
    const bestMatch = selectBestMatch(searchResults, job.title, job.year)
    
    // Scrape detailed specs from the page
    const specs = await scrapeDiscDetails(bestMatch.url, job.title, job.year || new Date().getFullYear())
    
    return specs
  } catch (error) {
    console.error(`Scraping failed for ${job.title}:`, error)
    throw error
  }
}

// Search function using fetch instead of Python
async function searchBlurayDotCom(query: string): Promise<Array<{url: string, title: string, year: number}>> {
  try {
    const searchUrl = `https://www.blu-ray.com/search/?quicksearch=1&quicksearch_country=US&quicksearch_keyword=${encodeURIComponent(query)}&section=bluraymovies`
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const html = await response.text()
    
    // Parse search results using regex (basic approach)
    const results = parseSearchResults(html)
    
    return results.slice(0, 5) // Return top 5 results
  } catch (error) {
    console.error('Search failed:', error)
    return []
  }
}

// Parse search results from HTML
function parseSearchResults(html: string): Array<{url: string, title: string, year: number}> {
  const results = []
  
  // Look for movie links in search results
  const linkRegex = /<a[^>]+href="(\/movies\/[^"]+)"[^>]*>.*?<b>([^<]+)<\/b>.*?\((\d{4})\)/gi
  
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const [, relativeUrl, title, year] = match
    results.push({
      url: `https://www.blu-ray.com${relativeUrl}`,
      title: title.trim(),
      year: parseInt(year)
    })
  }
  
  return results
}

// Select best matching result
function selectBestMatch(results: Array<{url: string, title: string, year: number}>, targetTitle: string, targetYear?: number): {url: string, title: string, year: number} {
  if (results.length === 0) {
    throw new Error('No results to select from')
  }

  // If we have a year, prefer exact year matches
  if (targetYear) {
    const exactYearMatch = results.find(r => Math.abs(r.year - targetYear) <= 1)
    if (exactYearMatch) return exactYearMatch
  }

  // Find best title match
  const targetLower = targetTitle.toLowerCase()
  const bestMatch = results.find(r => 
    r.title.toLowerCase().includes(targetLower) || 
    targetLower.includes(r.title.toLowerCase())
  )

  return bestMatch || results[0]
}

// Scrape detailed specs from a movie page
async function scrapeDiscDetails(url: string, title: string, year: number): Promise<BluraySpecs> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch movie page: ${response.status}`)
    }

    const html = await response.text()
    
    // Parse technical specifications from the HTML
    const specs = parseMovieSpecs(html, title, year, url)
    
    return specs
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error)
    throw error
  }
}

// Parse movie specifications from HTML
function parseMovieSpecs(html: string, title: string, year: number, sourceUrl: string): BluraySpecs {
  const specs: BluraySpecs = {
    id: generateId(title, year),
    title,
    year,
    disc_format: 'Blu-ray',
    data_quality: 'minimal',
    last_scraped_at: new Date().toISOString(),
    bluray_com_url: sourceUrl
  }

  try {
    // Extract video codec
    const videoCodecMatch = html.match(/Video\s*Codec[:\s]*([^<\n]+)/i)
    if (videoCodecMatch) {
      specs.video_codec = videoCodecMatch[1].trim()
    }

    // Extract video resolution
    const resolutionMatch = html.match(/Resolution[:\s]*([^<\n]+)/i)
    if (resolutionMatch) {
      specs.video_resolution = normalizeResolution(resolutionMatch[1].trim())
    }

    // Extract HDR format
    const hdrMatch = html.match(/(HDR10|Dolby Vision|HDR10\+)/gi)
    if (hdrMatch) {
      specs.hdr_format = [...new Set(hdrMatch)]
    }

    // Extract audio codecs
    const audioMatches = html.match(/(DTS-HD Master Audio|Dolby Atmos|DTS-X|DTS-HD|Dolby TrueHD|LPCM)/gi)
    if (audioMatches) {
      specs.audio_codecs = [...new Set(audioMatches)]
    }

    // Extract audio channels
    const channelMatches = html.match(/(\d\.\d)/g)
    if (channelMatches) {
      specs.audio_channels = [...new Set(channelMatches)]
    }

    // Extract runtime
    const runtimeMatch = html.match(/Runtime[:\s]*(\d+)/i)
    if (runtimeMatch) {
      specs.runtime_minutes = parseInt(runtimeMatch[1])
    }

    // Extract aspect ratio
    const aspectMatch = html.match(/Aspect Ratio[:\s]*([^<\n]+)/i)
    if (aspectMatch) {
      specs.aspect_ratio = aspectMatch[1].trim()
    }

    // Extract studio
    const studioMatch = html.match(/Studio[:\s]*([^<\n]+)/i)
    if (studioMatch) {
      specs.studio = studioMatch[1].trim()
    }

    // Assess data quality
    specs.data_quality = assessDataQuality(specs)

  } catch (error) {
    console.error('Error parsing specs:', error)
  }

  return specs
}

function generateId(title: string, year: number): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${normalized}_${year}`
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