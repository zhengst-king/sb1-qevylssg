import { supabase } from './supabase';
import type { BlurayTechnicalSpecs, ScrapingJob } from './supabase';

class TechnicalSpecsService {
  private readonly CACHE_DURATION_DAYS = 30;

  // Get technical specs for a title (from cache)
  async getTechnicalSpecs(title: string, year?: number, discFormat?: string): Promise<BlurayTechnicalSpecs | null> {
    try {
      let query = supabase
        .from('bluray_technical_specs')
        .select('*')
        .eq('title', title);

      if (year) {
        query = query.eq('year', year);
      }

      if (discFormat) {
        query = query.eq('disc_format', discFormat);
      }

      const { data, error } = await query
        .order('data_quality', { ascending: false }) // Prefer complete data
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching technical specs:', error);
        return null;
      }

      // Check if cache is still valid
      if (data && this.isCacheValid(data.last_scraped_at)) {
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error in getTechnicalSpecs:', error);
      return null;
    }
  }

  // Request technical specs for a title (adds to scraping queue)
  async requestTechnicalSpecs(
    title: string, 
    year?: number, 
    imdbId?: string,
    collectionItemId?: string,
    priority: number = 0
  ): Promise<ScrapingJob | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Check if already in queue
      const { data: existingJob } = await supabase
        .from('scraping_queue')
        .select('*')
        .eq('title', title)
        .eq('year', year || 0)
        .in('status', ['pending', 'processing'])
        .single();

      if (existingJob) {
        console.log('Job already in queue:', existingJob.id);
        return existingJob;
      }

      // Create new scraping job
      const { data, error } = await supabase
        .from('scraping_queue')
        .insert([{
          title,
          year,
          imdb_id: imdbId,
          search_query: year ? `${title} ${year}` : title,
          priority,
          requested_by_user_id: user.user.id,
          collection_item_id: collectionItemId
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating scraping job:', error);
        return null;
      }

      console.log('Created scraping job:', data.id);
      return data;
    } catch (error) {
      console.error('Error in requestTechnicalSpecs:', error);
      return null;
    }
  }

  // Get scraping job status for a collection item
  async getScrapingStatus(collectionItemId: string): Promise<ScrapingJob | null> {
    try {
      const { data, error } = await supabase
        .from('scraping_queue')
        .select('*')
        .eq('collection_item_id', collectionItemId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching scraping status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getScrapingStatus:', error);
      return null;
    }
  }

  // Link collection item to technical specs
  async linkCollectionToSpecs(collectionItemId: string, technicalSpecsId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('physical_media_collections')
        .update({ technical_specs_id: technicalSpecsId })
        .eq('id', collectionItemId);

      if (error) {
        console.error('Error linking collection to specs:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in linkCollectionToSpecs:', error);
      return false;
    }
  }

  // Check if cached data is still valid
  private isCacheValid(lastScrapedAt: string): boolean {
    const cacheAge = Date.now() - new Date(lastScrapedAt).getTime();
    const maxAge = this.CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000;
    return cacheAge < maxAge;
  }

  // Get queue statistics (for admin/debugging)
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('scraping_queue')
        .select('status')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (error) {
        console.error('Error fetching queue stats:', error);
        return { pending: 0, processing: 0, completed: 0, failed: 0 };
      }

      const stats = data.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        pending: stats.pending || 0,
        processing: stats.processing || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0
      };
    } catch (error) {
      console.error('Error in getQueueStats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }
}

export const technicalSpecsService = new TechnicalSpecsService();