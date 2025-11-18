//home/project/supabase/functions/fetch-bluray-page/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url?.includes('blu-ray.com')) {
      throw new Error('Invalid URL - must be from blu-ray.com')
    }

    console.log('[FetchBluray] Processing URL:', url)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check cache first
    const { data: cached } = await supabase
      .from('bluray_page_cache')
      .select('*')
      .eq('bluray_com_url', url)
      .single()

    if (cached) {
      console.log('[FetchBluray] Cache HIT')
      await supabase
        .from('bluray_page_cache')
        .update({ last_accessed: new Date().toISOString() })
        .eq('bluray_com_url', url)
      
      return new Response(JSON.stringify({ 
        cached: true,
        ...cached 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('[FetchBluray] Cache MISS - Fetching')

    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    console.log('[FetchBluray] Fetched HTML:', html.length, 'chars')

    // Extract data
    const specs = extractTechSpecs(html)
    const ratings = extractRatings(html)

    console.log('[FetchBluray] Extracted')

    // Cache in database
    const { data: saved } = await supabase
      .from('bluray_page_cache')
      .insert([{
        bluray_com_url: url,
        html_content: html,
        ...specs,
        ...ratings
      }])
      .select()
      .single()

    return new Response(JSON.stringify({ 
      cached: false,
      ...saved 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('[FetchBluray] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

function extractTechSpecs(html: string) {
  const specs: any = {}
  
  try {
    const videoMatch = html.match(/<span class="subheading">Video<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/)
    if (videoMatch) {
      const videoText = videoMatch[1]
      
      const codecMatch = videoText.match(/Codec:\s*([^<]+)/i)
      if (codecMatch) specs.video_codec = codecMatch[1].trim()
      
      const resMatch = videoText.match(/Resolution:\s*([^<]+)/i)
      if (resMatch) specs.video_resolution = resMatch[1].trim()
      
      const hdrMatch = videoText.match(/HDR:\s*([^<]+)/i)
      if (hdrMatch) specs.hdr_format = hdrMatch[1].split(/,\s*/).map((h: string) => h.trim())
      
      const aspectMatch = videoText.match(/Aspect ratio:\s*([^<]+)/i)
      if (aspectMatch) specs.aspect_ratio = aspectMatch[1].trim()
      
      const origAspectMatch = videoText.match(/Original aspect ratio:\s*([^<]+)/i)
      if (origAspectMatch) specs.original_aspect_ratio = origAspectMatch[1].trim()
    }
    
    const audioMatch = html.match(/<span class="subheading">Audio<\/span><br>[\s\S]*?<div[^>]*id="shortaudio"[^>]*>([\s\S]*?)<\/div>/)
    if (audioMatch) {
      const audioText = audioMatch[1]
      specs.audio_tracks = audioText.split('<br>').map((t: string) => t.replace(/<[^>]+>/g, '').trim()).filter((t: string) => t && t !== '&nbsp;')
    }
    
    const subsMatch = html.match(/<span class="subheading">Subtitles<\/span><br>[\s\S]*?<div[^>]*id="shortsubs"[^>]*>([\s\S]*?)<\/div>/)
    if (subsMatch) {
      const subsText = subsMatch[1].replace(/<[^>]+>/g, '').trim()
      specs.subtitles = subsText.split(/,\s*/).map((s: string) => s.trim()).filter((s: string) => s)
    }
    
    const discsMatch = html.match(/<span class="subheading">Discs<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/i)
    if (discsMatch) {
      specs.discs = discsMatch[1].split('<br>')
        .map((d: string) => d.replace(/<[^>]+>/g, '').trim())
        .filter((d: string) => d && d.toLowerCase().includes('disc'))
    }
    
    specs.digital_copy_included = /digital\s*(hd|copy|download|ultraviolet|vudu|itunes)/i.test(html)
    
    const packagingMatch = html.match(/Packaging:\s*([^<\n]+)/i)
    if (packagingMatch) {
      specs.packaging = packagingMatch[1].trim()
    } else {
      if (/steelbook/i.test(html)) specs.packaging = 'Steelbook'
      else if (/digibook/i.test(html)) specs.packaging = 'Digibook'
      else if (/slipcover/i.test(html)) specs.packaging = 'Slipcover'
    }
    
    // Look for Playback section first
    const playbackMatch = html.match(/<span class="subheading">Playback<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/i)
    if (playbackMatch) {
      const playbackText = playbackMatch[1].replace(/<[^>]+>/g, '').trim()
      specs.playback_info = playbackText
    } else {
      // Fallback: Look for "Region free" pattern (common in 4K releases)
      const regionFreeMatch = html.match(/(?:4K Blu-ray|Blu-ray):\s*(Region\s+free)/i)
      if (regionFreeMatch) {
        specs.playback_info = regionFreeMatch[1]
      } else {
        // Fallback: Look for standard Region code
        const regionMatch = html.match(/Region[:\s]+([ABC\d\s,]+)/i)
        if (regionMatch) {
          specs.playback_info = `Region ${regionMatch[1].trim()}`
        }
      }
    }
  } catch (error) {
    console.error('[ExtractSpecs] Error:', error)
  }
  
  return specs
}

function extractRatings(html: string) {
  const ratings: any = {}
  
  try {
    // Look for the Blu-ray user rating section
    // Pattern: <td>Label</td> [skip graphics] <td>rating</td>
    
    // More robust pattern: look for table row with rating label and capture number in same or next cell
    const ratingPatterns = [
      { key: 'bluray_video_4k_rating', patterns: [/(?:Video 4K|4K)[\s\S]*?<td[^>]*>(\d+\.?\d*)<\/td>/i] },
      { key: 'bluray_video_2k_rating', patterns: [/Video(?:\s+2K)?[\s\S]*?<td[^>]*>(\d+\.?\d*)<\/td>/i] },
      { key: 'bluray_3d_rating', patterns: [/3D[\s\S]*?<td[^>]*>(\d+\.?\d*)<\/td>/i] },
      { key: 'bluray_audio_rating', patterns: [/Audio[\s\S]*?<td[^>]*>(\d+\.?\d*)<\/td>/i] },
      { key: 'bluray_extras_rating', patterns: [/Extras[\s\S]*?<td[^>]*>(\d+\.?\d*)<\/td>/i] },
      { key: 'bluray_overall_rating', patterns: [/Overall[\s\S]*?<td[^>]*>(\d+\.?\d*)<\/td>/i] }
    ];
    
    // Find the ratings table section
    const ratingsSection = html.match(/<h3[^>]*>Blu-ray user rating<\/h3>([\s\S]*?)(?:<h3|<div class="clear">)/i);
    
    if (ratingsSection) {
      const ratingsHtml = ratingsSection[1];
      
      // Extract each rating from the section
      for (const { key, patterns } of ratingPatterns) {
        for (const pattern of patterns) {
          const match = ratingsHtml.match(pattern);
          if (match) {
            const value = parseFloat(match[1]);
            if (value >= 0 && value <= 5) {
              ratings[key] = value;
              break;
            }
          }
        }
      }
    }
    
    // Fallback: try original simple patterns if no ratings found
    if (Object.keys(ratings).length === 0) {
      const video4kMatch = html.match(/(?:Video\s*4K|4K)\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (video4kMatch) ratings.bluray_video_4k_rating = parseFloat(video4kMatch[1]);
      
      const video2kMatch = html.match(/Video\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (video2kMatch && !ratings.bluray_video_4k_rating) {
        ratings.bluray_video_2k_rating = parseFloat(video2kMatch[1]);
      }
      
      const audioMatch = html.match(/Audio\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (audioMatch) ratings.bluray_audio_rating = parseFloat(audioMatch[1]);
      
      const extrasMatch = html.match(/Extras\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (extrasMatch) ratings.bluray_extras_rating = parseFloat(extrasMatch[1]);
      
      const overallMatch = html.match(/Overall\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (overallMatch) ratings.bluray_overall_rating = parseFloat(overallMatch[1]);
    }
    
    console.log('[ExtractRatings] Found ratings:', ratings);
  } catch (error) {
    console.error('[ExtractRatings] Error:', error);
  }
  
  return ratings;
}