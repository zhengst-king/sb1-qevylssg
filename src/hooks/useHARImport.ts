// Enhanced version with Netflix metadata (only if you add the optional fields)
// Replace the saveToSupabaseWatchlists function in useHARImport.ts with this:

const saveToSupabaseWatchlists = async (processedTitles: ProcessedTitle[]): Promise<void> => {
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check for duplicates first
  const uniqueTitles = await checkForDuplicates(processedTitles);
  
  if (uniqueTitles.length === 0) {
    throw new Error('All titles already exist in your watchlist');
  }

  try {
    // Prepare data for Supabase insert
    const moviesToInsert = uniqueTitles.map(title => ({
      user_id: user.id,
      title: title.title,
      genre: title.genre || null,
      year: title.year || null,
      director: title.director || null,
      actors: title.actors || null,
      plot: title.plot || null,
      imdb_score: title.imdb_score || null,
      imdb_id: title.imdb_id || null,
      poster_url: title.poster_url || null,
      media_type: title.netflixType, // 'movie' or 'series'
      status: title.watchStatus, // 'To Watch', 'Watching', 'Watched'
      
      // Netflix-specific metadata (if you added the optional fields)
      netflix_id: title.netflixId,
      netflix_title: title.netflixTitle,
      netflix_synopsis: title.netflixSynopsis,
      import_source: title.source,
      enrichment_status: title.enrichmentStatus,
      import_date: title.dateImported.toISOString(),
      
      created_at: new Date().toISOString()
    }));

    // Insert all titles in a single batch
    const { data, error } = await supabase
      .from('movies')
      .insert(moviesToInsert)
      .select();

    if (error) {
      console.error('[HAR Import] Supabase insert error:', error);
      throw new Error(`Failed to save titles to database: ${error.message}`);
    }

    console.log(`[HAR Import] Successfully saved ${data?.length || 0} titles to Supabase`);

  } catch (error) {
    console.error('[HAR Import] Error saving to Supabase:', error);
    throw error;
  }
};