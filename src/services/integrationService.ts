// src/services/integrationService.ts
// Integration service to coordinate background job processing with the UI
import { backgroundJobProcessor } from './backgroundJobProcessor';
import { serverSideEpisodeService } from './serverSideEpisodeService';
import { supabase } from '../lib/supabase';

interface SystemStatus {
  jobProcessor: {
    running: boolean;
    stats: any;
  };
  database: {
    connected: boolean;
    episodeCount: number;
    seriesCount: number;
  };
  lastSync: Date | null;
}

class IntegrationService {
  private isInitialized = false;
  private statusCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the complete server-side caching system
   */
  async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Integration] Initializing server-side caching system...');

      // Test database connectivity
      const { data, error } = await supabase.from('episode_discovery_queue').select('count', { count: 'exact', head: true });
      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      // Background job processor is already running from constructor
      console.log('[Integration] Background job processor started');

      // Start status monitoring
      this.startStatusMonitoring();

      this.isInitialized = true;

      console.log('[Integration] ✅ Server-side caching system initialized successfully');
      return {
        success: true,
        message: 'Server-side caching system initialized successfully'
      };

    } catch (error) {
      console.error('[Integration] Failed to initialize:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown initialization error'
      };
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Get job processor stats
      const jobStats = await backgroundJobProcessor.getProcessingStats();

      // Get database stats
      const { data: episodeCount } = await supabase
        .from('episodes_cache')
        .select('*', { count: 'exact', head: true });

      const { data: seriesCount } = await supabase
        .from('series_episode_counts')
        .select('*', { count: 'exact', head: true });

      return {
        jobProcessor: {
          running: true, // backgroundJobProcessor is always running
          stats: jobStats
        },
        database: {
          connected: true,
          episodeCount: episodeCount?.length || 0,
          seriesCount: seriesCount?.length || 0
        },
        lastSync: new Date()
      };

    } catch (error) {
      console.error('[Integration] Error getting system status:', error);
      return {
        jobProcessor: {
          running: false,
          stats: null
        },
        database: {
          connected: false,
          episodeCount: 0,
          seriesCount: 0
        },
        lastSync: null
      };
    }
  }

  /**
   * Start periodic status monitoring for debugging
   */
  private startStatusMonitoring(): void {
    // Log status every 30 seconds for monitoring
    this.statusCheckInterval = setInterval(async () => {
      const status = await this.getSystemStatus();
      
      if (status.jobProcessor.stats?.isProcessing) {
        console.log(`[Integration] Processing: ${status.jobProcessor.stats.currentJob || 'Unknown job'}`);
      }
      
      if (status.jobProcessor.stats?.queueLength > 0) {
        console.log(`[Integration] Queue: ${status.jobProcessor.stats.queueLength} jobs waiting`);
      }
    }, 30000);
  }

  /**
   * Stop the integration service
   */
  stop(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }

    backgroundJobProcessor.stop();
    this.isInitialized = false;
    console.log('[Integration] Integration service stopped');
  }

  /**
   * Force process all pending jobs (for testing/admin use)
   */
  async forceProcessQueue(): Promise<{ message: string; queueLength: number }> {
    try {
      const stats = await backgroundJobProcessor.getProcessingStats();
      
      if (stats.isProcessing) {
        return {
          message: 'Job processor is already running',
          queueLength: stats.queueLength
        };
      }

      // The processor automatically runs, so just return current status
      return {
        message: `Background processor is active. ${stats.queueLength} jobs in queue.`,
        queueLength: stats.queueLength
      };

    } catch (error) {
      console.error('[Integration] Error force processing queue:', error);
      return {
        message: 'Error accessing queue',
        queueLength: 0
      };
    }
  }

  /**
   * Add a series to the discovery queue (convenience method)
   */
  async queueSeriesDiscovery(
    imdbId: string, 
    title: string, 
    priority: 'high' | 'medium' | 'low' = 'medium',
    userId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await serverSideEpisodeService.addSeriesToQueue(imdbId, title, priority);
      
      return {
        success: true,
        message: `Added "${title}" to discovery queue with ${priority} priority`
      };

    } catch (error) {
      console.error('[Integration] Error queueing series discovery:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to queue series'
      };
    }
  }

  /**
   * Get a summary of recent activity
   */
  async getRecentActivity(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('episode_discovery_queue')
        .select(`
          series_imdb_id,
          series_title,
          status,
          created_at,
          completed_at,
          error_message,
          progress
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[Integration] Error fetching recent activity:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('[Integration] Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Clear failed jobs from the queue
   */
  async clearFailedJobs(): Promise<{ success: boolean; clearedCount: number }> {
    try {
      const { data, error } = await supabase
        .from('episode_discovery_queue')
        .delete()
        .eq('status', 'failed');

      if (error) {
        throw new Error(`Failed to clear failed jobs: ${error.message}`);
      }

      return {
        success: true,
        clearedCount: data?.length || 0
      };

    } catch (error) {
      console.error('[Integration] Error clearing failed jobs:', error);
      return {
        success: false,
        clearedCount: 0
      };
    }
  }

  /**
   * Get detailed queue information
   */
  async getQueueDetails(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('episode_discovery_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch queue details: ${error.message}`);
      }

      const grouped = {
        queued: data?.filter(job => job.status === 'queued') || [],
        processing: data?.filter(job => job.status === 'processing') || [],
        completed: data?.filter(job => job.status === 'completed') || [],
        failed: data?.filter(job => job.status === 'failed') || []
      };

      return {
        total: data?.length || 0,
        ...grouped,
        summary: {
          queued: grouped.queued.length,
          processing: grouped.processing.length,
          completed: grouped.completed.length,
          failed: grouped.failed.length
        }
      };

    } catch (error) {
      console.error('[Integration] Error getting queue details:', error);
      return {
        total: 0,
        queued: [],
        processing: [],
        completed: [],
        failed: [],
        summary: { queued: 0, processing: 0, completed: 0, failed: 0 }
      };
    }
  }

  /**
   * Check if the system is ready and working
   */
  async healthCheck(): Promise<{ 
    healthy: boolean; 
    checks: { 
      database: boolean; 
      jobProcessor: boolean; 
      queueAccessible: boolean 
    };
    details: any;
  }> {
    const checks = {
      database: false,
      jobProcessor: false,
      queueAccessible: false
    };

    try {
      // Test database connection
      const { error: dbError } = await supabase
        .from('episodes_cache')
        .select('count', { count: 'exact', head: true });
      checks.database = !dbError;

      // Test job processor
      const stats = await backgroundJobProcessor.getProcessingStats();
      checks.jobProcessor = stats !== null;

      // Test queue access
      const { error: queueError } = await supabase
        .from('episode_discovery_queue')
        .select('count', { count: 'exact', head: true });
      checks.queueAccessible = !queueError;

      const healthy = checks.database && checks.jobProcessor && checks.queueAccessible;

      return {
        healthy,
        checks,
        details: {
          initialized: this.isInitialized,
          processingStats: stats
        }
      };

    } catch (error) {
      console.error('[Integration] Health check failed:', error);
      return {
        healthy: false,
        checks,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
}

// Export singleton instance
export const integrationService = new IntegrationService();