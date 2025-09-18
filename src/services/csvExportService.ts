// src/services/csvExportService.ts - FIXED TECHNICAL SPECS INTEGRATION
import { supabase } from '../lib/supabase';
import type { PhysicalMediaCollection } from '../lib/supabase';

export interface CSVExportOptions {
  includeHeaders?: boolean;
  includeTechnicalSpecs?: boolean;
  dateFormat?: 'iso' | 'us' | 'eu';
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  recordCount: number;
  error?: string;
}

// Extended type for collections with technical specs
interface CollectionWithTechnicalSpecs extends PhysicalMediaCollection {
  bluray_technical_specs?: {
    video_codec?: string;
    video_resolution?: string;
    hdr_format?: string[];
    aspect_ratio?: string;
    frame_rate?: string;
    audio_codecs?: string[];
    audio_channels?: string[];
    audio_languages?: string[];
    region_codes?: string[];
    disc_count?: number;
    studio?: string;
    distributor?: string;
    special_features?: string[];
    subtitles?: string[];
    runtime_minutes?: number;
    upc_code?: string;
    data_quality?: string;
  };
}

class CSVExportService {
  private readonly DEFAULT_OPTIONS: Required<CSVExportOptions> = {
    includeHeaders: true,
    includeTechnicalSpecs: true,
    dateFormat: 'iso',
    filename: 'physical-media-collection'
  };

  /**
   * Generate CSV content from collections array (used by MyCollectionsPage)
   * This is the simple method that works directly with collections data
   */
  generateCollectionCSV(
    collections: PhysicalMediaCollection[],
    options: Partial<CSVExportOptions> = {}
  ): string {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (!collections || collections.length === 0) {
      throw new Error('No collection items to export');
    }

    const csvLines: string[] = [];
    
    // Add headers if requested
    if (config.includeHeaders) {
      csvLines.push(this.getCSVHeaders(config.includeTechnicalSpecs).join(','));
    }
    
    // Add data rows
    collections.forEach(item => {
      csvLines.push(this.formatDataRow(item as CollectionWithTechnicalSpecs, config));
    });
    
    return csvLines.join('\n');
  }

