// Auto-generated from Tagging_System_Structure.xlsx
// DO NOT EDIT - Run generateTaggingSystem.ts to update

export interface TagCategory {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    "id": 1,
    "name": "Production & Crew",
    "icon": "\ud83c\udfac",
    "description": "Directors, producers, crew roles"
  },
  {
    "id": 2,
    "name": "Narrative & Writing",
    "icon": "\u270d\ufe0f",
    "description": "Story, plot, dialogue, structure"
  },
  {
    "id": 3,
    "name": "Performance & Acting",
    "icon": "\ud83c\udfad",
    "description": "Acting performances and character work"
  },
  {
    "id": 4,
    "name": "Visual & Cinematography",
    "icon": "\ud83d\udcf7",
    "description": "Cinematography, visual style, design"
  },
  {
    "id": 5,
    "name": "Audio & Music",
    "icon": "\ud83c\udfb5",
    "description": "Music, sound design, audio production"
  },
  {
    "id": 6,
    "name": "Genre & Style",
    "icon": "\ud83c\udfa8",
    "description": "Genre elements and stylistic choices"
  },
  {
    "id": 7,
    "name": "Analysis & Themes",
    "icon": "\ud83e\udde0",
    "description": "Themes, symbolism, deeper meaning"
  },
  {
    "id": 8,
    "name": "Technical Quality",
    "icon": "\u2699\ufe0f",
    "description": "Technical execution and quality"
  },
  {
    "id": 9,
    "name": "Audience & Reception",
    "icon": "\ud83d\udc65",
    "description": "Impact, reception, accessibility"
  }
];

export function getCategoryById(id: number): TagCategory | undefined {
  return TAG_CATEGORIES.find(cat => cat.id === id);
}

export function getCategoryByName(name: string): TagCategory | undefined {
  return TAG_CATEGORIES.find(cat => cat.name === name);
}