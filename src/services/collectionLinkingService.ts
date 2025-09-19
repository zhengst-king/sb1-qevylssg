// src/services/collectionLinkingService.ts
// Service to link collections to their technical specifications

import { supabase } from '../lib/supabase';

interface LinkingResult {
  totalCollections: number;
  totalTechnicalSpecs: number;
  linkedBefore: number;
  linkedAfter: number;
  newlyLinked: number;
  stillUnlinked: number;
  success: boolean;
  error?: string;
}

interface LinkingProgress {
  step: string;
  progress: number;
  total: number;
  message: string;
}

class CollectionLinkingService {
  
  /**
   * Main function to link all collections to their technical specs
   */
  async linkAllCollectionsToTechnicalSpecs(
    onProgress?: (progress: LinkingProgress) => void
  ): Promise<LinkingResult> {
    try {
      // Step 1: Get current state
      onProgress?.({
        step: 'Analyzing current data',
        progress: 0,
        total: 5,
        message: 'Checking current collections and technical specs...'
      });

      const initialStats = await this.getCurrentLinkingStats();
      
      onProgress?.({
        step: 'Linking by exact match',
        progress: 1,
        total: 5,
        message: 'Linking collections to technical specs by title and year...'
      });

      // Step 2: Link by exact title and year match
      const exactMatches = await this.linkByExactMatch();
      
      onProgress?.({
        step: 'Linking by fuzzy match',
        progress: 2,
        total: 5,
        message: 'Linking remaining collections with fuzzy matching...'
      });

      // Step 3: Link by fuzzy title match (allow 1 year difference)
      const fuzzyMatches = await this.linkByFuzzyMatch();
      
      onProgress?.({
        step: 'Linking from scraping queue',
        progress: 3,
        total: 5,
        message: 'Linking from completed scraping jobs...'
      });

      // Step 4: Link from completed scraping queue
      const queueMatches = await this.linkFromScrapingQueue();
      
      onProgress?.({
        step: 'Finalizing',
        progress: 4,
        total: 5,
        message: 'Getting final statistics...'
      });

      // Step 5: Get final stats
      const finalStats = await this.getCurrentLinkingStats();

      onProgress?.({
        step: 'Complete',
        progress: 5,
        total: 5,
        message: `Successfully linked ${finalStats.linkedCount - initialStats.linkedCount} collections!`
      });

      return {
        totalCollections: finalStats.totalCollections,
        totalTechnicalSpecs: finalStats.totalTechnicalSpecs,
        linkedBefore: initialStats.linkedCount,
        linkedAfter: finalStats.linkedCount,
        newlyLinked: finalStats.linkedCount - initialStats.linkedCount,
        stillUnlinked: finalStats.totalCollections - finalStats.linkedCount,
        success: true
      };

    } catch (error) {
      console.error('[CollectionLinking] Error:', error);
      return {
        totalCollections: 0,
        totalTechnicalSpecs: 0,
        linkedBefore: 0,
        linkedAfter: 0,
        newlyLinked: 0,
        stillUnlinked: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Link collections by exact title and year match
   */
  private async linkByExactMatch(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('link_collections_exact_match');
      
      if (error) {
        console.error('[CollectionLinking] Exact match error:', error);
        // Fallback to manual query
        return await this.linkByExactMatchManual();
      }

      return data || 0;
    } catch (error) {
      console.error('[CollectionLinking] Exact match error:', error);
      return await this.linkByExactMatchManual();
    }
  }

  /**
   * Manual exact match linking (fallback)
   */
  private async linkByExactMatchManual(): Promise<number> {
    // Get unlinked collections
    const { data: collections, error: collectionsError } = await supabase
      .from('physical_media_collections')
      .select('id, title, year')
      .is('technical_specs_id', null);

    if (collectionsError || !collections) {
      console.error('[CollectionLinking] Error fetching collections:', collectionsError);
      return 0;
    }

    let linkedCount = 0;

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < collections.length; i += 10) {
      const batch = collections.slice(i, i + 10);
      
      for (const collection of batch) {
        // Find matching technical spec
        const { data: techSpecs, error: techError } = await supabase
          .from('bluray_technical_specs')
          .select('id')
          .ilike('title', collection.title)
          .eq('year', collection.year)
          .limit(1)
          .single();

        if (!techError && techSpecs) {
          // Update collection with technical specs ID
          const { error: updateError } = await supabase
            .from('physical_media_collections')
            .update({ technical_specs_id: techSpecs.id })
            .eq('id', collection.id);

          if (!updateError) {
            linkedCount++;
          }
        }
      }
    }

    return linkedCount;
  }

  /**
   * Link by fuzzy title match (allow 1 year difference)
   */
  private async linkByFuzzyMatch(): Promise<number> {
    const { data: collections, error: collectionsError } = await supabase
      .from('physical_media_collections')
      .select('id, title, year')
      .is('technical_specs_id', null);

    if (collectionsError || !collections) return 0;

    let linkedCount = 0;

    for (const collection of collections) {
      // Find technical specs with same title and similar year
      const { data: techSpecs, error: techError } = await supabase
        .from('bluray_technical_specs')
        .select('id, year')
        .ilike('title', collection.title)
        .limit(5); // Get multiple matches to find best year match

      if (!techError && techSpecs && techSpecs.length > 0) {
        // Find best year match (within 1 year)
        const bestMatch = techSpecs.find(spec => 
          Math.abs((spec.year || 0) - (collection.year || 0)) <= 1
        ) || techSpecs[0]; // Fallback to first match

        const { error: updateError } = await supabase
          .from('physical_media_collections')
          .update({ technical_specs_id: bestMatch.id })
          .eq('id', collection.id);

        if (!updateError) {
          linkedCount++;
        }
      }
    }

    return linkedCount;
  }

  /**
   * Link from completed scraping queue
   */
  private async linkFromScrapingQueue(): Promise<number> {
    const { data, error } = await supabase
      .from('scraping_queue')
      .select(`
        collection_item_id,
        technical_specs_id,
        physical_media_collections!inner(id, technical_specs_id)
      `)
      .eq('status', 'completed')
      .not('technical_specs_id', 'is', null)
      .is('physical_media_collections.technical_specs_id', null);

    if (error || !data) {
      console.error('[CollectionLinking] Error fetching queue data:', error);
      return 0;
    }

    let linkedCount = 0;

    for (const item of data) {
      const { error: updateError } = await supabase
        .from('physical_media_collections')
        .update({ technical_specs_id: item.technical_specs_id })
        .eq('id', item.collection_item_id);

      if (!updateError) {
        linkedCount++;
      }
    }

    return linkedCount;
  }

  /**
   * Get current linking statistics
   */
  private async getCurrentLinkingStats(): Promise<{
    totalCollections: number;
    totalTechnicalSpecs: number;
    linkedCount: number;
  }> {
    const [collectionsResult, techSpecsResult, linkedResult] = await Promise.all([
      supabase.from('physical_media_collections').select('*', { count: 'exact', head: true }),
      supabase.from('bluray_technical_specs').select('*', { count: 'exact', head: true }),
      supabase.from('physical_media_collections').select('*', { count: 'exact', head: true }).not('technical_specs_id', 'is', null)
    ]);

    return {
      totalCollections: collectionsResult.count || 0,
      totalTechnicalSpecs: techSpecsResult.count || 0,
      linkedCount: linkedResult.count || 0
    };
  }

  /**
   * Get detailed linking report
   */
  async getLinkingReport(userId?: string): Promise<{
    collections: Array<{
      id: string;
      title: string;
      year?: number;
      hasSpecs: boolean;
      specsTitle?: string;
      specsYear?: number;
      videoCodec?: string;
      audioCodecs?: string[];
    }>;
    summary: {
      total: number;
      linked: number;
      unlinked: number;
      percentage: number;
    };
  }> {
    try {
      let query = supabase
        .from('physical_media_collections')
        .select(`
          id,
          title,
          year,
          technical_specs_id,
          bluray_technical_specs (
            title,
            year,
            video_codec,
            audio_codecs
          )
        `)
        .order('title');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const collections = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        year: item.year,
        hasSpecs: !!item.technical_specs_id,
        specsTitle: item.bluray_technical_specs?.title,
        specsYear: item.bluray_technical_specs?.year,
        videoCodec: item.bluray_technical_specs?.video_codec,
        audioCodecs: item.bluray_technical_specs?.audio_codecs
      }));

      const linked = collections.filter(c => c.hasSpecs).length;
      const total = collections.length;

      return {
        collections,
        summary: {
          total,
          linked,
          unlinked: total - linked,
          percentage: total > 0 ? Math.round((linked / total) * 100) : 0
        }
      };

    } catch (error) {
      console.error('[CollectionLinking] Error getting report:', error);
      return {
        collections: [],
        summary: { total: 0, linked: 0, unlinked: 0, percentage: 0 }
      };
    }
  }
}

export const collectionLinkingService = new CollectionLinkingService();