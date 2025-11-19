import React, { useState } from 'react';
import { Star, FileVideo, ChevronRight } from 'lucide-react';

interface MediaItemDetailsDisplayProps {
  // Image
  coverUrl?: string;
  title: string;
  fallbackPosterUrl?: string;
  
  // Extracted specs
  extractedSpecs?: any;
  extracting?: boolean;
  
  // Display options
  showImage?: boolean;
  imageSize?: 'sm' | 'md' | 'lg';
}

export function MediaItemDetailsDisplay({
  coverUrl,
  title,
  fallbackPosterUrl,
  extractedSpecs,
  extracting = false,
  showImage = true,
  imageSize = 'md'
}: MediaItemDetailsDisplayProps) {
  const [specsCollapsed, setSpecsCollapsed] = useState(true);
  const [ratingsCollapsed, setRatingsCollapsed] = useState(true);

  const imageSizes = {
    sm: 'w-24 h-36',
    md: 'w-32 h-48',
    lg: 'w-40 h-60'
  };

  return (
    <div className="space-y-6">
      {/* Image (Optional) */}
      {showImage && (
        <div className="flex justify-center">
          <img 
            src={coverUrl || fallbackPosterUrl || '/placeholder.png'} 
            alt={`${title} cover`}
            className={`${imageSizes[imageSize]} object-cover rounded-lg shadow-md border border-slate-300`}
          />
        </div>
      )}

      {/* Technical Specifications Section */}
      {extractedSpecs && (
        <div className="border border-blue-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setSpecsCollapsed(!specsCollapsed)}
            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition"
          >
            <div className="flex items-center gap-2">
              <FileVideo className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-slate-900">Technical Specifications</span>
              {extracting && <span className="text-xs text-slate-500">(extracting...)</span>}
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${specsCollapsed ? '' : 'rotate-90'}`} />
          </button>
          
          {!specsCollapsed && (
            <div className="p-4 bg-white space-y-3 text-sm">
              {extractedSpecs.video_codec && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Video Codec:</span>
                  <span className="font-medium">{extractedSpecs.video_codec}</span>
                </div>
              )}
              {extractedSpecs.video_resolution && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Resolution:</span>
                  <span className="font-medium">{extractedSpecs.video_resolution}</span>
                </div>
              )}
              {extractedSpecs.hdr_format && (
                <div className="flex">
                  <span className="text-slate-600 w-40">HDR:</span>
                  <span className="font-medium">{extractedSpecs.hdr_format.join(', ')}</span>
                </div>
              )}
              {extractedSpecs.aspect_ratio && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Aspect Ratio:</span>
                  <span className="font-medium">{extractedSpecs.aspect_ratio}</span>
                </div>
              )}
              {extractedSpecs.original_aspect_ratio && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Original Aspect Ratio:</span>
                  <span className="font-medium">{extractedSpecs.original_aspect_ratio}</span>
                </div>
              )}
              {extractedSpecs.audio_tracks && extractedSpecs.audio_tracks.length > 0 && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Audio:</span>
                  <div className="font-medium space-y-0.5">
                    {extractedSpecs.audio_tracks.map((track: string, i: number) => (
                      <div key={i}>{track}</div>
                    ))}
                  </div>
                </div>
              )}
              {extractedSpecs.subtitles && extractedSpecs.subtitles.length > 0 && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Subtitles:</span>
                  <span className="font-medium">{extractedSpecs.subtitles.join(', ')}</span>
                </div>
              )}
              {extractedSpecs.discs && extractedSpecs.discs.length > 0 && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Discs:</span>
                  <div className="font-medium space-y-0.5">
                    {extractedSpecs.discs.map((disc: string, i: number) => (
                      <div key={i}>{disc}</div>
                    ))}
                  </div>
                </div>
              )}
              {extractedSpecs.digital_copy_included !== undefined && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Digital Copy:</span>
                  <span className="font-medium">
                    {extractedSpecs.digital_copy_included ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {extractedSpecs.packaging && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Packaging:</span>
                  <span className="font-medium whitespace-pre-line">{extractedSpecs.packaging}</span>
                </div>
              )}
              {extractedSpecs.playback_info && (
                <div className="flex">
                  <span className="text-slate-600 w-40">Playback:</span>
                  <span className="font-medium">{extractedSpecs.playback_info}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Blu-ray.com Ratings Section */}
      {extractedSpecs && (
        <div className="border border-purple-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setRatingsCollapsed(!ratingsCollapsed)}
            className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-slate-900">Blu-ray.com User Ratings</span>
            </div>
            <ChevronRight className={`w-4 h-4 transition-transform ${ratingsCollapsed ? '' : 'rotate-90'}`} />
          </button>
          
          {!ratingsCollapsed && (
            <div className="p-4 bg-white space-y-3">
              {/* Video 4K */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Video 4K</span>
                <div className="flex items-center gap-2">
                  {extractedSpecs.bluray_video_4k_rating ? (
                    <>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${star <= extractedSpecs.bluray_video_4k_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900">{extractedSpecs.bluray_video_4k_rating}/5</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Not rated</span>
                  )}
                </div>
              </div>
              
              {/* Video 2K */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Video 2K</span>
                <div className="flex items-center gap-2">
                  {extractedSpecs.bluray_video_2k_rating ? (
                    <>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${star <= extractedSpecs.bluray_video_2k_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900">{extractedSpecs.bluray_video_2k_rating}/5</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Not rated</span>
                  )}
                </div>
              </div>
              
              {/* 3D */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">3D</span>
                <div className="flex items-center gap-2">
                  {extractedSpecs.bluray_3d_rating ? (
                    <>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${star <= extractedSpecs.bluray_3d_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900">{extractedSpecs.bluray_3d_rating}/5</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Not rated</span>
                  )}
                </div>
              </div>
              
              {/* Audio */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Audio</span>
                <div className="flex items-center gap-2">
                  {extractedSpecs.bluray_audio_rating ? (
                    <>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${star <= extractedSpecs.bluray_audio_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900">{extractedSpecs.bluray_audio_rating}/5</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Not rated</span>
                  )}
                </div>
              </div>
              
              {/* Extras */}
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Special Features</span>
                <div className="flex items-center gap-2">
                  {extractedSpecs.bluray_extras_rating ? (
                    <>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${star <= extractedSpecs.bluray_extras_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900">{extractedSpecs.bluray_extras_rating}/5</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Not rated</span>
                  )}
                </div>
              </div>
              
              {/* Overall */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-900 font-semibold">Overall</span>
                <div className="flex items-center gap-2">
                  {extractedSpecs.bluray_overall_rating ? (
                    <>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star 
                            key={star} 
                            className={`w-5 h-5 ${star <= extractedSpecs.bluray_overall_rating ? 'text-yellow-400 fill-current' : 'text-slate-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-bold text-slate-900 text-lg">{extractedSpecs.bluray_overall_rating}/5</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">Not rated</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}