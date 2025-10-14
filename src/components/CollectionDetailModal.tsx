// src/components/CollectionDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Film, Heart, Calendar, Star } from 'lucide-react';
import { tmdbService, TMDBCollection, TMDBCollectionPart } from '../lib/tmdb';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';

interface CollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  collectionName: string;
}

export function CollectionDetailModal({
  isOpen,
  onClose,
  collectionId,
  collectionName
}: CollectionDetailModalProps) {
  const [collection, setCollection] = useState<TMDBCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const { movies, addMovie } = useMovies('movie');
  const [addingMovies, setAddingMovies] = useState<Set<number>>(new Set());

  // Get set of movies already in watchlist by IMDb ID
  const watchlistImdbIds = new Set(movies.map(m => m.imdb_id).filter(Boolean));

  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollectionDetails();
    }
  }, [isOpen, collectionId]);

  const fetchCollectionDetails = async () => {
    setLoading(true);
    const data = await tmdbService.getCollectionDetails(collectionId);
    setCollection(data);
    setLoading(false);
  };

  const handleAddToWatchlist = async (movie: TMDBCollectionPart) => {
    setAddingMovies(prev => new Set([...prev, movie.id]));
    
    try {
      // Search for IMDb ID using TMDB movie ID
      const movieDetails = await tmdbService.getMovieDetails(movie.id);
      
      if (!movieDetails) {
        console.error('Could not fetch movie details');
        return;
      }

      const newMovie: Partial<Movie> = {
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : undefined,
        genre: undefined, // Will be fetched by backend
        poster_url: movie.poster_path ? tmdbService.getImageUrl(movie.poster_path) : undefined,
        imdb_score: movie.vote_average,
        status: 'To Watch',
        plot: movie.overview
      };

      await addMovie(newMovie);
    } catch (error) {
      console.error('Error adding movie to watchlist:', error);
    } finally {
      setAddingMovies(prev => {
        const newSet = new Set(prev);
        newSet.delete(movie.id);
        return newSet;
      });
    }
  };

  const isInWatchlist = (movie: TMDBCollectionPart): boolean => {
    // This is a simple check - in production you'd want to match by TMDB ID
    return movies.some(m => 
      m.title.toLowerCase() === movie.title.toLowerCase() &&
      m.year === parseInt(movie.release_date?.substring(0, 4) || '0')
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-3">
              <Film className="h-6 w-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">{collectionName}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : collection ? (
              <div className="p-6">
                {/* Collection Overview */}
                {collection.overview && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">About This Collection</h3>
                    <p className="text-slate-600 leading-relaxed">{collection.overview}</p>
                  </div>
                )}

                {/* Movies Grid */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Movies in Collection ({collection.parts?.length || 0})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collection.parts?.map((movie) => {
                      const inWatchlist = isInWatchlist(movie);
                      const isAdding = addingMovies.has(movie.id);

                      return (
                        <div
                          key={movie.id}
                          className="bg-slate-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Movie Poster */}
                          {movie.poster_path ? (
                            <img
                              src={tmdbService.getImageUrl(movie.poster_path, 'w342')}
                              alt={movie.title}
                              className="w-full h-64 object-cover"
                            />
                          ) : (
                            <div className="w-full h-64 bg-slate-200 flex items-center justify-center">
                              <Film className="h-16 w-16 text-slate-400" />
                            </div>
                          )}

                          {/* Movie Info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-slate-900 flex-1">{movie.title}</h4>
                              <button
                                onClick={() => !inWatchlist && !isAdding && handleAddToWatchlist(movie)}
                                disabled={inWatchlist || isAdding}
                                className={`flex-shrink-0 ml-2 ${
                                  inWatchlist
                                    ? 'text-purple-600'
                                    : 'text-slate-400 hover:text-purple-600'
                                } transition-colors disabled:opacity-50`}
                                title={inWatchlist ? 'In your watchlist' : 'Add to watchlist'}
                              >
                                {isAdding ? (
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                                ) : (
                                  <Heart
                                    className={`h-5 w-5 ${inWatchlist ? 'fill-current' : ''}`}
                                  />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              {movie.release_date && (
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{movie.release_date.substring(0, 4)}</span>
                                </div>
                              )}
                              {movie.vote_average > 0 && (
                                <div className="flex items-center space-x-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{movie.vote_average.toFixed(1)}</span>
                                </div>
                              )}
                            </div>

                            {movie.overview && (
                              <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                                {movie.overview}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-600">Failed to load collection details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}