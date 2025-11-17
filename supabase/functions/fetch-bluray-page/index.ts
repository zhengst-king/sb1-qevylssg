// supabase/functions/fetch-bluray-page/index.ts - UPDATED EXTRACTION FUNCTIONS

function extractTechSpecs(html: string) {
  const specs: any = {}
  
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
  
  // Discs
  const discsMatch = html.match(/<span class="subheading">Discs<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/i)
  if (discsMatch) {
    const discsText = discsMatch[1]
    specs.discs = discsText.split('<br>')
      .map((d: string) => d.replace(/<[^>]+>/g, '').trim())
      .filter((d: string) => d && d.toLowerCase().includes('disc'))
  }
  
  // Digital copy
  specs.digital_copy_included = /digital\s*(hd|copy|download|ultraviolet|vudu|itunes)/i.test(html)
  
  // Packaging
  const packagingMatch = html.match(/Packaging:\s*([^<\n]+)/i)
  if (packagingMatch) {
    specs.packaging = packagingMatch[1].trim()
  } else {
    if (/steelbook/i.test(html)) specs.packaging = 'Steelbook'
    else if (/digibook/i.test(html)) specs.packaging = 'Digibook'
    else if (/slipcover/i.test(html)) specs.packaging = 'Slipcover'
  }
  
  // Playback
  const regionMatch = html.match(/Region:\s*([^<\n]+)/i)
  if (regionMatch) {
    specs.playback_info = `Region ${regionMatch[1].trim()}`
  } else {
    const regCodeMatch = html.match(/Region[s]?\s*([ABC\d,\s]+)/i)
    if (regCodeMatch) specs.playback_info = `Region ${regCodeMatch[1].trim()}`
  }
  
  return specs
}

function extractRatings(html: string) {
  const ratings: any = {}
  
  // Video 4K
  const video4kMatch = html.match(/(?:Video\s*4K|4K)\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i)
  if (video4kMatch) ratings.bluray_video_4k_rating = parseFloat(video4kMatch[1])
  
  // Video 2K
  const video2kMatch = html.match(/(?:Video\s*2K|Video)\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i)
  if (video2kMatch && !ratings.bluray_video_4k_rating) {
    ratings.bluray_video_2k_rating = parseFloat(video2kMatch[1])
  }
  
  // 3D
  const video3dMatch = html.match(/3D\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i)
  if (video3dMatch) ratings.bluray_3d_rating = parseFloat(video3dMatch[1])
  
  // Audio
  const audioMatch = html.match(/Audio\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i)
  if (audioMatch) ratings.bluray_audio_rating = parseFloat(audioMatch[1])
  
  // Extras
  const extrasMatch = html.match(/Extras\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i)
  if (extrasMatch) ratings.bluray_extras_rating = parseFloat(extrasMatch[1])
  
  // Overall
  const overallMatch = html.match(/Overall\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i)
  if (overallMatch) ratings.bluray_overall_rating = parseFloat(overallMatch[1])
  
  return ratings
}