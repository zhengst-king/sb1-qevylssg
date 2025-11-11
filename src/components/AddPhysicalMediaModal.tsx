// src/components/AddPhysicalMediaModal.tsx
// Modal for adding physical media with blu-ray.com integration

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles, Copy, CheckCircle } from 'lucide-react';
import { blurayLinkService } from '../services/blurayLinkService';
import { OMDBMovieDetails } from '../lib/omdb';

interface AddPhysicalMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie: OMDBMovieDetails; // Movie selected from search
  onSave: (data: PhysicalMediaData) => void;
}

interface PhysicalMediaData {
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  edition_name?: string;
  bluray_url?: string;
  
  // Technical specs (optional)
  video_codec?: string;
  audio_codec?: string;
  hdr_format?: string;
  region_code?: string;
  
  // Purchase info
  purchase_date?: string;
  purchase_price?: number;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  notes?: string;
}

export function AddPhysicalMediaModal({ isOpen, onClose, movie, onSave }: AddPhysicalMediaModalProps) {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [formData, setFormData] = useState<PhysicalMediaData>({
    format: 'Blu-ray',
    condition: 'New'
  });
  const [blurayUrl, setBlurayUrl] = useState('');
  const [urlParsed, setUrlParsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const searchOptions = blurayLinkService.generateSearchOptions(
    movie.Title,
    parseInt(movie.Year)
  );

  // Parse blu-ray.com URL when user pastes it
  useEffect(() => {
    if (blurayUrl) {
      const parsed = blurayLinkService.parseBlurayUrl(blurayUrl);
      
      if (parsed) {
        setFormData(prev => ({
          ...prev,
          format: parsed.format || prev.format,
          edition_name: parsed.editionName,
          bluray_url: parsed.url
        }));
        setUrlParsed(true);
        
        // Auto-advance to details step
        setTimeout(() => setStep('details'), 500);
      }
    }
  }, [blurayUrl]);

  const handleOpenSearch = (type: 'google' | 'bluray') => {
    const url = type === 'google' ? searchOptions.googleSearch : searchOptions.bluraySearch;
    window.open(url, '_blank');
  };

  const handleCopySearchText = () => {
    navigator.clipboard.writeText(searchOptions.directSearchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSkipToBluray = () => {
    setStep('details');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-4">
            {movie.Poster && movie.Poster !== 'N/A' && (
              <img 
                src={movie.Poster} 
                alt={movie.Title}
                className="w-12 h-16 object-cover rounded"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">Add to Collection</h2>
              <p className="text-gray-400 text-sm">{movie.Title} ({movie.Year})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Find Edition on blu-ray.com */}
        {step === 'search' && (
          <div className="p-6 space-y-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-300 mb-1">
                    Find Your Exact Edition
                  </h3>
                  <p className="text-sm text-gray-300">
                    blu-ray.com has detailed specs for every edition (Steelbooks, 4K, etc.). 
                    Find your disc and we'll help you add the specs.
                  </p>
                </div>
              </div>
            </div>

            {/* Search Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Step 1: Search for Your Edition</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Google Search Option */}
                <button
                  onClick={() => handleOpenSearch('google')}
                  className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-left"
                >
                  <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-white">Search Google</div>
                    <div className="text-sm text-gray-400">Most reliable</div>
                  </div>
                </button>

                {/* blu-ray.com Search Option */}
                <button
                  onClick={() => handleOpenSearch('bluray')}
                  className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-left"
                >
                  <ExternalLink className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-white">Search blu-ray.com</div>
                    <div className="text-sm text-gray-400">Direct search</div>
                  </div>
                </button>
              </div>

              {/* Copy Search Text */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Search text:</span>
                  <button
                    onClick={handleCopySearchText}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <code className="text-white font-mono text-sm">
                  {searchOptions.directSearchText}
                </code>
              </div>
            </div>

            {/* Step 2: Paste URL */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Step 2: Paste Edition URL</h3>
              
              <div className="space-y-2">
                <input
                  type="text"
                  value={blurayUrl}
                  onChange={(e) => setBlurayUrl(e.target.value)}
                  placeholder="https://www.blu-ray.com/movies/Iron-Man-4K-Blu-ray/225134/"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                
                {urlParsed && (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Edition detected! Auto-advancing...
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-400">
                After finding your edition, copy the URL from your browser and paste it here.
                We'll auto-fill the format and edition name.
              </p>
            </div>

            {/* Skip Option */}
            <div className="border-t border-gray-700 pt-4">
              <button
                onClick={handleSkipToBluray}
                className="text-gray-400 hover:text-white text-sm"
              >
                Skip to manual entry →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Details */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Format *
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="DVD">DVD</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="4K UHD">4K UHD</option>
                <option value="3D Blu-ray">3D Blu-ray</option>
              </select>
            </div>

            {/* Edition Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Edition Name
              </label>
              <input
                type="text"
                value={formData.edition_name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, edition_name: e.target.value }))}
                placeholder="e.g., Steelbook Edition, Collector's Edition"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Technical Specs (Optional) */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Technical Specs (Optional)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Video Codec
                  </label>
                  <select
                    value={formData.video_codec || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_codec: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Not specified</option>
                    <option value="HEVC">HEVC (H.265)</option>
                    <option value="AVC">AVC (H.264)</option>
                    <option value="VC-1">VC-1</option>
                    <option value="MPEG-2">MPEG-2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Audio Codec
                  </label>
                  <select
                    value={formData.audio_codec || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, audio_codec: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Not specified</option>
                    <option value="Dolby Atmos">Dolby Atmos</option>
                    <option value="DTS:X">DTS:X</option>
                    <option value="DTS-HD MA">DTS-HD Master Audio</option>
                    <option value="Dolby TrueHD">Dolby TrueHD</option>
                    <option value="DTS-HD HR">DTS-HD High Resolution</option>
                    <option value="Dolby Digital Plus">Dolby Digital Plus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    HDR Format
                  </label>
                  <select
                    value={formData.hdr_format || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, hdr_format: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Not specified</option>
                    <option value="Dolby Vision">Dolby Vision</option>
                    <option value="HDR10+">HDR10+</option>
                    <option value="HDR10">HDR10</option>
                    <option value="None">None (SDR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Region Code
                  </label>
                  <select
                    value={formData.region_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, region_code: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Not specified</option>
                    <option value="A">Region A (Americas, East Asia)</option>
                    <option value="B">Region B (Europe, Africa, Oceania)</option>
                    <option value="C">Region C (Central/South Asia)</option>
                    <option value="FREE">Region Free</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Purchase Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-white">Purchase Info (Optional)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) }))}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Condition *
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about this disc..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep('search')}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
              >
                Add to Collection
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}