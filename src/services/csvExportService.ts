// src/services/csvExportService.ts - COMPLETE IMPLEMENTATION
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
      csvLines.push(this.formatDataRow(item, config));
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
   * Export user's physical media collection to CSV (used by CollectionToolbar)
   */
  async exportCollectionToCSV(
    userId: string,
    options: CSVExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const config = { ...this.DEFAULT_OPTIONS, ...options };
      
      // Fetch collection data with technical specs
      const collectionData = await this.fetchCollectionData(userId, config.includeTechnicalSpecs);
      
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
   * Fetch collection data from Supabase (for CollectionToolbar usage)
   */
  private async fetchCollectionData(
    userId: string, 
    includeTechnicalSpecs: boolean
  ): Promise<any[]> {
    let query = supabase
      .from('physical_media_collections')
      .select(`
        *,
        ${includeTechnicalSpecs ? `
        bluray_technical_specs:technical_specs_id (
          video_codec,
          video_resolution,
          hdr_format,
          aspect_ratio,
          audio_codecs,
          audio_channels,
          disc_count,
          studio,
          distributor,
          special_features,
          subtitles,
          runtime_minutes,
          upc_code,
          data_quality
        )
        ` : ''}
      `)
      .eq('user_id', userId)
      .order('title', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate CSV content from collection data (for CollectionToolbar usage)
   */
  private generateCSVContent(
    data: any[],
    config: Required<CSVExportOptions>
  ): string {
    const headers = this.getCSVHeaders(config.includeTechnicalSpecs);
    const rows = data.map(item => this.formatDataRow(item, config));
    
    const csvLines: string[] = [];
    
    if (config.includeHeaders) {
      csvLines.push(headers.join(','));
    }
    
    csvLines.push(...rows);
    
    return csvLines.join('\n');
  }

  /**
   * Get CSV headers based on options
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
      baseHeaders.push(
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
      );
    }

    return baseHeaders;
  }

  /**
   * Format a single data row for CSV
   */
  private formatDataRow(
    item: any,
    config: Required<CSVExportOptions>
  ): string {
    const formatDate = (date: string | null) => {
      if (!date) return '';
      
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      
      switch (config.dateFormat) {
        case 'us':
          return d.toLocaleDateString('en-US');
        case 'eu':
          return d.toLocaleDateString('en-GB');
        default: // iso
          return d.toISOString().split('T')[0];
      }
    };

    const formatPrice = (price: number | null) => {
      return price ? `$${price.toFixed(2)}` : '';
    };

    const formatArray = (arr: string[] | null) => {
      return arr && arr.length > 0 ? arr.join('; ') : '';
    };

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatCollectionType = (type: string | null) => {
      const typeMap: { [key: string]: string } = {
        'owned': 'My Collection',
        'wishlist': 'Wishlist',
        'for_sale': 'For Sale',
        'loaned_out': 'Loaned Out',
        'missing': 'Missing'
      };
      return typeMap[type || 'owned'] || 'My Collection';
    };

    const baseFields = [
      escapeCSV(item.title || ''),
      escapeCSV(item.year || ''),
      escapeCSV(item.format || ''),
      escapeCSV(formatCollectionType(item.collection_type)),
      escapeCSV(item.genre || ''),
      escapeCSV(item.director || ''),
      escapeCSV(formatDate(item.purchase_date)),
      escapeCSV(formatPrice(item.purchase_price)),
      escapeCSV(item.purchase_location || ''),
      escapeCSV(item.condition || ''),
      escapeCSV(item.personal_rating || ''),
      escapeCSV(item.notes || ''),
      escapeCSV(item.imdb_id || ''),
      escapeCSV(formatDate(item.created_at)),
      escapeCSV(formatDate(item.updated_at))
    ];

    if (config.includeTechnicalSpecs) {
      const specs = item.bluray_technical_specs;
      baseFields.push(
        escapeCSV(specs?.video_codec || ''),
        escapeCSV(specs?.video_resolution || ''),
        escapeCSV(formatArray(specs?.hdr_format)),
        escapeCSV(specs?.aspect_ratio || ''),
        escapeCSV(formatArray(specs?.audio_codecs)),
        escapeCSV(formatArray(specs?.audio_channels)),
        escapeCSV(specs?.disc_count || ''),
        escapeCSV(specs?.studio || ''),
        escapeCSV(specs?.distributor || ''),
        escapeCSV(formatArray(specs?.special_features)),
        escapeCSV(formatArray(specs?.subtitles)),
        escapeCSV(specs?.runtime_minutes || ''),
        escapeCSV(specs?.upc_code || ''),
        escapeCSV(specs?.data_quality || '')
      );
    }

    return baseFields.join(',');
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
      const { count: totalItems } = await supabase
        .from('physical_media_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: withTechnicalSpecs } = await supabase
        .from('physical_media_collections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('technical_specs_id', 'is', null);

      // Estimate file size (rough calculation)
      const avgRowSize = 500; // bytes per row
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