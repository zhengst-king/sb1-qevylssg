// src/services/blurayExtractor.ts - Algorithm-based extraction
export interface ExtractedSpecs {
  video_codec?: string;
  video_resolution?: string;
  hdr_format?: string[];
  aspect_ratio?: string;
  audio_tracks?: string[];
  subtitles?: string[];
}

export interface BlurayRatings {
  video?: number;
  audio?: number;
  extras?: number;
}

export class BlurayExtractor {
  
  // Extract technical specs using regex patterns
  static extractTechSpecs(html: string): ExtractedSpecs {
    const specs: ExtractedSpecs = {};
    
    try {
      // Find the video section
      const videoMatch = html.match(/<span class="subheading">Video<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/);
      
      if (videoMatch) {
        const videoText = videoMatch[1];
        
        // Codec: HEVC / H.265
        const codecMatch = videoText.match(/Codec:\s*([^<]+)/i);
        if (codecMatch) specs.video_codec = codecMatch[1].trim();
        
        // Resolution: 2160p or Upscaled 4K (2160p)
        const resMatch = videoText.match(/Resolution:\s*([^<]+)/i);
        if (resMatch) specs.video_resolution = resMatch[1].trim();
        
        // HDR: HDR10, Dolby Vision, etc.
        const hdrMatch = videoText.match(/HDR:\s*([^<]+)/i);
        if (hdrMatch) {
          specs.hdr_format = hdrMatch[1].split(/,\s*/).map(h => h.trim());
        }
        
        // Aspect ratio: 2.39:1
        const aspectMatch = videoText.match(/Aspect ratio:\s*([^<]+)/i);
        if (aspectMatch) specs.aspect_ratio = aspectMatch[1].trim();
      }
      
      // Find the audio section
      const audioMatch = html.match(/<span class="subheading">Audio<\/span><br>[\s\S]*?<div[^>]*id="shortaudio"[^>]*>([\s\S]*?)<\/div>/);
      
      if (audioMatch) {
        const audioText = audioMatch[1];
        // Extract each audio track line
        const tracks = audioText.split('<br>').map(t => t.trim()).filter(t => t && t !== '&nbsp;');
        specs.audio_tracks = tracks.map(track => 
          track.replace(/<[^>]+>/g, '').trim()
        ).filter(t => t);
      }
      
      // Find subtitles section
      const subsMatch = html.match(/<span class="subheading">Subtitles<\/span><br>[\s\S]*?<div[^>]*id="shortsubs"[^>]*>([\s\S]*?)<\/div>/);
      
      if (subsMatch) {
        const subsText = subsMatch[1].replace(/<[^>]+>/g, '').trim();
        specs.subtitles = subsText.split(/,\s*/).map(s => s.trim()).filter(s => s);
      }
      
    } catch (error) {
      console.error('[BlurayExtractor] Error extracting specs:', error);
    }
    
    return specs;
  }
  
  // Extract blu-ray.com ratings
  static extractRatings(html: string): BlurayRatings {
    const ratings: BlurayRatings = {};
    
    try {
      // Video rating - looks for pattern like: Video</td><td>4.5</td>
      const videoMatch = html.match(/Video<\/td>\s*<td[^>]*>(\d+\.?\d*)</);
      if (videoMatch) ratings.video = parseFloat(videoMatch[1]);
      
      // Audio rating
      const audioMatch = html.match(/Audio<\/td>\s*<td[^>]*>(\d+\.?\d*)</);
      if (audioMatch) ratings.audio = parseFloat(audioMatch[1]);
      
      // Extras rating
      const extrasMatch = html.match(/Extras<\/td>\s*<td[^>]*>(\d+\.?\d*)</);
      if (extrasMatch) ratings.extras = parseFloat(extrasMatch[1]);
      
    } catch (error) {
      console.error('[BlurayExtractor] Error extracting ratings:', error);
    }
    
    return ratings;
  }
  
  // Extract everything
  static extractAll(html: string): { specs: ExtractedSpecs; ratings: BlurayRatings } {
    return {
      specs: this.extractTechSpecs(html),
      ratings: this.extractRatings(html)
    };
  }
}