  /**
   * Download CSV content as file (used by MyCollectionsPage)
   */
  downloadCSV(csvContent: string, filename: string): void {
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for browsers that don't support the download attribute
      window.open(URL.createObjectURL(blob));
    }
  }

  /**
   * Export user's physical media collection to CSV with proper technical specs join
   */
  async exportCollectionToCSV(
    userId: string,
    options: CSVExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const config = { ...this.DEFAULT_OPTIONS, ...options };
      
      // Fetch collection data with technical specs - FIXED QUERY
      const collectionData = await this.fetchCollectionDataWithTechnicalSpecs(userId, config.includeTechnicalSpecs);
      
      if (collectionData.length === 0) {
        throw new Error('No collection items found to export');
      }

      // Generate CSV content
      const csvContent = this.generateCSVContent(collectionData, config);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${config.filename}-${timestamp}.csv`;
      
      // Trigger download
      this.downloadCSV(csvContent, filename);
      
      return {
        success: true,
        filename,
        recordCount: collectionData.length
      };

    } catch (error) {
      console.error('[CSV Export] Error:', error);
      return {
        success: false,
        filename: '',
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * FIXED: Fetch collection data with proper technical specs join
   */
  private async fetchCollectionDataWithTechnicalSpecs(
    userId: string, 
    includeTechnicalSpecs: boolean
  ): Promise<CollectionWithTechnicalSpecs[]> {
    try {
      console.log('[CSV Export] Fetching collection data with technical specs...');

      let query;
      
      if (includeTechnicalSpecs) {
        // Use the proper join with bluray_technical_specs table
        query = supabase
          .from('physical_media_collections')
          .select(`
            *,
            bluray_technical_specs (
              video_codec,
              video_resolution,
              hdr_format,
              aspect_ratio,
              frame_rate,
              audio_codecs,
              audio_channels,
              audio_languages,
              region_codes,
              disc_count,
              studio,
              distributor,
              special_features,
              subtitles,
              runtime_minutes,
              upc_code,
              data_quality
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      } else {
        // Simple query without technical specs
        query = supabase
          .from('physical_media_collections')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('[CSV Export] Fetch error:', error);
        throw new Error(`Failed to fetch collection data: ${error.message}`);
      }

      console.log(`[CSV Export] Fetched ${data?.length || 0} collection items`);
      
      // Log technical specs data for debugging
      if (includeTechnicalSpecs && data && data.length > 0) {
        const itemsWithSpecs = data.filter(item => item.bluray_technical_specs);
        console.log(`[CSV Export] ${itemsWithSpecs.length} items have technical specs`);
        
        // Debug log first item with specs
        if (itemsWithSpecs.length > 0) {
          console.log('[CSV Export] Sample technical specs:', itemsWithSpecs[0].bluray_technical_specs);
        }
      }

      return data || [];

    } catch (error) {
      console.error('[CSV Export] Error in fetchCollectionDataWithTechnicalSpecs:', error);
      throw error;
    }
  }

  /**
   * FIXED: CSV Headers with correct technical spec field names
   */
  private getCSVHeaders(includeTechnicalSpecs: boolean): string[] {
    const baseHeaders = [
      'Title',
      'Year',
      'Format',
      'Collection Type',
      'Genre',
      'Director',
      'Purchase Date',
      'Purchase Price',
      'Purchase Location',
      'Condition',
      'Personal Rating',
      'Notes',
      'IMDB ID',
      'Created Date',
      'Updated Date'
    ];

    if (includeTechnicalSpecs) {
      return [
        ...baseHeaders,
        'Video Codec',
        'Video Resolution',
        'HDR Format',
        'Aspect Ratio',
        'Audio Codecs',
        'Audio Channels',
        'Disc Count',
        'Studio',
        'Distributor',
        'Special Features',
        'Subtitles',
        'Runtime (Minutes)',
        'UPC Code',
        'Technical Specs Quality'
      ];
    }

    return baseHeaders;
  }

  /**
   * FIXED: Format data row with proper technical specs extraction
   */
  private formatDataRow(
    item: CollectionWithTechnicalSpecs,
    config: Required<CSVExportOptions>
  ): string {
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      let str = String(value);
      
      // Handle arrays (like HDR formats, audio codecs)
      if (Array.isArray(value)) {
        str = value.join(', ');
      }
      
      // Escape CSV special characters
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatDate = (dateStr: string | null): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      switch (config.dateFormat) {
        case 'us': return date.toLocaleDateString('en-US');
        case 'eu': return date.toLocaleDateString('en-GB');
        default: return date.toISOString().split('T')[0];
      }
    };

    // Base fields that all collections have
    const baseFields = [
      escapeCSV(item.title || ''),
      escapeCSV(item.year || ''),
      escapeCSV(item.format || ''),
      escapeCSV(item.collection_type || 'owned'),
      escapeCSV(item.genre || ''),
      escapeCSV(item.director || ''),
      escapeCSV(formatDate(item.purchase_date)),
      escapeCSV(item.purchase_price ? `$${item.purchase_price}` : ''),
      escapeCSV(item.purchase_location || ''),
      escapeCSV(item.condition || ''),
      escapeCSV(item.user_rating || ''),
      escapeCSV(item.notes || ''),
      escapeCSV(item.imdb_id || ''),
      escapeCSV(formatDate(item.created_at)),
      escapeCSV(formatDate(item.updated_at))
    ];

    // Add technical specs if requested and available
    if (config.includeTechnicalSpecs) {
      const specs = item.bluray_technical_specs;
      
      const technicalFields = [
        escapeCSV(specs?.video_codec || ''),
        escapeCSV(specs?.video_resolution || ''),
        escapeCSV(specs?.hdr_format || ''),
        escapeCSV(specs?.aspect_ratio || ''),
        escapeCSV(specs?.audio_codecs || ''),
        escapeCSV(specs?.audio_channels || ''),
        escapeCSV(specs?.disc_count || ''),
        escapeCSV(specs?.studio || ''),
        escapeCSV(specs?.distributor || ''),
        escapeCSV(specs?.special_features || ''),
        escapeCSV(specs?.subtitles || ''),
        escapeCSV(specs?.runtime_minutes || ''),
        escapeCSV(specs?.upc_code || ''),
        escapeCSV(specs?.data_quality || '')
      ];

      return [...baseFields, ...technicalFields].join(',');
    }

    return baseFields.join(',');
  }

  /**
   * Generate CSV content (used internally)
   */
  private generateCSVContent(
    collections: CollectionWithTechnicalSpecs[],
    config: Required<CSVExportOptions>
  ): string {
    const csvLines: string[] = [];

    // Add headers if requested
    if (config.includeHeaders) {
      csvLines.push(this.getCSVHeaders(config.includeTechnicalSpecs).join(','));
    }

    // Add data rows
    collections.forEach(item => {
      csvLines.push(this.formatDataRow(item, config));
    });

    return csvLines.join('\n');
  }

  /**
   * Get export statistics for large collections
   */
  async getExportStats(userId: string): Promise<{
    totalItems: number;
    withTechnicalSpecs: number;
    estimatedFileSize: string;
  }> {
    try {
      // Get total count
      const { count: totalItems } = await supabase
        .from('physical_media_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get count with technical specs (non-null technical_specs_id)
      const { count: withTechnicalSpecs } = await supabase
        .from('physical_media_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('technical_specs_id', 'is', null);

      // Estimate file size (rough calculation)
      const avgRowSize = 800; // bytes per row (increased for technical specs)
      const estimatedSize = (totalItems || 0) * avgRowSize;
      const estimatedFileSize = estimatedSize < 1024 ? 
        `${estimatedSize} B` : 
        estimatedSize < 1024 * 1024 ?
          `${(estimatedSize / 1024).toFixed(1)} KB` :
          `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`;

      return {
        totalItems: totalItems || 0,
        withTechnicalSpecs: withTechnicalSpecs || 0,
        estimatedFileSize
      };

    } catch (error) {
      console.error('[CSV Export] Error getting stats:', error);
      return {
        totalItems: 0,
        withTechnicalSpecs: 0,
        estimatedFileSize: '0 B'
      };
    }
  }
}

// Export singleton instance
export const csvExportService = new CSVExportService();