// src/services/blurayExtractor.ts - UPDATED WITH NEW FIELDS
export interface ExtractedSpecs {
  video_codec?: string;
  video_resolution?: string;
  hdr_format?: string[];
  aspect_ratio?: string;
  original_aspect_ratio?: string;
  audio_tracks?: string[];
  subtitles?: string[];
  discs?: string[];
  digital_copy_included?: boolean;
  packaging?: string;
  playback_info?: string;
}

export interface BlurayRatings {
  video_4k?: number;
  video_2k?: number;
  video_3d?: number;
  audio?: number;
  extras?: number;
  overall?: number;
}

export class BlurayExtractor {
  
  static extractTechSpecs(html: string): ExtractedSpecs {
    const specs: ExtractedSpecs = {};
    
    try {
      // Find the video section
      const videoMatch = html.match(/<span class="subheading">Video<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/);
      
      if (videoMatch) {
        const videoText = videoMatch[1];
        
        // Codec
        const codecMatch = videoText.match(/Codec:\s*([^<]+)/i);
        if (codecMatch) specs.video_codec = codecMatch[1].trim();
        
        // Resolution
        const resMatch = videoText.match(/Resolution:\s*([^<]+)/i);
        if (resMatch) specs.video_resolution = resMatch[1].trim();
        
        // HDR
        const hdrMatch = videoText.match(/HDR:\s*([^<]+)/i);
        if (hdrMatch) {
          specs.hdr_format = hdrMatch[1].split(/,\s*/).map(h => h.trim());
        }
        
        // Aspect ratio
        const aspectMatch = videoText.match(/Aspect ratio:\s*([^<]+)/i);
        if (aspectMatch) specs.aspect_ratio = aspectMatch[1].trim();
        
        // Original aspect ratio
        const origAspectMatch = videoText.match(/Original aspect ratio:\s*([^<]+)/i);
        if (origAspectMatch) specs.original_aspect_ratio = origAspectMatch[1].trim();
      }
      
      // Audio section
      const audioMatch = html.match(/<span class="subheading">Audio<\/span><br>[\s\S]*?<div[^>]*id="shortaudio"[^>]*>([\s\S]*?)<\/div>/);
      if (audioMatch) {
        const audioText = audioMatch[1];
        const tracks = audioText.split('<br>').map(t => t.trim()).filter(t => t && t !== '&nbsp;');
        specs.audio_tracks = tracks.map(track => 
          track.replace(/<[^>]+>/g, '').trim()
        ).filter(t => t);
      }
      
      // Subtitles section
      const subsMatch = html.match(/<span class="subheading">Subtitles<\/span><br>[\s\S]*?<div[^>]*id="shortsubs"[^>]*>([\s\S]*?)<\/div>/);
      if (subsMatch) {
        const subsText = subsMatch[1].replace(/<[^>]+>/g, '').trim();
        specs.subtitles = subsText.split(/,\s*/).map(s => s.trim()).filter(s => s);
      }
      
      // Discs section - look for disc information
      const discsMatch = html.match(/<span class="subheading">Discs<\/span><br>([\s\S]*?)(?:<br><br>|<span class="subheading">)/i);
      if (discsMatch) {
        const discsText = discsMatch[1];
        specs.discs = discsText.split('<br>')
          .map(d => d.replace(/<[^>]+>/g, '').trim())
          .filter(d => d && d.toLowerCase().includes('disc'));
      }
      
      // Digital copy - check if mentioned
      specs.digital_copy_included = /digital\s*(hd|copy|download|ultraviolet|vudu|itunes)/i.test(html);
      
      // Packaging
      const packagingMatch = html.match(/Packaging:\s*([^<\n]+)/i);
      if (packagingMatch) {
        specs.packaging = packagingMatch[1].trim();
      } else {
        // Alternative: look for common packaging types
        if (/steelbook/i.test(html)) specs.packaging = 'Steelbook';
        else if (/digibook/i.test(html)) specs.packaging = 'Digibook';
        else if (/slipcover/i.test(html)) specs.packaging = 'Slipcover';
      }
      
      // Playback / Region info
      const regionMatch = html.match(/Region:\s*([^<\n]+)/i);
      if (regionMatch) {
        specs.playback_info = `Region ${regionMatch[1].trim()}`;
      } else {
        // Look for region codes in common format
        const regCodeMatch = html.match(/Region[s]?\s*([ABC\d,\s]+)/i);
        if (regCodeMatch) specs.playback_info = `Region ${regCodeMatch[1].trim()}`;
      }
      
    } catch (error) {
      console.error('[BlurayExtractor] Error extracting specs:', error);
    }
    
    return specs;
  }
  
  static extractRatings(html: string): BlurayRatings {
    const ratings: BlurayRatings = {};
    
    try {
      // Look for rating table entries
      // Pattern: >Video 4K</td> or >Video</td> followed by rating
      
      // Video 4K rating
      const video4kMatch = html.match(/(?:Video\s*4K|4K)\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (video4kMatch) {
        ratings.video_4k = parseFloat(video4kMatch[1]);
      }
      
      // Video 2K / Video rating (for non-4K)
      const video2kMatch = html.match(/(?:Video\s*2K|Video)\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (video2kMatch && !ratings.video_4k) {
        ratings.video_2k = parseFloat(video2kMatch[1]);
      }
      
      // 3D rating
      const video3dMatch = html.match(/3D\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (video3dMatch) {
        ratings.video_3d = parseFloat(video3dMatch[1]);
      }
      
      // Audio rating
      const audioMatch = html.match(/Audio\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (audioMatch) {
        ratings.audio = parseFloat(audioMatch[1]);
      }
      
      // Extras rating
      const extrasMatch = html.match(/Extras\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (extrasMatch) {
        ratings.extras = parseFloat(extrasMatch[1]);
      }
      
      // Overall rating
      const overallMatch = html.match(/Overall\s*<\/td>\s*<td[^>]*>(\d+\.?\d*)/i);
      if (overallMatch) {
        ratings.overall = parseFloat(overallMatch[1]);
      }
      
    } catch (error) {
      console.error('[BlurayExtractor] Error extracting ratings:', error);
    }
    
    return ratings;
  }
  
  static extractAll(html: string): { specs: ExtractedSpecs; ratings: BlurayRatings } {
    return {
      specs: this.extractTechSpecs(html),
      ratings: this.extractRatings(html)
    };
  }
}