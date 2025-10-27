// src/components/MyStarsPage.tsx
import React, { useState, useEffect } from 'react';
import { Heart, Trash2, User, ExternalLink, Star as StarIcon } from 'lucide-react';
import { favoriteActorsService, FavoriteActor } from '../services/favoriteActorsService';
import { tmdbService } from '../lib/tmdb';
import { favoriteCrewService, FavoriteCrewMember } from '../services/favoriteCrewService';
import { Film, Camera, Music, Palette, Wand2, Sparkles, Clapperboard } from 'lucide-react';
import { PersonDetailsModal } from './PersonDetailsModal';
import { MovieDetailsPage } from './MovieDetailsPage';
import { Movie } from '../lib/supabase';
import { EnhancedEpisodesBrowserPage } from './EnhancedEpisodesBrowserPage';

type MainTab = 'actors' | 'crew';
type CrewSubTab = 'director' | 'creator' | 'producer' | 'executive-producer' | 'cinematographer' | 'editor' | 'music' | 'production-design' | 'costume-design' | 'vfx' | 'sfx' | 'choreographer';

const crewJobLabels: Record<CrewSubTab, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  'director': { label: 'Director', icon: Film },
  'creator': { label: 'Creator', icon: Sparkles },
  'producer': { label: 'Producer', icon: Clapperboard },
  'executive-producer': { label: 'Executive Producer', icon: Clapperboard },
  'cinematographer': { label: 'Cinematographer', icon: Camera },
  'editor': { label: 'Editor', icon: Film },
  'music': { label: 'Music', icon: Music },
  'production-design': { label: 'Production Design', icon: Palette },
  'costume-design': { label: 'Costume Design', icon: Palette },
  'vfx': { label: 'Visual Effects', icon: Wand2 },
  'sfx': { label: 'Special Effects', icon: Wand2 },
  'choreographer': { label: 'Choreographer', icon: User }
};

