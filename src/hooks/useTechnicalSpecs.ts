// src/hooks/useTechnicalSpecs.ts
import { useState, useEffect } from 'react';
import { technicalSpecsService } from '../lib/technicalSpecsService';
import type { BlurayTechnicalSpecs, ScrapingJob } from '../lib/supabase';

export function useTechnicalSpecs(
  title: string, 
  year?: number, 
  discFormat?: string,
  libraryItemId?: string,
  blurayComUrl?: string  // ✅ ADDED: blu-ray.com URL parameter
) {
  const [specs, setSpecs] = useState<BlurayTechnicalSpecs | null>(null);
  const [scrapingJob, setScrapingJob] = useState<ScrapingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (title) {
      loadSpecs();
    }
  }, [title, year, discFormat]);

  const loadSpecs = async () => {
    try {
      setLoading(true);
      
      // Try to get cached specs first
      const cachedSpecs = await technicalSpecsService.getTechnicalSpecs(title, year, discFormat);
      if (cachedSpecs) {
        setSpecs(cachedSpecs);
        setLoading(false);
        return;
      }

      // Check if there's a pending/processing job
      if (libraryItemId) {
        const job = await technicalSpecsService.getScrapingStatus(libraryItemId);
        setScrapingJob(job);
      }
    } catch (error) {
      console.error('Error loading technical specs:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestSpecs = async (priority: number = 0): Promise<boolean> => {
    if (!title || requesting) return false;

    try {
      setRequesting(true);
      
      const job = await technicalSpecsService.requestTechnicalSpecs(
        title,
        year,
        undefined, // imdbId - we can add this later
        blurayComUrl,  // ✅ ADDED: Pass bluray_com_url to service
        libraryItemId,
        priority
      );

      if (job) {
        setScrapingJob(job);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error requesting technical specs:', error);
      return false;
    } finally {
      setRequesting(false);
    }
  };

  const refreshSpecs = async () => {
    await loadSpecs();
  };

  return {
    specs,
    scrapingJob,
    loading,
    requesting,
    requestSpecs,
    refreshSpecs,
    hasSpecs: !!specs,
    isProcessing: scrapingJob?.status === 'processing',
    isPending: scrapingJob?.status === 'pending',
    hasFailed: scrapingJob?.status === 'failed'
  };
}