// src/components/MyStarsPage.tsx
import React, { useState, useEffect } from 'react';
import { Heart, Trash2, User, ExternalLink, Star as StarIcon } from 'lucide-react';
import { favoriteActorsService, FavoriteActor } from '../services/favoriteActorsService';
import { tmdbService } from '../lib/tmdb';

export function MyStarsPage() {
  const [favorites, setFavorites] = useState<FavoriteActor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    const data = await favoriteActorsService.getAllFavorites();
    setFavorites(data);
    setLoading(false);
  };

  const handleRemove = async (actorId: number) => {
    const success = await favoriteActorsService.removeFavorite(actorId);
    if (success) {
      setFavorites(prev => prev.filter(f => f.actor_id !== actorId));
    }
  };

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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            <h1 className="text-3xl font-bold text-slate-900">My Stars</h1>
          </div>
          <p className="text-slate-600">
            Your favorite actors and actresses ({favorites.length})
          </p>
        </div>

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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== FAVORITE ACTOR CARD ====================

interface FavoriteActorCardProps {
  favorite: FavoriteActor;
  onRemove: (actorId: number) => void;
}

function FavoriteActorCard({ favorite, onRemove }: FavoriteActorCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const profileUrl = favorite.profile_path
    ? tmdbService.getProfileImageUrl(favorite.profile_path, 'w185')
    : null;
  const tmdbPersonUrl = `https://www.themoviedb.org/person/${favorite.actor_id}`;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Remove ${favorite.actor_name} from your favorites?`)) {
      return;
    }

    setIsDeleting(true);
    await onRemove(favorite.actor_id);
  };

  return (
    <a
      href={tmdbPersonUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative"
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
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-lg"
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
    </a>
  );
}