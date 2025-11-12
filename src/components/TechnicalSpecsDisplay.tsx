// src/components/TechnicalSpecsDisplay.tsx
import React, { useState } from 'react';
import { Monitor, Volume2, Disc, ChevronUp, ChevronDown, Check } from 'lucide-react';
import type { BlurayTechnicalSpecs } from '../lib/supabase';

interface TechnicalSpecsDisplayProps {
  specs: BlurayTechnicalSpecs;
}

export function TechnicalSpecsDisplay({ specs }: TechnicalSpecsDisplayProps) {
  const [showSpecs, setShowSpecs] = useState(true);

  return (
    <div className="bg-white border-2 border-green-500 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowSpecs(!showSpecs)}
        className="w-full flex items-center justify-between p-4 hover:bg-green-50 transition"
      >
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm font-semibold text-green-900">
            Technical Specifications
          </span>
        </div>
        {showSpecs ? (
          <ChevronUp className="w-4 h-4 text-green-700" />
        ) : (
          <ChevronDown className="w-4 h-4 text-green-700" />
        )}
      </button>
      
      {showSpecs && (
        <div className="p-4 bg-white border-t border-green-200 space-y-4 text-sm">
          {/* Video Specs */}
          {(specs.video_codec || specs.video_resolution || specs.aspect_ratio || specs.hdr_format) && (
            <div>
              <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-blue-600" />
                Video
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {specs.video_codec && (
                  <div>
                    <span className="text-slate-600">Codec:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.video_codec}</span>
                  </div>
                )}
                {specs.video_resolution && (
                  <div>
                    <span className="text-slate-600">Resolution:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.video_resolution}</span>
                  </div>
                )}
                {specs.aspect_ratio && (
                  <div>
                    <span className="text-slate-600">Aspect ratio:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.aspect_ratio}</span>
                  </div>
                )}
                {specs.hdr_format && (
                  <div>
                    <span className="text-slate-600">HDR:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {Array.isArray(specs.hdr_format) 
                        ? specs.hdr_format.join(', ') 
                        : specs.hdr_format}
                    </span>
                  </div>
                )}
                {specs.frame_rate && (
                  <div>
                    <span className="text-slate-600">Frame rate:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.frame_rate}</span>
                  </div>
                )}
                {specs.video_bitrate && (
                  <div>
                    <span className="text-slate-600">Bitrate:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.video_bitrate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audio Specs */}
          {(specs.audio_codecs && specs.audio_codecs.length > 0) && (
            <div>
              <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-600" />
                Audio ({specs.audio_codecs.length} track{specs.audio_codecs.length !== 1 ? 's' : ''})
              </h5>
              <div className="space-y-1 text-xs">
                {specs.audio_codecs.map((codec, index) => {
                  const channel = specs.audio_channels?.[index];
                  const language = specs.audio_languages?.[index];
                  return (
                    <div key={index} className="text-slate-700">
                      • {codec}
                      {channel && ` (${channel})`}
                      {language && ` - ${language}`}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtitles */}
          {specs.subtitles && specs.subtitles.length > 0 && (
            <div>
              <h5 className="font-semibold text-slate-900 mb-2">Subtitles</h5>
              <div className="text-xs text-slate-700">
                {specs.subtitles.join(', ')}
              </div>
            </div>
          )}

          {/* Disc Info */}
          {(specs.disc_format || specs.region_codes || specs.disc_count) && (
            <div>
              <h5 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Disc className="w-4 h-4 text-purple-600" />
                Disc
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {specs.disc_format && (
                  <div>
                    <span className="text-slate-600">Format:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.disc_format}</span>
                  </div>
                )}
                {specs.region_codes && (
                  <div>
                    <span className="text-slate-600">Region:</span>{' '}
                    <span className="font-medium text-slate-900">
                      {Array.isArray(specs.region_codes) 
                        ? specs.region_codes.join(', ') 
                        : specs.region_codes}
                    </span>
                  </div>
                )}
                {specs.disc_count && (
                  <div>
                    <span className="text-slate-600">Discs:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.disc_count}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Info */}
          {(specs.runtime_minutes || specs.studio || specs.distributor) && (
            <div>
              <h5 className="font-semibold text-slate-900 mb-2">Additional Info</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {specs.runtime_minutes && (
                  <div>
                    <span className="text-slate-600">Runtime:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.runtime_minutes} min</span>
                  </div>
                )}
                {specs.studio && (
                  <div>
                    <span className="text-slate-600">Studio:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.studio}</span>
                  </div>
                )}
                {specs.distributor && (
                  <div>
                    <span className="text-slate-600">Distributor:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.distributor}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ratings */}
          {(specs.overall_rating || specs.video_4k_rating || specs.audio_rating) && (
            <div>
              <h5 className="font-semibold text-slate-900 mb-2">Blu-ray.com Ratings</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {specs.overall_rating && (
                  <div>
                    <span className="text-slate-600">Overall:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.overall_rating}/5</span>
                  </div>
                )}
                {specs.video_4k_rating && (
                  <div>
                    <span className="text-slate-600">Video (4K):</span>{' '}
                    <span className="font-medium text-slate-900">{specs.video_4k_rating}/5</span>
                  </div>
                )}
                {specs.video_2k_rating && (
                  <div>
                    <span className="text-slate-600">Video (2K):</span>{' '}
                    <span className="font-medium text-slate-900">{specs.video_2k_rating}/5</span>
                  </div>
                )}
                {specs.audio_rating && (
                  <div>
                    <span className="text-slate-600">Audio:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.audio_rating}/5</span>
                  </div>
                )}
                {specs.extras_rating && (
                  <div>
                    <span className="text-slate-600">Extras:</span>{' '}
                    <span className="font-medium text-slate-900">{specs.extras_rating}/5</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}