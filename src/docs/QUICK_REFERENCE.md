# Media Library Quick Reference Card

## Quick Import Guide

```typescript
// Hook
import { useMediaLibrary } from '../hooks/useMediaLibrary';
import type { MediaLibraryItem, ItemStatus } from '../lib/supabase';

// Components
import { MyMediaLibraryPage } from '../components/MyMediaLibraryPage';
import { MediaLibraryItemCard } from '../components/MediaLibraryItemCard';
import { AddToLibraryModal } from '../components/AddToLibraryModal';
import { EditLibraryItemModal } from '../components/EditLibraryItemModal';
import { MediaLibraryItemDetailModal } from '../components/MediaLibraryItemDetailModal';

// Services
import { csvExportService } from '../services/csvExportService';
```

---

## Hook API Cheat Sheet

```typescript
const {
  // State
  libraryItems,          // MediaLibraryItem[]
  loading,               // boolean
  error,                 // string | null

  // CRUD Operations
  addToLibrary,          // (item) => Promise<MediaLibraryItem>
  updateLibraryItem,     // (id, updates) => Promise<MediaLibraryItem>
  removeFromLibrary,     // (id) => Promise<void>
  bulkUpdateLibraryItems, // (ids[], updates) => Promise<MediaLibraryItem[]>

  // Status Operations
  moveItemStatus,        // (id, status) => Promise<MediaLibraryItem>
  getItemsByStatus,      // (status) => MediaLibraryItem[]

  // Statistics
  getLibraryStats,       // () => MediaLibraryStats
  getLibraryValueStats,  // () => { totalValue, wishlistValue, ... }

  // Utilities
  getAllLibraryItems,    // () => Promise<MediaLibraryItem[]>
  itemExists,            // (imdbId, format?) => boolean
  searchLibrary,         // (query) => MediaLibraryItem[]
  refetch                // () => Promise<void>
} = useMediaLibrary(options?);
```

---

## Options

```typescript
interface UseMediaLibraryOptions {
  itemStatus?: 'owned' | 'wishlist' | 'for_sale' | 'loaned_out' | 'missing' | 'all';
  includeAll?: boolean;
}

// Examples:
useMediaLibrary()                          // All items
useMediaLibrary({ itemStatus: 'owned' })   // Only owned items
useMediaLibrary({ itemStatus: 'wishlist' }) // Only wishlist items
```

---

## Item Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| `owned` | In collection | Discs you own |
| `wishlist` | Want to buy | Shopping list |
| `for_sale` | Selling | Items for sale |
| `loaned_out` | Borrowed | Track loans |
| `missing` | Can't find | Lost items |

---

## CSV Service

```typescript
// Export entire library
await csvExportService.exportMediaLibraryToCSV(userId, {
  includeHeaders: true,
  includeTechnicalSpecs: true,
  dateFormat: 'iso',
  filename: 'my-media-library'
});

// Generate CSV from array
const csv = csvExportService.generateMediaLibraryCSV(libraryItems, {
  includeHeaders: true,
  includeTechnicalSpecs: false
});

// Download CSV
csvExportService.downloadCSV(csvContent, 'filename.csv');
```

---

## Common Patterns

### Basic List
```typescript
function LibraryList() {
  const { libraryItems, loading } = useMediaLibrary();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {libraryItems.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

### Add Item
```typescript
const { addToLibrary } = useMediaLibrary();

await addToLibrary({
  title: 'The Matrix',
  year: 1999,
  format: '4K UHD',
  condition: 'New',
  collection_type: 'owned',
  purchase_price: 29.99
});
```

### Update Item
```typescript
const { updateLibraryItem } = useMediaLibrary();

await updateLibraryItem(itemId, {
  personal_rating: 10,
  notes: 'Rewatched - amazing!'
});
```

### Move Status
```typescript
const { moveItemStatus } = useMediaLibrary();

// Wishlist → Owned
await moveItemStatus(itemId, 'owned');
```

### Search
```typescript
const { searchLibrary } = useMediaLibrary();

const results = searchLibrary('matrix');
```

### Statistics
```typescript
const { getLibraryStats } = useMediaLibrary({ itemStatus: 'all' });

const stats = getLibraryStats();
// { owned: 50, wishlist: 10, for_sale: 5, ... }
```

---

## Database Queries

```typescript
// Direct query (RLS auto-filters by user)
const { data } = await supabase
  .from('physical_media_collections')
  .select('*')
  .eq('collection_type', 'owned');

// With technical specs
const { data } = await supabase
  .from('physical_media_collections')
  .select(`
    *,
    bluray_technical_specs:technical_specs_id(*)
  `)
  .eq('user_id', userId);
```

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/media-library` | `MyMediaLibraryPage` | Main library page |
| `/collections` | Redirects to `/media-library` | Legacy route |

---

## Types

```typescript
type MediaLibraryItem = PhysicalMediaCollection;

type ItemStatus = 'owned' | 'wishlist' | 'for_sale' | 'loaned_out' | 'missing';

interface MediaLibraryItem {
  id: string;
  user_id: string;
  title: string;
  year?: number;
  format: 'DVD' | 'Blu-ray' | '4K UHD' | '3D Blu-ray';
  collection_type?: ItemStatus;
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;
  personal_rating?: number; // 1-10
  notes?: string;
  technical_specs_id?: string;
  imdb_id?: string;
  genre?: string;
  director?: string;
  poster_url?: string;
  created_at: string;
  updated_at: string;
}
```

---

## Do's and Don'ts

### ✅ DO
- Use `useMediaLibrary` hook for data access
- Filter by `itemStatus` for better performance
- Handle errors gracefully
- Use type-safe imports from `supabase.ts`
- Let the hook manage optimistic updates

### ❌ DON'T
- Query database directly (use the hook)
- Mutate `libraryItems` array directly
- Forget error handling
- Use old component names (they're removed)
- Update state manually (hook handles it)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Items not showing | Check filter, user auth, RLS policies |
| Can't add item | Verify required fields, check user auth |
| CSV export fails | Check user has items, browser allows downloads |
| Tech specs missing | Request via detail modal, wait for scraping |

---

## File Locations

```
src/
├── components/
│   ├── MyMediaLibraryPage.tsx
│   ├── MediaLibraryItemCard.tsx
│   ├── AddToLibraryModal.tsx
│   ├── EditLibraryItemModal.tsx
│   └── MediaLibraryItemDetailModal.tsx
├── hooks/
│   ├── useMediaLibrary.ts
│   └── useTechnicalSpecs.ts
├── services/
│   └── csvExportService.ts
├── lib/
│   └── supabase.ts (type definitions)
└── docs/
    ├── TERMINOLOGY_MIGRATION.md
    └── MEDIA_LIBRARY_GUIDE.md
```

---

**Print this and keep it handy!** 📄

**Last Updated**: November 2025