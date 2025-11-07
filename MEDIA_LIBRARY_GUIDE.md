# Media Library Developer Guide

## Overview

The **Media Library** feature allows users to manage their physical disc collection (DVDs, Blu-rays, 4K UHD, 3D Blu-rays). This guide covers architecture, implementation details, and best practices for working with the Media Library system.

---

## Feature Capabilities

### Core Features
- ✅ Add physical media to personal library
- ✅ Track item status (Owned, Wishlist, For Sale, Loaned Out, Missing)
- ✅ Record purchase details (date, price, location, condition)
- ✅ Link to technical specifications from Blu-ray.com
- ✅ Personal ratings and notes
- ✅ CSV export/import for backup and migration
- ✅ Search and filter by format, status, title
- ✅ Detailed item management with modals

---

## Architecture

### Database Schema

**Table**: `physical_media_collections`

```sql
CREATE TABLE physical_media_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Media Information
  imdb_id TEXT,
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  director TEXT,
  poster_url TEXT,
  
  -- Physical Media Details
  format TEXT NOT NULL CHECK (format IN ('DVD', 'Blu-ray', '4K UHD', '3D Blu-ray')),
  condition TEXT NOT NULL CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
  collection_type TEXT DEFAULT 'owned' CHECK (collection_type IN ('owned', 'wishlist', 'for_sale', 'loaned_out', 'missing')),
  
  -- Purchase Information
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  purchase_location TEXT,
  
  -- User Data
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 10),
  notes TEXT,
  
  -- Technical Specifications
  technical_specs_id UUID REFERENCES bluray_technical_specs(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pmc_user_id ON physical_media_collections(user_id);
CREATE INDEX idx_pmc_imdb_id ON physical_media_collections(imdb_id);
CREATE INDEX idx_pmc_collection_type ON physical_media_collections(collection_type);
CREATE INDEX idx_pmc_format ON physical_media_collections(format);
```

### Row Level Security (RLS)

```sql
-- Users can only access their own library items
CREATE POLICY "Users can view own media library"
  ON physical_media_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media library"
  ON physical_media_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media library"
  ON physical_media_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media library"
  ON physical_media_collections FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Core Hook: `useMediaLibrary`

### Basic Usage

```typescript
import { useMediaLibrary } from '../hooks/useMediaLibrary';

