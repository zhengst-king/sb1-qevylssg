import React from 'react';
import { 
  Disc, 
  Monitor, 
  Volume2, 
  Globe, 
  Clock, 
  Sparkles,
  Film,
  Zap,
  Layers,
  ExternalLink
} from 'lucide-react';
import { BlurayTechnicalSpecs } from '../lib/supabase';

interface TechnicalSpecsDisplayProps {
  specs: BlurayTechnicalSpecs;
  compact?: boolean;
  showBorder?: boolean;
}

export const TechnicalSpecsDisplay: React.FC<TechnicalSpecsDisplayProps> = ({ 
  specs, 
  compact = false,
  showBorder = true 
}) => {
  const qualityColors = {
    complete: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    minimal: 'bg-red-100 text-red-800'
  };

  // Helper function to get premium video features
  const getPremiumVideoFeatures = () => {
    const features = [];
    
    if (specs.video_resolution?.includes('4K') || specs.video_resolution?.includes('2160p')) {
      features.push({ label: '4K UHD', icon: Monitor, color: 'purple' });
    }
    
    if (specs.hdr_format && specs.hdr_format.length > 0) {
      specs.hdr_format.forEach(hdr => {
        if (hdr.includes('Dolby Vision')) {
          features.push({ label: 'Dolby Vision', icon: Sparkles, color: 'pink' });
        } else if (hdr.includes('HDR10+')) {
          features.push({ label: 'HDR10+', icon: Sparkles, color: 'orange' });
        } else if (hdr.includes('HDR10')) {
          features.push({ label: 'HDR10', icon: Sparkles, color: 'amber' });
        }
      });
    }

    if (specs.video_resolution?.includes('3D')) {
      features.push({ label: '3D', icon: Layers, color: 'cyan' });
    }

    return features.slice(0, 3); // Limit to 3 features for compact view
  };

  // Helper function to get premium audio features
  const getPremiumAudioFeatures = () => {
    const features = [];
    
    if (specs.audio_codecs) {
      specs.audio_codecs.forEach(codec => {
        const cleanCodec = codec.replace(/\s*\(.*?\)\s*/g, ''); // Remove language info
        
        if (cleanCodec.includes('Dolby Atmos')) {
          features.push({ label: 'Dolby Atmos', icon: Volume2, color: 'emerald' });
        } else if (cleanCodec.includes('DTS-X')) {
          features.push({ label: 'DTS-X', icon: Volume2, color: 'blue' });
        } else if (cleanCodec.includes('DTS-HD MA')) {
          features.push({ label: 'DTS-HD MA', icon: Volume2, color: 'indigo' });
        } else if (cleanCodec.includes('Dolby TrueHD')) {
          features.push({ label: 'Dolby TrueHD', icon: Volume2, color: 'green' });
        }
      });
    }

    return features.slice(0, 2); // Limit to 2 features for compact view
  };

  const getColorClasses = (color: string) => {
    const colors = {
      purple: 'bg-purple-500 text-white',
      pink: 'bg-pink-500 text-white', 
      orange: 'bg-orange-500 text-white',
      amber: 'bg-amber-500 text-white',
      cyan: 'bg-cyan-500 text-white',
      emerald: 'bg-emerald-500 text-white',
      blue: 'bg-blue-500 text-white',
      indigo: 'bg-indigo-500 text-white',
      green: 'bg-green-500 text-white'
    };
    return colors[color] || 'bg-slate-500 text-white';
  };

  if (compact) {
    const premiumVideo = getPremiumVideoFeatures();
    const premiumAudio = getPremiumAudioFeatures();
    
    return (
      <div className={`${showBorder ? 'bg-slate-50 rounded-lg p-3' : ''} space-y-3`}>
        {/* Premium Features Row */}
        <div className="space-y-2">
          {/* Video Features */}
          {premiumVideo.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {premiumVideo.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <span 
                    key={index}
                    className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${getColorClasses(feature.color)}`}
                  >
                    <Icon className="h-2 w-2 mr-1" />
                    {feature.label}
                  </span>
                );
              })}
            </div>
          )}
          
          {/* Audio Features */}
          {premiumAudio.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {premiumAudio.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <span 
                    key={index}
                    className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${getColorClasses(feature.color)}`}
                  >
                    <Icon className="h-2 w-2 mr-1" />
                    {feature.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Basic Specs Row */}
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-3">
            {specs.aspect_ratio && (
              <span className="flex items-center">
                <Film className="h-3 w-3 mr-1" />
                {specs.aspect_ratio}
              </span>
            )}
            {specs.runtime_minutes && (
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {Math.floor(specs.runtime_minutes / 60)}h {specs.runtime_minutes % 60}m
              </span>
            )}
          </div>
          
          {/* Data Quality Indicator */}
          <span className={`text-xs px-2 py-1 rounded-full ${qualityColors[specs.data_quality]}`}>
            {specs.data_quality}
          </span>
        </div>
      </div>
    );
  }

  // Full detailed view
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
            <div className="space-y-1 text-sm text-slate-600">
              {specs.video_resolution && (
                <div className="flex items-center justify-between">
                  <span>Resolution:</span>
                  <span className="font-medium">{specs.video_resolution}</span>
                </div>
              )}
              {specs.video_codec && (
                <div className="flex items-center justify-between">
                  <span>Codec:</span>
                  <span className="font-medium">{specs.video_codec}</span>
                </div>
              )}
              {specs.aspect_ratio && (
                <div className="flex items-center justify-between">
                  <span>Aspect Ratio:</span>
                  <span className="font-medium">{specs.aspect_ratio}</span>
                </div>
              )}
              {specs.frame_rate && (
                <div className="flex items-center justify-between">
                  <span>Frame Rate:</span>
                  <span className="font-medium">{specs.frame_rate}</span>
                </div>
              )}
              {specs.hdr_format && specs.hdr_format.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">HDR Formats:</span>
                  <div className="flex flex-wrap gap-1">
                    {specs.hdr_format.map((hdr, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full"
                      >
                        {hdr}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio Specifications */}
        {(specs.audio_codecs || specs.audio_channels || specs.audio_languages) && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-slate-700 flex items-center">
              <Volume2 className="h-3 w-3 mr-1" />
              Audio
            </h5>
            <div className="space-y-2 text-sm text-slate-600">
              {specs.audio_codecs && specs.audio_codecs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Codecs:</span>
                  <div className="space-y-1">
                    {specs.audio_codecs.slice(0, 4).map((codec, index) => (
                      <div key={index} className="text-xs bg-slate-100 rounded px-2 py-1">
                        {codec}
                      </div>
                    ))}
                    {specs.audio_codecs.length > 4 && (
                      <span className="text-xs text-slate-500">
                        +{specs.audio_codecs.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              {specs.audio_channels && specs.audio_channels.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Channels:</span>
                  <div className="flex flex-wrap gap-1">
                    {specs.audio_channels.map((channel, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {specs.audio_languages && specs.audio_languages.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Languages:</span>
                  <div className="flex flex-wrap gap-1">
                    {specs.audio_languages.slice(0, 3).map((lang, index) => (
                      <span 
                        key={index}
                        className="px-1 py-0.5 text-xs bg-slate-200 text-slate-700 rounded"
                      >
                        {lang}
                      </span>
                    ))}
                    {specs.audio_languages.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{specs.audio_languages.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
        {/* Disc Information */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-700 flex items-center">
            <Disc className="h-3 w-3 mr-1" />
            Disc Info
          </h5>
          <div className="space-y-1 text-sm text-slate-600">
            {specs.disc_count && specs.disc_count > 1 && (
              <div className="flex items-center justify-between">
                <span>Discs:</span>
                <span className="font-medium">{specs.disc_count}</span>
              </div>
            )}
            {specs.region_codes && specs.region_codes.length > 0 && (
              <div className="flex items-center justify-between">
                <span>Region:</span>
                <span className="font-medium">{specs.region_codes.join(', ')}</span>
              </div>
            )}
            {specs.studio && (
              <div className="flex items-center justify-between">
                <span>Studio:</span>
                <span className="font-medium text-xs">{specs.studio}</span>
              </div>
            )}
            {specs.runtime_minutes && (
              <div className="flex items-center justify-between">
                <span>Runtime:</span>
                <span className="font-medium">
                  {Math.floor(specs.runtime_minutes / 60)}h {specs.runtime_minutes % 60}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Features */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-slate-700 flex items-center">
            <Zap className="h-3 w-3 mr-1" />
            Features
          </h5>
          <div className="space-y-1">
            {specs.special_features && specs.special_features.length > 0 && (
              <div className="text-xs text-slate-600">
                <span className="font-medium">Special Features:</span>
                <div className="mt-1 space-y-0.5">
                  {specs.special_features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="truncate">• {feature}</div>
                  ))}
                  {specs.special_features.length > 3 && (
                    <div className="text-slate-500">
                      • +{specs.special_features.length - 3} more features
                    </div>
                  )}
                </div>
              </div>
            )}
            {specs.subtitles && specs.subtitles.length > 0 && (
              <div className="text-xs text-slate-600">
                <span className="font-medium">Subtitles:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {specs.subtitles.slice(0, 4).map((sub, index) => (
                    <span 
                      key={index}
                      className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-xs"
                    >
                      {sub}
                    </span>
                  ))}
                  {specs.subtitles.length > 4 && (
                    <span className="text-slate-500">+{specs.subtitles.length - 4}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* External Link */}
      {specs.bluray_com_url && (
        <div className="pt-2 border-t border-slate-200">
          <a
            href={specs.bluray_com_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View on Blu-ray.com
          </a>
        </div>
      )}
    </div>
  );
};