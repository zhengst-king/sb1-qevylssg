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
    
    // Look for Packaging in the specs section only
    const packagingMatch = html.match(/Packaging:\s*([^<\n]+)/i)
    if (packagingMatch) {
      specs.packaging = packagingMatch[1].trim()
    } else {
      // Try to find packaging within the specs section (between Video and Playback)
      const specsSection = html.match(/<span class="subheading">Video<\/span>([\s\S]*?)<span class="subheading">Playback<\/span>/i)
      if (specsSection) {
        const specsText = specsSection[1].toLowerCase()
        if (specsText.includes('steelbook')) specs.packaging = 'Steelbook'
        else if (specsText.includes('digibook')) specs.packaging = 'Digibook'
        else if (specsText.includes('slipcover')) specs.packaging = 'Slipcover'
      }
      // If still not found, leave undefined (don't guess)
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
    // Find the ratings table - look for the specific table structure
    // The ratings are in a table with labels in one column and values in another
    
    // Pattern: finds rating number that appears after the label
    const extract = (label: string) => {
      // Try multiple patterns
      const patterns = [
        // Pattern 1: Label in td, rating in next td
        new RegExp(`<td[^>]*>${label}</td>[\\s\\S]*?<td[^>]*>(\\d+\\.?\\d*)</td>`, 'i'),
        // Pattern 2: Label followed by rating in any structure
        new RegExp(`${label}[\\s\\S]{0,200}?(\\d+\\.\\d)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (value >= 0 && value <= 5) {
            return value;
          }
        }
      }
      return null;
    };
    
    // Extract each rating with simple labels
    const video4k = extract('4K');
    const video = extract('Video');
    const audio = extract('Audio');
    const extras = extract('Extras');
    const overall = extract('Overall');
    const threeD = extract('3D');
    
    // Assign to correct fields
    if (video4k) ratings.bluray_video_4k_rating = video4k;
    if (threeD) ratings.bluray_3d_rating = threeD;
    if (video) ratings.bluray_video_2k_rating = video;
    if (audio) ratings.bluray_audio_rating = audio;
    if (extras) ratings.bluray_extras_rating = extras;
    if (overall) ratings.bluray_overall_rating = overall;
    
    console.log('[ExtractRatings] Found ratings:', ratings);
  } catch (error) {
    console.error('[ExtractRatings] Error:', error);
  }
  
  return ratings;
}