// src/components/CollectionDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { X, Film, Heart, Calendar, Star } from 'lucide-react';
import { tmdbService, TMDBCollection, TMDBCollectionPart } from '../lib/tmdb';
import { useMovies } from '../hooks/useMovies';
import { Movie } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { omdbApi } from '../lib/omdb';

interface CollectionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: number;
  collectionName: string;
  onMovieDetailsClick?: (movie: Movie) => void;
}

export function CollectionDetailModal({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  onMovieDetailsClick
}: CollectionDetailModalProps) {
  const [collection, setCollection] = useState<TMDBCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const { movies, addMovie } = useMovies('movie');
  const [addingMovies, setAddingMovies] = useState<Set<number>>(new Set());
  const [watchlistMovieIds, setWatchlistMovieIds] = useState<Set<number>>(new Set());

  // Get set of movies already in watchlist by IMDb ID
  const watchlistImdbIds = new Set(movies.map(m => m.imdb_id).filter(Boolean));

  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollectionDetails();
    }
  }, [isOpen, collectionId]);

  // Load watchlist movie TMDB IDs
  useEffect(() => {
    loadWatchlistMovieIds();
  }, [movies]);

  const loadWatchlistMovieIds = async () => {
    try {
      const tmdbIds = new Set<number>();
      
      for (const movie of movies) {
        if (movie.imdb_id) {
          // Get TMDB ID from IMDb ID
          const tmdbId = await getTMDBIdFromIMDbId(movie.imdb_id);
          if (tmdbId) {
            tmdbIds.add(tmdbId);
          }
        }
      }
      
      setWatchlistMovieIds(tmdbIds);
    } catch (error) {
      console.error('Error loading watchlist TMDB IDs:', error);
    }
  };

  const getTMDBIdFromIMDbId = async (imdbId: string): Promise<number | null> => {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.movie_results?.[0]?.id || null;
    } catch (error) {
      console.error('Error getting TMDB ID:', error);
      return null;
    }
  };

  const fetchCollectionDetails = async () => {
    setLoading(true);
    const data = await tmdbService.getCollectionDetails(collectionId);
    setCollection(data);
    setLoading(false);
  };

  const handleAddToWatchlist = async (movie: TMDBCollectionPart) => {
    setAddingMovies(prev => new Set([...prev, movie.id]));
    
    try {
      // Fetch full movie details from TMDB to get IMDb ID
      const fullDetails = await tmdbService.getMovieDetailsFull(movie.id);
      const imdbId = fullDetails?.external_ids?.imdb_id;
      
      // ✅ FIX: Fetch complete OMDb data BEFORE inserting
      let omdbDetails = null;
      if (imdbId) {
        try {
          console.log('[CollectionDetailModal] Fetching OMDb data for:', movie.title, imdbId);
          omdbDetails = await omdbApi.getMovieDetails(imdbId);
        } catch (omdbError) {
          console.error('[CollectionDetailModal] OMDb fetch failed:', omdbError);
          // Continue without OMDb data
        }
      }
      
      // Build complete movie data with OMDb fields
      const newMovie: Partial<Movie> = {
        title: movie.title,
        year: movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : undefined,
        poster_url: movie.poster_path ? tmdbService.getImageUrl(movie.poster_path) : undefined,
        imdb_score: movie.vote_average,
        imdb_id: imdbId || undefined,
        status: 'To Watch',
        plot: movie.overview,
        media_type: 'movie'
      };

      // Add OMDb fields if available
      if (omdbDetails && omdbDetails.Response === 'True') {
        if (omdbDetails.Runtime && omdbDetails.Runtime !== 'N/A') {
          newMovie.runtime = omdbApi.parseRuntime(omdbDetails.Runtime);
        }
        if (omdbDetails.Director && omdbDetails.Director !== 'N/A') {
          newMovie.director = omdbDetails.Director;
        }
        if (omdbDetails.Actors && omdbDetails.Actors !== 'N/A') {
          newMovie.actors = omdbDetails.Actors;
        }
        if (omdbDetails.Country && omdbDetails.Country !== 'N/A') {
          newMovie.country = omdbDetails.Country;
        }
        if (omdbDetails.Language && omdbDetails.Language !== 'N/A') {
          newMovie.language = omdbDetails.Language;
        }
        if (omdbDetails.BoxOffice && omdbDetails.BoxOffice !== 'N/A') {
          newMovie.box_office = omdbDetails.BoxOffice;
        }
        if (omdbDetails.Genre && omdbDetails.Genre !== 'N/A') {
          newMovie.genre = omdbDetails.Genre;
        }
        if (omdbDetails.Production && omdbDetails.Production !== 'N/A') {
          newMovie.production = omdbDetails.Production;
        }
        if (omdbDetails.Writer && omdbDetails.Writer !== 'N/A') {
          newMovie.writer = omdbDetails.Writer;
        }
        if (omdbDetails.Awards && omdbDetails.Awards !== 'N/A') {
          newMovie.awards = omdbDetails.Awards;
        }
        if (omdbDetails.Plot && omdbDetails.Plot !== 'N/A') {
          newMovie.plot = omdbDetails.Plot;
        }
        console.log('[CollectionDetailModal] ✅ OMDb data fetched successfully');
      }

      await addMovie(newMovie);
      console.log('[CollectionDetailModal] ✅ Movie added with complete data');
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
    return watchlistMovieIds.has(movie.id);
  };

  const handleCardClick = async (e: React.MouseEvent, movie: TMDBCollectionPart) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onMovieDetailsClick) {
      return;
    }
    
    console.log('[CollectionDetailModal] Clicked watchlist title:', movie.title);
    
    // Fetch the movie from database to get full details
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[CollectionDetailModal] No user found');
        return;
      }

      console.log('[CollectionDetailModal] Fetching movie:', { title: movie.title, userId: user.id });

      const { data: dbMovie, error } = await supabase
        .from('movies')
        .select('*')
        .eq('user_id', user.id)
        .eq('title', movie.title)
        .eq('media_type', 'movie')
        .single();

      console.log('[CollectionDetailModal] Query result:', { dbMovie, error });

      if (error) {
        console.error('[CollectionDetailModal] Error fetching movie:', error);
        return;
      }

      if (dbMovie) {
        console.log('[CollectionDetailModal] Opening movie details modal for:', dbMovie.title);
        onMovieDetailsClick(dbMovie);
      }
    } catch (error) {
      console.error('[CollectionDetailModal] Error in handleCardClick:', error);
    }
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
                    {collection.parts
                      .sort((a, b) => {
                        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
                        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
                        return dateA - dateB;
                      })
                      .map((movie) => {
                        const inWatchlist = isInWatchlist(movie);
                        const isAdding = addingMovies.has(movie.id);
                        const tmdbUrl = `https://www.themoviedb.org/movie/${movie.id}`;
                        
                        const CardWrapper = inWatchlist ? 'div' : 'a';
                        const wrapperProps = inWatchlist 
                          ? { 
                              onClick: (e: React.MouseEvent) => handleCardClick(e, movie),
                              className: "group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                            }
                          : {
                              href: tmdbUrl,
                              target: "_blank",
                              rel: "noopener noreferrer",
                              className: "group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all block"
                            };

                        return (
                          <CardWrapper key={movie.id} {...wrapperProps as any}>
                            {/* Poster */}
                            <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
                              {movie.poster_path ? (
                                <img
                                  src={tmdbService.getImageUrl(movie.poster_path, 'w342')}
                                  alt={movie.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="h-12 w-12 text-slate-400" />
                                </div>
                              )}

                              {/* Watchlist Button */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!isAdding) {
                                    handleAddToWatchlist(movie);
                                  }
                                }}
                                disabled={isAdding || inWatchlist}
                                className={`absolute top-2 right-2 z-10 p-1.5 backdrop-blur-sm rounded-full shadow-md transition-all ${
                                  inWatchlist
                                    ? 'bg-green-500 cursor-default'
                                    : isAdding
                                    ? 'bg-slate-400 cursor-wait'
                                    : 'bg-white/90 hover:bg-white'
                                }`}
                                title={inWatchlist ? 'In watchlist' : isAdding ? 'Adding...' : 'Add to watchlist'}
                              >
                                {isAdding ? (
                                  <div className="h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                                ) : inWatchlist ? (
                                  <Heart className="h-4 w-4 text-white fill-current" />
                                ) : (
                                  <Heart className="h-4 w-4 text-slate-600 hover:text-purple-500" />
                                )}
                              </button>

                              {/* Rating Badge */}
                              {movie.vote_average && movie.vote_average > 0 && (
                                <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                    <span className="text-white text-xs font-semibold">
                                      {movie.vote_average.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Movie Info */}
                            <div className="p-3">
                              <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2">
                                {movie.title}
                              </h3>
                              {movie.release_date && (
                                <div className="flex items-center text-xs text-slate-500">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(movie.release_date).getFullYear()}
                                </div>
                              )}
                            </div>
                          </CardWrapper>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-600">
                Failed to load collection details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}