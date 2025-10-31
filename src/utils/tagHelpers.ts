import { 
  Folder, Film, Heart, Star, Bookmark, Tag, TrendingUp, 
  Zap, Award, Crown, Target, Flame, Sparkles, 
  Package, Briefcase, Camera, Coffee, Music, Palette
} from 'lucide-react';

// Available icons for collections
export const COLLECTION_ICONS = [
  { value: 'folder', label: 'Folder', icon: Folder },
  { value: 'film', label: 'Film', icon: Film },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark },
  { value: 'tag', label: 'Tag', icon: Tag },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'zap', label: 'Zap', icon: Zap },
  { value: 'award', label: 'Award', icon: Award },
  { value: 'crown', label: 'Crown', icon: Crown },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'flame', label: 'Flame', icon: Flame },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'package', label: 'Package', icon: Package },
  { value: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'coffee', label: 'Coffee', icon: Coffee },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'palette', label: 'Palette', icon: Palette },
];

// Get icon component by value
export const getIconComponent = (iconValue: string) => {
  const icon = COLLECTION_ICONS.find(i => i.value === iconValue);
  return icon?.icon || Folder;
};

// Predefined color palette
export const COLLECTION_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
];

// Generate a random color from palette
export const getRandomColor = (): string => {
  return COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
};