import React from 'react';
import { Monitor, Volume2, Disc, Globe, Star, Clock, Award } from 'lucide-react';
import type { BlurayTechnicalSpecs } from '../lib/supabase';

interface TechnicalSpecsDisplayProps {
  specs: BlurayTechnicalSpecs;
  compact?: boolean;
}

export function TechnicalSpecsDisplay({ specs, compact = false }: TechnicalSpecsDisplayProps) {
  const qualityColors = {
    complete: 'text-green-600 bg-green-50',
    partial: 'text-yellow-600 bg-yellow-50',
    minimal: 'text-orange-600 bg-orange-50'
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Video Quality Badges */}
        <div className="flex flex-wrap gap-1">
          {specs.video_resolution && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {specs.video_resolution}
            </span>
          )}
          {specs.hdr_format && specs.hdr_format.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
              {specs.hdr_format[0]}
            </span>
          )}
        </div>

        {/* Audio Badges */}
        {specs.audio_codecs && specs.audio_codecs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specs.audio_codecs.slice(0, 2).map((codec, index) => (
              <span key={index} className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {codec.replace(/\s*\(.*?\)\s*/g, '')} {/* Remove language info for compact view */}
              </span>
            ))}
            {specs.audio_codecs.length > 2 && (
              <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                +{specs.audio_codecs.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Data Quality Indicator */}
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${qualityColors[specs.data_quality]}`}>
            {specs.data_quality} specs
          </span>
          {specs.bluray_com_url && (
            
              href={specs.bluray_com_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View Details
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-slate-900 flex items-center">
          <Disc className="h-4 w-4 mr-2" />
          Technical Specifications
        </h4>
        <span className={`text-xs px-2 py-1 rounded-full ${qualityColors[specs.data_quality]}`}>
          {specs.data_quality}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Video Specifications */}
        {(specs.video_resolution || specs.video_codec || specs.hdr_format) && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 flex items-center">
              <Monitor className="h-3 w-3 mr-1" />
              Video
            </h5>
            <div className="space-y-1 text-xs text-slate-600">
              {specs.video_resolution && (
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="font-medium">{specs.video_resolution}</span>
                </div>
              )}
              {specs.video_codec && (
                <div className="flex justify-between">
                  <span>Codec:</span>
                  <span className="font-medium">{specs.video_codec}</span>
                </div>
              )}
              {specs.hdr_format && specs.hdr_format.length > 0 && (
                <div className="flex justify-between">
                  <span>HDR:</span>
                  <span className="font-medium">{specs.hdr_format.join(', ')}</span>
                </div>
              )}
              {specs.aspect_ratio && (
                <div className="flex justify-between">
                  <span>Aspect Ratio:</span>
                  <span className="font-medium">{specs.aspect_ratio}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio Specifications */}
        {(specs.audio_codecs || specs.audio_channels) && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 flex items-center">
              <Volume2 className="h-3 w-3 mr-1" />
              Audio
            </h5>
            <div className="space-y-1 text-xs text-slate-600">
              {specs.audio_codecs && specs.audio_codecs.length > 0 && (
                <div>
                  <span className="block mb-1">Codecs:</span>
                  <div className="flex flex-wrap gap-1">
                    {specs.audio_codecs.map((codec, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        {codec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {specs.audio_channels && specs.audio_channels.length > 0 && (
                <div className="flex justify-between">
                  <span>Channels:</span>
                  <span className="font-medium">{specs.audio_channels.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disc Information */}
        {(specs.region_codes || specs.studio || specs.disc_count) && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 flex items-center">
              <Globe className="h-3 w-3 mr-1" />
              Disc Info
            </h5>
            <div className="space-y-1 text-xs text-slate-600">
              {specs.region_codes && specs.region_codes.length > 0 && (
                <div className="flex justify-between">
                  <span>Region:</span>
                  <span className="font-medium">{specs.region_codes.join(', ')}</span>
                </div>
              )}
              {specs.studio && (
                <div className="flex justify-between">
                  <span>Studio:</span>
                  <span className="font-medium">{specs.studio}</span>
                </div>
              )}
              {specs.disc_count && specs.disc_count > 1 && (
                <div className="flex justify-between">
                  <span>Discs:</span>
                  <span className="font-medium">{specs.disc_count}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Special Features */}
        {specs.special_features && specs.special_features.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 flex items-center">
              <Award className="h-3 w-3 mr-1" />
              Special Features
            </h5>
            <div className="space-y-1 text-xs text-slate-600">
              {specs.special_features.slice(0, 3).map((feature, index) => (
                <div key={index} className="flex items-start">
                  <span className="w-1 h-1 bg-slate-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  <span>{feature}</span>
                </div>
              ))}
              {specs.special_features.length > 3 && (
                <div className="text-slate-500 italic">
                  +{specs.special_features.length - 3} more features
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <div className="flex items-center text-xs text-slate-500">
          <Clock className="h-3 w-3 mr-1" />
          Updated {new Date(specs.last_scraped_at).toLocaleDateString()}
        </div>
        {specs.bluray_com_url && (
          
            href={specs.bluray_com_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View Full Details →
          </a>
        )}
      </div>
    </div>
  );
}