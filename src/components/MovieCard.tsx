// src/components/MovieCard.tsx
import React, { useState } from 'react';
import { Star, Plus, Check, Calendar, MapPin, User, Users, Clock, Award, DollarSign, Globe, Film, Tv } from 'lucide-react';
import { OMDBMovieDetails } from '../lib/omdb';
import { supabase } from '../lib/supabase';
import { useMovies } from '../hooks/useMovies'; 
import { buildMovieFromOMDb, getTMDBIdFromIMDb } from '../utils/movieDataBuilder';
import { AddToWatchlistButton } from './AddToWatchlistButton';
import { watchlistService } from '../services/watchlistService';

interface MovieCardProps {
  movie: OMDBMovieDetails;
  posterUrl: string | null;
  imdbUrl: string | null;
  onMovieAdded?: () => void; // NEW: Optional callback for when movie is added
}

export function MovieCard({ movie, posterUrl, imdbUrl, onMovieAdded }: MovieCardProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  // Check if movie is already in watchlist
  React.useEffect(() => {
    const checkWatchlist = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('movies')
          .select('id')
          .eq('user_id', user.id)
          .eq('imdb_id', movie.imdbID)
          .maybeSingle();

        setIsInWatchlist(!!data);
      } catch (error) {
        // Movie not in watchlist or other error
        setIsInWatchlist(false);
      }
    };

    checkWatchlist();
  }, [movie.imdbID]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-200">
      <div className="md:flex">
        <div className="md:w-48 md:flex-shrink-0">
          {posterUrl && posterUrl !== 'N/A' ? (
            <img
              src={posterUrl}
              alt={movie.Title}
              className="w-full h-72 md:h-full object-cover"
            />
          ) : (
            <div className="w-full h-72 md:h-full bg-slate-200 flex items-center justify-center">
              <span className="text-slate-400">No poster available</span>
            </div>
          )}
        </div>
        
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-2xl font-bold text-slate-900">{movie.Title}</h3>
                <div className="flex items-center space-x-1">
                  {movie.Type === 'series' ? (
                    <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Tv className="h-3 w-3" />
                      <span>TV Series</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Film className="h-3 w-3" />
                      <span>Movie</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={async () => {
                if (isInWatchlist) return;
                
                try {
                  // Get TMDB ID from IMDb ID
                  const tmdbId = await getTMDBIdFromIMDb(movie.imdbID, movie.Type === 'series' ? 'tv' : 'movie');
                  
                  // Use watchlistService to add
                  const insertedMovie = await watchlistService.addToWatchlist({
                    title: movie.Title,
                    year: movie.Year !== 'N/A' ? parseInt(movie.Year) : undefined,
                    imdb_id: movie.imdbID,
                    tmdb_id: tmdbId || undefined,
                    poster_url: movie.Poster !== 'N/A' ? movie.Poster : undefined,
                    plot: movie.Plot !== 'N/A' ? movie.Plot : undefined,
                    imdb_score: movie.imdbRating !== 'N/A' ? parseFloat(movie.imdbRating) : undefined,
                    media_type: movie.Type === 'series' ? 'series' : 'movie',
                    status: 'To Watch'
                  });
                  
                  // ✅ Trigger episode discovery for TV series
                  if (insertedMovie && insertedMovie.media_type === 'series' && insertedMovie.imdb_id) {
                    console.log('[MovieCard] 📺 Queueing episode discovery for:', insertedMovie.title);
                    
                    try {
                      const { serverSideEpisodeService } = await import('../services/serverSideEpisodeService');
                      await serverSideEpisodeService.addSeriesToQueue(
                        insertedMovie.imdb_id,
                        insertedMovie.title,
                        'low'
                      );
                      console.log('[MovieCard] ✅ Episode discovery queued successfully');
                    } catch (discoveryError) {
                      console.error('[MovieCard] ⚠️ Failed to queue episode discovery:', discoveryError);
                    }
                  }
                  
                  setIsInWatchlist(true);
                  if (onMovieAdded) {
                    onMovieAdded();
                  }
                } catch (error) {
                  console.error('[MovieCard] Error adding to watchlist:', error);
                  alert('Failed to add to watchlist. Please try again.');
                }
              }}
              disabled={isInWatchlist}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isInWatchlist
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isInWatchlist ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>In Watchlist</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add to Watchlist</span>
                </>
              )}
            </button>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{movie.Year !== 'N/A' ? movie.Year : 'Unknown Year'}</span>
              </div>
              
              {movie.imdbRating !== 'N/A' && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{movie.imdbRating}</span>
                </div>
              )}
              
              {movie.Runtime !== 'N/A' && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{movie.Runtime}</span>
                </div>
              )}
            </div>

            {movie.Genre !== 'N/A' && (
              <div className="flex flex-wrap gap-1">
                {movie.Genre.split(', ').map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {movie.Plot !== 'N/A' && (
              <p className="text-slate-600 text-sm leading-relaxed">
                {movie.Plot.length > 200 ? `${movie.Plot.substring(0, 200)}...` : movie.Plot}
              </p>
            )}

            <div className="space-y-2 text-sm">
              {movie.Director !== 'N/A' && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-600"><strong>Director:</strong> {movie.Director}</span>
                </div>
              )}
              
              {movie.Actors !== 'N/A' && (
                <div className="flex items-start space-x-1">
                  <Users className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600"><strong>Cast:</strong> {movie.Actors}</span>
                </div>
              )}
              
              {movie.Country !== 'N/A' && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span className="text-slate-600">{movie.Country}</span>
                </div>
              )}
            </div>
          </div>

          {imdbUrl && (
            <div className="pt-4 border-t border-slate-200">
              <a
                href={imdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>View on IMDb</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}