export function MyStarsPage() {
  const [favorites, setFavorites] = useState<FavoriteActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>('actors');
  const [crewSubTab, setCrewSubTab] = useState<CrewSubTab>('director');
  const [favoriteCrew, setFavoriteCrew] = useState<FavoriteCrewMember[]>([]);
  const [showMovieDetailsModal, setShowMovieDetailsModal] = useState(false);
  const [selectedMovieForDetails, setSelectedMovieForDetails] = useState<Movie | null>(null);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [selectedSeriesForEpisodes, setSelectedSeriesForEpisodes] = useState<Movie | null>(null);

  const handleOpenMovieDetails = (movie: Movie) => {
    console.log('[MyStarsPage] handleOpenMovieDetails called with:', movie);
    setSelectedMovieForDetails(movie);
    setShowMovieDetailsModal(true);
  };

  const handleOpenSeriesDetails = (series: Movie) => {
    console.log('[MyStarsPage] handleOpenSeriesDetails called with:', series.title);
    setSelectedSeriesForEpisodes(series);
    setShowEpisodesModal(true);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    const [actorData, crewData] = await Promise.all([
      favoriteActorsService.getAllFavorites(),
      favoriteCrewService.getFavoriteCrew()
    ]);
    setFavorites(actorData);
    setFavoriteCrew(crewData);
    setLoading(false);
  };

  const handleRemove = async (actorId: number) => {
    const success = await favoriteActorsService.removeFavorite(actorId);
    if (success) {
      setFavorites(prev => prev.filter(f => f.actor_id !== actorId));
    }
  };

  const handleRemoveCrew = async (crewId: number) => {
    const success = await favoriteCrewService.removeFavoriteCrew(crewId);
    if (success) {
      setFavoriteCrew(prev => prev.filter(f => f.tmdb_person_id !== crewId));
    }
  };

  // Filter crew by current subtab
  const filteredCrew = favoriteCrew.filter(crew => {
    switch (crewSubTab) {
      case 'director': return crew.job === 'Director';
      case 'creator': return crew.job === 'Creator';
      case 'producer': return crew.job === 'Producer';
      case 'executive-producer': return crew.job === 'Executive Producer';
      case 'cinematographer': return crew.job === 'Director of Photography';
      case 'editor': return crew.job === 'Editor';
      case 'music': return crew.job === 'Original Music Composer' || crew.job === 'Music';
      case 'production-design': return crew.job === 'Production Design';
      case 'costume-design': return crew.job === 'Costume Design';
      case 'vfx': return crew.job === 'Visual Effects Supervisor';
      case 'sfx': return crew.job === 'Special Effects';
      case 'choreographer': return crew.job === 'Choreographer';
      default: return false;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-red-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading your favorite stars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            <h1 className="text-3xl font-bold text-slate-900">My Stars</h1>
          </div>
          <p className="text-slate-600">
            {mainTab === 'actors' 
              ? `Your favorite actors and actresses (${favorites.length})`
              : `Your favorite crew members (${favoriteCrew.length})`
            }
          </p>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center space-x-4 mb-6 border-b border-slate-200">
          <button
            onClick={() => setMainTab('actors')}
            className={`pb-3 px-4 font-semibold transition-colors border-b-2 ${
              mainTab === 'actors'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            My Stars ({favorites.length})
          </button>
          
          <button
            onClick={() => setMainTab('crew')}
            className={`pb-3 px-4 font-semibold transition-colors border-b-2 ${
              mainTab === 'crew'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Favorite Crew ({favoriteCrew.length})
          </button>
        </div>

        {/* Actors Tab Content */}
        {mainTab === 'actors' && (
          <>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No favorite stars yet
            </h3>
            <p className="text-slate-600">
              Click the heart icon on any actor's profile to add them here!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {favorites.map((favorite) => (
              <FavoriteActorCard
                key={favorite.id}
                favorite={favorite}
                onRemove={handleRemove}
                onOpenMovieDetails={handleOpenMovieDetails}
              />
            ))}
          </div>
        )}
          </>
        )}

        {/* Crew Tab Content */}
        {mainTab === 'crew' && (
          <>
            {/* Crew Sub-tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(Object.keys(crewJobLabels) as CrewSubTab[]).map((subTab) => {
                const config = crewJobLabels[subTab];
                const Icon = config.icon;
                const count = favoriteCrew.filter(crew => {
                  switch (subTab) {
                    case 'director': return crew.job === 'Director';
                    case 'creator': return crew.job === 'Creator';
                    case 'producer': return crew.job === 'Producer';
                    case 'executive-producer': return crew.job === 'Executive Producer';
                    case 'cinematographer': return crew.job === 'Director of Photography';
                    case 'editor': return crew.job === 'Editor';
                    case 'music': return crew.job === 'Original Music Composer' || crew.job === 'Music';
                    case 'production-design': return crew.job === 'Production Design';
                    case 'costume-design': return crew.job === 'Costume Design';
                    case 'vfx': return crew.job === 'Visual Effects Supervisor';
                    case 'sfx': return crew.job === 'Special Effects';
                    case 'choreographer': return crew.job === 'Choreographer';
                    default: return false;
                  }
                }).length;
                
                return (
                  <button
                    key={subTab}
                    onClick={() => setCrewSubTab(subTab)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      crewSubTab === subTab
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{config.label}</span>
                    {count > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        crewSubTab === subTab ? 'bg-purple-700' : 'bg-slate-200'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Crew Grid */}
            {filteredCrew.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No favorite {crewJobLabels[crewSubTab].label.toLowerCase()}s yet
                </h3>
                <p className="text-slate-600">
                  Click the heart icon on any crew member's profile to add them here!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredCrew.map((crew) => (
                  <FavoriteCrewCard
                    key={crew.id}
                    crew={crew}
                    onRemove={handleRemoveCrew}
                    onOpenMovieDetails={handleOpenMovieDetails}
                    onOpenSeriesDetails={handleOpenSeriesDetails}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Movie Details Modal */}
      {showMovieDetailsModal && selectedMovieForDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setShowMovieDetailsModal(false)}
          />
          <div className="fixed inset-4 md:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <MovieDetailsPage 
              movie={selectedMovieForDetails} 
              onBack={() => {
                setShowMovieDetailsModal(false);
                setSelectedMovieForDetails(null);
              }}
              onUpdateStatus={async (id, status) => {}}
              onUpdateRating={async (id, rating) => {}}
              onUpdateMovie={async (id, updates) => {}}
              onDelete={async (id) => {
                setShowMovieDetailsModal(false);
                setSelectedMovieForDetails(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Episodes Modal for TV Series */}
      {showEpisodesModal && selectedSeriesForEpisodes && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={() => setShowEpisodesModal(false)}
          />
          <div className="fixed inset-4 md:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <EnhancedEpisodesBrowserPage 
              series={selectedSeriesForEpisodes} 
              onBack={() => {
                setShowEpisodesModal(false);
                setSelectedSeriesForEpisodes(null);
              }}
              onUpdateStatus={async (id, status) => {}}
              onUpdateRating={async (id, rating) => {}}
              onUpdateMovie={async (id, updates) => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FAVORITE ACTOR CARD ====================

interface FavoriteActorCardProps {
  favorite: FavoriteActor;
  onRemove: (actorId: number) => void;
  onOpenMovieDetails: (movie: Movie) => void;
}

function FavoriteActorCard({ favorite, onRemove, onOpenMovieDetails }: FavoriteActorCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const profileUrl = favorite.profile_path
    ? tmdbService.getProfileImageUrl(favorite.profile_path, 'w185')
    : null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Remove ${favorite.actor_name} from your favorites?`)) {
      return;
    }

    setIsDeleting(true);
    await onRemove(favorite.actor_id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative cursor-pointer"
      >
        <div className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all ${
          isDeleting ? 'opacity-50' : ''
        }`}>
          {/* Profile Image */}
          <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={favorite.actor_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-12 w-12 text-slate-400" />
              </div>
            )}

            {/* Delete Button - Appears on hover */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-lg z-10"
              title="Remove from favorites"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Actor Info */}
          <div className="p-3">
            <p className="font-medium text-sm text-slate-900 truncate">
              {favorite.actor_name}
            </p>
            {favorite.character_name && (
              <p className="text-xs text-slate-500 truncate">
                as {favorite.character_name}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Added {new Date(favorite.added_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <PersonDetailsModal
          tmdbPersonId={favorite.actor_id}
          personName={favorite.actor_name}
          personType="cast"
          onClose={() => setShowModal(false)}
          onOpenMovieDetails={(movie) => {
            console.log('[FavoriteActorCard] Closing actor modal, opening movie modal');
            setShowModal(false);
            handleOpenMovieDetails(movie);
          }}
          onOpenSeriesDetails={(series) => {
            console.log('[FavoriteActorCard] Closing actor modal, opening series modal');
            setShowModal(false);
            handleOpenSeriesDetails(series);
          }}
        />
      )}
    </>
  );
}

// ==================== FAVORITE CREW CARD ====================

interface FavoriteCrewCardProps {
  crew: FavoriteCrewMember;
  onRemove: (crewId: number) => void;
  onOpenMovieDetails: (movie: Movie) => void;
  onOpenSeriesDetails: (series: Movie) => void;
}

function FavoriteCrewCard({ crew, onRemove, onOpenMovieDetails, onOpenSeriesDetails }: FavoriteCrewCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const profileUrl = crew.profile_path
    ? tmdbService.getProfileImageUrl(crew.profile_path, 'w185')
    : null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Remove ${crew.name} from your favorites?`)) {
      return;
    }

    setIsDeleting(true);
    await onRemove(crew.tmdb_person_id);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative cursor-pointer"
      >
        <div className={`bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all ${
          isDeleting ? 'opacity-50' : ''
        }`}>
          {/* Profile Image */}
          <div className="aspect-[2/3] bg-slate-200 relative overflow-hidden">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={crew.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-12 w-12 text-slate-400" />
              </div>
            )}

            {/* Delete Button - Appears on hover */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-lg z-10"
              title="Remove from favorites"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Crew Info */}
          <div className="p-3">
            <p className="font-medium text-sm text-slate-900 truncate">
              {crew.name}
            </p>
            <p className="text-xs text-slate-500 truncate">{crew.job}</p>
            <p className="text-xs text-slate-400 mt-1">
              Added {new Date(crew.created_at || '').toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <PersonDetailsModal
          tmdbPersonId={crew.tmdb_person_id}
          personName={crew.name}
          personType="crew"
          onClose={() => setShowModal(false)}
          onOpenMovieDetails={(movie) => {
            setShowModal(false);
            onOpenMovieDetails(movie);
          }}
          onOpenSeriesDetails={(series) => {
            setShowModal(false);
            onOpenSeriesDetails(series);
          }}
        />
      )}
    </>
  );
}