function MyComponent() {
  const {
    libraryItems,      // Current items (filtered by status if specified)
    loading,           // Loading state
    error,             // Error message if any
    addToLibrary,      // Add new item
    updateLibraryItem, // Update existing item
    removeFromLibrary, // Delete item
    moveItemStatus,    // Change item status
    getLibraryStats,   // Get statistics
    refetch            // Manually refresh data
  } = useMediaLibrary();

  return (
    <div>
      {libraryItems.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

### Filtering by Status

```typescript
// Show only owned items
const { libraryItems } = useMediaLibrary({ itemStatus: 'owned' });

// Show only wishlist items
const { libraryItems } = useMediaLibrary({ itemStatus: 'wishlist' });

// Show all items (default)
const { libraryItems } = useMediaLibrary({ itemStatus: 'all' });
```

### Adding Items

```typescript
const { addToLibrary } = useMediaLibrary();

const handleAdd = async () => {
  try {
    const newItem = await addToLibrary({
      title: 'The Matrix',
      year: 1999,
      format: '4K UHD',
      condition: 'New',
      collection_type: 'owned',
      purchase_price: 29.99,
      purchase_date: '2025-01-15',
      imdb_id: 'tt0133093',
      poster_url: 'https://...',
      personal_rating: 9
    });
    console.log('Added:', newItem);
  } catch (error) {
    console.error('Failed to add:', error);
  }
};
```

### Updating Items

```typescript
const { updateLibraryItem } = useMediaLibrary();

const handleUpdate = async (itemId: string) => {
  try {
    const updated = await updateLibraryItem(itemId, {
      personal_rating: 10,
      notes: 'Rewatched - still amazing!'
    });
    console.log('Updated:', updated);
  } catch (error) {
    console.error('Failed to update:', error);
  }
};
```

### Moving Between Statuses

```typescript
const { moveItemStatus } = useMediaLibrary();

// Move from wishlist to owned
const handlePurchase = async (itemId: string) => {
  try {
    await moveItemStatus(itemId, 'owned');
    console.log('Item purchased and moved to owned!');
  } catch (error) {
    console.error('Failed to move:', error);
  }
};
```

### Getting Statistics

```typescript
const { getLibraryStats } = useMediaLibrary({ itemStatus: 'all' });

const stats = getLibraryStats();
console.log('Total items:', stats.total);
console.log('Owned:', stats.owned);
console.log('Wishlist:', stats.wishlist);
console.log('For sale:', stats.for_sale);
```

---

## CSV Export/Import

### Exporting Library

```typescript
import { csvExportService } from '../services/csvExportService';

const handleExport = async (userId: string) => {
  const result = await csvExportService.exportMediaLibraryToCSV(userId, {
    includeHeaders: true,
    includeTechnicalSpecs: true,
    dateFormat: 'iso',
    filename: 'my-media-library'
  });

  if (result.success) {
    console.log(`Exported ${result.recordCount} items to ${result.filename}`);
  }
};
```

### Generating CSV from Array

```typescript
import { csvExportService } from '../services/csvExportService';

const { libraryItems } = useMediaLibrary();

const csv = csvExportService.generateMediaLibraryCSV(libraryItems, {
  includeHeaders: true,
  includeTechnicalSpecs: false
});

// Use the CSV string as needed
console.log(csv);
```

---

## Technical Specifications Integration

### Requesting Technical Specs

```typescript
import { useTechnicalSpecs } from '../hooks/useTechnicalSpecs';

function ItemDetail({ item }: { item: MediaLibraryItem }) {
  const {
    specs,
    loading,
    requesting,
    requestSpecs,
    hasSpecs,
    isProcessing
  } = useTechnicalSpecs(
    item.title,
    item.year,
    item.format,
    item.id  // libraryItemId parameter
  );

  const handleRequest = async () => {
    const success = await requestSpecs(1); // priority: 1 = high
    if (success) {
      console.log('Technical specs requested!');
    }
  };

  return (
    <div>
      {hasSpecs ? (
        <div>Video: {specs.video_resolution}</div>
      ) : (
        <button onClick={handleRequest} disabled={requesting || isProcessing}>
          Request Technical Specs
        </button>
      )}
    </div>
  );
}
```

---

## Component Architecture

### Main Page Component

**`MyMediaLibraryPage.tsx`**
- Main container for library management
- Handles status filtering, search, and sorting
- Renders item grid with `MediaLibraryItemCard` components
- Manages modals (Add, Edit, Import, Detail)

### Card Component

**`MediaLibraryItemCard.tsx`**
- Individual item display in grid
- Shows poster, title, format, condition
- Quick actions: Edit, Delete, Move Status
- Click to open detail modal

### Modals

**`AddToLibraryModal.tsx`**
- Form for adding new items
- Search integration with OMDb
- Format, condition, and status selection
- Purchase details input

**`EditLibraryItemModal.tsx`**
- Edit existing item details
- Same fields as Add modal
- Pre-populated with current values

**`MediaLibraryItemDetailModal.tsx`**
- Full item details view
- Technical specifications display
- Purchase information
- Notes and rating

**`ImportListsModal.tsx`**
- CSV import interface
- Template download
- Import validation
- Success/error reporting

---

## Best Practices

### 1. Always Filter by User

```typescript
// ✅ CORRECT - RLS handles this automatically
const { data } = await supabase
  .from('physical_media_collections')
  .select('*')
  .eq('user_id', user.id);

// ⚠️ RLS policies ensure users only see their own data
```

### 2. Handle Errors Gracefully

```typescript
const { addToLibrary } = useMediaLibrary();

try {
  await addToLibrary(itemData);
  toast.success('Item added to library!');
} catch (error) {
  console.error('Add failed:', error);
  toast.error('Failed to add item. Please try again.');
}
```

### 3. Optimistic UI Updates

```typescript
// The hook handles optimistic updates automatically
// Just call the function and let it manage state
const { moveItemStatus } = useMediaLibrary();

// No need for manual state updates
await moveItemStatus(itemId, 'owned');
```

### 4. Use Type Safety

```typescript
import type { MediaLibraryItem, ItemStatus } from '../lib/supabase';

function processItem(item: MediaLibraryItem): void {
  console.log(`Processing ${item.title}`);
}

function filterByStatus(status: ItemStatus): MediaLibraryItem[] {
  // TypeScript ensures status is valid
}
```

### 5. Validate Before Submitting

```typescript
const handleAdd = async (formData: FormData) => {
  // Validate required fields
  if (!formData.title || !formData.format || !formData.condition) {
    alert('Please fill in required fields');
    return;
  }

  // Validate price
  if (formData.purchase_price && formData.purchase_price < 0) {
    alert('Price cannot be negative');
    return;
  }

  // Proceed with add
  await addToLibrary(formData);
};
```

---

## Common Patterns

### Loading State

```typescript
function LibraryList() {
  const { libraryItems, loading, error } = useMediaLibrary();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div>
      {libraryItems.map(item => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Search and Filter

```typescript
function FilteredLibrary() {
  const { libraryItems, searchLibrary } = useMediaLibrary({ itemStatus: 'all' });
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<string>('all');

  const filtered = useMemo(() => {
    let items = query ? searchLibrary(query) : libraryItems;
    
    if (format !== 'all') {
      items = items.filter(item => item.format === format);
    }
    
    return items;
  }, [libraryItems, query, format, searchLibrary]);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <select value={format} onChange={e => setFormat(e.target.value)}>
        <option value="all">All Formats</option>
        <option value="4K UHD">4K UHD</option>
        <option value="Blu-ray">Blu-ray</option>
        <option value="DVD">DVD</option>
      </select>
      
      {filtered.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

### Bulk Operations

```typescript
const { bulkUpdateLibraryItems } = useMediaLibrary();

const handleBulkUpdate = async (itemIds: string[], updates: Partial<MediaLibraryItem>) => {
  try {
    await bulkUpdateLibraryItems(itemIds, updates);
    console.log('Bulk update successful!');
  } catch (error) {
    console.error('Bulk update failed:', error);
  }
};

// Example: Mark multiple items as loaned out
handleBulkUpdate(['id1', 'id2', 'id3'], { collection_type: 'loaned_out' });
```

---

## Troubleshooting

### Items Not Appearing

**Check**:
1. User is authenticated
2. RLS policies are enabled
3. No filter hiding the items
4. Database query succeeds without errors

```typescript
const { libraryItems, loading, error } = useMediaLibrary();

console.log('Items:', libraryItems.length);
console.log('Loading:', loading);
console.log('Error:', error);
```

### CSV Export Fails

**Check**:
1. User ID is valid
2. User has items in library
3. Browser allows downloads
4. No console errors

```typescript
const result = await csvExportService.exportMediaLibraryToCSV(userId);
console.log('Export result:', result);
```

### Technical Specs Not Loading

**Check**:
1. Item has valid `technical_specs_id`
2. Technical specs exist in database
3. Join query is correct

```typescript
// Verify the join in your query
.select(`
  *,
  bluray_technical_specs:technical_specs_id(*)
`)
```

---

## Related Documentation

- **Terminology Migration**: `docs/TERMINOLOGY_MIGRATION.md`
- **Main README**: `README.md`
- **Database Schema**: See Supabase dashboard

---

**Last Updated**: November 2025  
**Maintained By**: Tagflix Development Team