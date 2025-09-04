import React, { useState } from 'react';
import { Star, Plus, Check, Calendar, MapPin, User, Users, Clock, Award, DollarSign, Globe, Film, Tv } from 'lucide-react';
import { OMDBMovieDetails } from '../lib/omdb';
import { supabase } from '../lib/supabase';

interface MovieCardProps {
  movie: OMDBMovieDetails;
  posterUrl: string | null;
  imdbUrl: string | null;
}

export function MovieCard({ movie, posterUrl, imdbUrl }: MovieCardProps) {
  const [isAdding, setIsAdding] = useState(false);
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

  const handleAddToWatchlist = async () => {
    if (isInWatchlist) return;

    setIsAdding(true);
    try {
      console.log('[MovieCard] Adding movie to watchlist:', movie.Title);
      
      // Step 1: Get the current authenticated user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      // Step 2: Check if user is signed in
      if (authError || !currentUser) {
        console.error('[MovieCard] User not authenticated:', authError);
        alert('Please sign in to add titles to your watchlist.');
        return;
      }

      // Prepare movie data
      const movieData = {
        user_id: currentUser.id,  // CRITICAL: Include authenticated user's ID
        media_type: movie.Type === 'series' ? 'series' : 'movie',
        title: movie.Title,
        genre: movie.Genre !== 'N/A' ? movie.Genre : undefined,
        year: movie.Year !== 'N/A' ? parseInt(movie.Year) : undefined,
        country: movie.Country !== 'N/A' ? movie.Country : undefined,
        director: movie.Director !== 'N/A' ? movie.Director : undefined,
        actors: movie.Actors !== 'N/A' ? movie.Actors : undefined,
        imdb_score: movie.imdbRating !== 'N/A' ? parseFloat(movie.imdbRating) : undefined,
        imdb_url: imdbUrl || '',
        status: 'To Watch',
        poster_url: posterUrl,
        imdb_id: movie.imdbID,
        metascore: movie.Metascore !== 'N/A' ? parseInt(movie.Metascore) : undefined,
        imdb_votes: movie.imdbVotes !== 'N/A' ? movie.imdbVotes : undefined,
        runtime: movie.Runtime && movie.Runtime !== 'N/A' ? parseInt(movie.Runtime.replace(' min', '')) : undefined,
        awards: movie.Awards !== 'N/A' ? movie.Awards : undefined,
        box_office: movie.BoxOffice && movie.BoxOffice !== 'N/A' ? parseFloat(movie.BoxOffice.replace(/[$,]/g, '')) : undefined,
        production: movie.Production !== 'N/A' ? movie.Production : undefined,
        website: movie.Website !== 'N/A' ? movie.Website : undefined,
        plot: movie.Plot !== 'N/A' ? movie.Plot : undefined,
        rated: movie.Rated !== 'N/A' ? movie.Rated : undefined,
        released: movie.Released !== 'N/A' ? movie.Released : undefined,
        language: movie.Language !== 'N/A' ? movie.Language : undefined,
        writer: movie.Writer !== 'N/A' ? movie.Writer : undefined,
      };

      const { data: inserted, error } = await supabase
        .from('movies')
        .insert([movieData])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: error.status
        });
        alert(`Failed to add "${movie.Title}" to watchlist:\n${error.message}`);
      } else {
        console.log('Insert succeeded:', inserted);
        // Mark this card as added without a popup
        setIsInWatchlist(true);
      }

    } catch (error) {
      console.error('[MovieCard] Error adding to watchlist:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 border border-slate-200">
      <div className="md:flex">
        <div className="md:w-48 md:flex-shrink-0">
          {posterUrl && posterUrl !== 'N/A' ? (
            <img
              src={posterUrl}
              alt={movie.title}
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
              onClick={handleAddToWatchlist}
              disabled={isAdding || isInWatchlist}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isInWatchlist
                  ? 'bg-green-100 text-green-700 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              } ${isAdding ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isInWatchlist ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>In Watchlist</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>{isAdding ? 'Adding...' : 'Add to Watchlist'}</span>
                </>
              )}
            </button>
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{movie.Year !== 'N/A' ? movie.Year : 'Unknown'}</span>
              </div>
              
              {movie.imdbRating !== 'N/A' && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{movie.imdbRating}</span>
                  {movie.imdbVotes !== 'N/A' && (
                    <span className="text-slate-400">({movie.imdbVotes} votes)</span>
                  )}
                </div>
              )}
              
              {movie.Metascore !== 'N/A' && (
                <div className="flex items-center space-x-1">
                  <Award className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{movie.Metascore}</span>
                  <span className="text-slate-400">Metascore</span>
                </div>
              )}
            </div>
            
            {movie.Genre !== 'N/A' && (
              <div className="flex flex-wrap gap-2">
                {movie.Genre.split(', ').map((genre, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {movie.Runtime !== 'N/A' && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                <span>{movie.Runtime}</span>
              </div>
            )}
            
            {movie.Country !== 'N/A' && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>{movie.Country}</span>
              </div>
            )}
            
            {movie.Director !== 'N/A' && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <User className="h-4 w-4" />
                <span><strong>Director:</strong> {movie.Director}</span>
              </div>
            )}
            
            {movie.Actors !== 'N/A' && (
              <div className="flex items-start space-x-1 text-sm text-slate-600">
                <Users className="h-4 w-4 mt-0.5" />
                <div>
                  <strong>Cast:</strong> {movie.Actors}
                </div>
              </div>
            )}
            
            {movie.BoxOffice !== 'N/A' && (
              <div className="flex items-center space-x-1 text-sm text-slate-600">
                <DollarSign className="h-4 w-4" />
                <span><strong>Box Office:</strong> {movie.BoxOffice}</span>
              </div>
            )}
            
            {movie.Awards !== 'N/A' && movie.Awards !== 'N/A' && (
              <div className="flex items-start space-x-1 text-sm text-slate-600">
                <Award className="h-4 w-4 mt-0.5" />
                <div>
                  <strong>Awards:</strong> {movie.Awards}
                </div>
              </div>
            )}
          </div>
          
          {movie.Plot !== 'N/A' && (
            <p className="text-slate-700 text-sm leading-relaxed mb-4">
              {movie.Plot.length > 300 ? `${movie.Plot.substring(0, 300)}...` : movie.Plot}
            </p>
          )}
          
          <div className="flex space-x-3">
            {imdbUrl && (
              <a
                href={imdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-medium rounded-lg transition-colors duration-200"
              >
                View on IMDb
              </a>
            )}
            
            {movie.Website !== 'N/A' && (
              <a
                href={movie.Website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <Globe className="h-4 w-4 mr-2" />
                Official Site
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}