// src/components/CSVImportModal.tsx
import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { omdbApi } from '../lib/omdb';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

interface CSVRow {
  Title: string;
  Year?: string;
  Format?: string;
  'Collection Type'?: string;
  'IMDb ID'?: string;
  Genre?: string;
  Director?: string;
  'Poster URL'?: string;
  'Purchase Date'?: string;
  'Purchase Price'?: string;
  'Purchase Location'?: string;
  Condition?: string;
  'Personal Rating'?: string;
  Notes?: string;
}

interface ProcessedItem {
  title: string;
  year?: number;
  format: string;
  collection_type: string;
  imdb_id?: string;
  genre?: string;
  director?: string;
  poster_url?: string;
  purchase_date?: string;
  purchase_price?: number;
  purchase_location?: string;
  condition: string;
  personal_rating?: number;
  notes?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  notEnriched: Array<{
    title: string;
    year?: number;
    reason: string;
  }>;
}

export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'complete'>('upload');

  if (!isOpen) return null;

  // Generate CSV template for download
  const generateTemplate = () => {
    const templateData = [
      {
        'Title': 'The Matrix',
        'Year': '1999',
        'Format': 'Blu-ray',
        'Collection Type': 'owned',
        'IMDb ID': 'tt0133093',
        'Genre': 'Action, Sci-Fi',
        'Director': 'Lana Wachowski, Lilly Wachowski',
        'Poster URL': '',
        'Purchase Date': '2023-12-15',
        'Purchase Price': '19.99',
        'Purchase Location': 'Best Buy',
        'Condition': 'New',
        'Personal Rating': '9',
        'Notes': 'Criterion Collection edition'
      },
      {
        'Title': 'Inception',
        'Year': '2010',
        'Format': '4K UHD',
        'Collection Type': 'wishlist',
        'IMDb ID': 'tt1375666',
        'Genre': 'Action, Drama, Sci-Fi',
        'Director': 'Christopher Nolan',
        'Poster URL': '',
        'Purchase Date': '',
        'Purchase Price': '',
        'Purchase Location': '',
        'Condition': 'New',
        'Personal Rating': '',
        'Notes': 'Want the 4K version'
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'physical-media-import-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Validate CSV data
  const validateCSVData = (data: CSVRow[]): { valid: CSVRow[]; errors: string[] } => {
    const valid: CSVRow[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 for 1-based indexing and header row
      
      if (!row.Title?.trim()) {
        errors.push(`Row ${rowNum}: Title is required`);
        return;
      }

      // Validate format if provided
      if (row.Format && !['DVD', 'Blu-ray', '4K UHD', '3D Blu-ray'].includes(row.Format)) {
        errors.push(`Row ${rowNum}: Invalid format "${row.Format}". Must be: DVD, Blu-ray, 4K UHD, or 3D Blu-ray`);
        return;
      }

      // Validate collection type if provided
      if (row['Collection Type'] && !['owned', 'wishlist', 'loaned'].includes(row['Collection Type'])) {
        errors.push(`Row ${rowNum}: Invalid collection type "${row['Collection Type']}". Must be: owned, wishlist, or loaned`);
        return;
      }

      // Validate condition if provided
      if (row.Condition && !['New', 'Like New', 'Good', 'Fair', 'Poor'].includes(row.Condition)) {
        errors.push(`Row ${rowNum}: Invalid condition "${row.Condition}". Must be: New, Like New, Good, Fair, or Poor`);
        return;
      }

      // Validate rating if provided
      if (row['Personal Rating']) {
        const rating = parseInt(row['Personal Rating']);
        if (isNaN(rating) || rating < 1 || rating > 10) {
          errors.push(`Row ${rowNum}: Personal Rating must be a number between 1-10`);
          return;
        }
      }

      valid.push(row);
    });

    return { valid, errors };
  };

  // Enrich data with OMDb API - Enhanced with title search
  const enrichWithOMDb = async (item: CSVRow): Promise<{
    enrichedData: Partial<ProcessedItem>;
    enrichmentStatus: 'success' | 'not_found' | 'error' | 'skipped';
    errorMessage?: string;
  }> => {
    // If IMDb ID provided, use direct lookup
    if (item['IMDb ID']?.trim()) {
      try {
        const details = await omdbApi.getMovieDetails(item['IMDb ID'].trim());
        if (details && details.Response === 'True') {
          return {
            enrichedData: {
              genre: details.Genre !== 'N/A' ? details.Genre : item.Genre,
              director: details.Director !== 'N/A' ? details.Director : item.Director,
              poster_url: details.Poster !== 'N/A' ? details.Poster : item['Poster URL'],
              year: details.Year !== 'N/A' ? parseInt(details.Year) : undefined
            },
            enrichmentStatus: 'success'
          };
        } else {
          return {
            enrichedData: {},
            enrichmentStatus: 'not_found',
            errorMessage: `IMDb ID "${item['IMDb ID']}" not found`
          };
        }
      } catch (error) {
        return {
          enrichedData: {},
          enrichmentStatus: 'error',
          errorMessage: `API error for IMDb ID "${item['IMDb ID']}"`
        };
      }
    }

    // If no IMDb ID but title provided, try title search
    if (item.Title?.trim()) {
      try {
        const searchQuery = item.Year 
          ? `${item.Title.trim()} ${item.Year}`
          : item.Title.trim();
        
        const searchResults = await omdbApi.searchMovies(searchQuery);
        
        if (searchResults && searchResults.Response === 'True' && searchResults.Search?.length > 0) {
          // Get details for the first (best) match
          const firstResult = searchResults.Search[0];
          const details = await omdbApi.getMovieDetails(firstResult.imdbID);
          
          if (details && details.Response === 'True') {
            return {
              enrichedData: {
                genre: details.Genre !== 'N/A' ? details.Genre : item.Genre,
                director: details.Director !== 'N/A' ? details.Director : item.Director,
                poster_url: details.Poster !== 'N/A' ? details.Poster : item['Poster URL'],
                year: details.Year !== 'N/A' ? parseInt(details.Year) : undefined,
                imdb_id: details.imdbID !== 'N/A' ? details.imdbID : undefined
              },
              enrichmentStatus: 'success'
            };
          }
        }
        
        return {
          enrichedData: {},
          enrichmentStatus: 'not_found',
          errorMessage: `No IMDb match found for "${item.Title}"${item.Year ? ` (${item.Year})` : ''}`
        };
      } catch (error) {
        return {
          enrichedData: {},
          enrichmentStatus: 'error',
          errorMessage: `Search error for "${item.Title}"`
        };
      }
    }

    // No title or IMDb ID provided
    return {
      enrichedData: {},
      enrichmentStatus: 'skipped',
      errorMessage: 'No title or IMDb ID provided'
    };
  };

  // Check for existing items in collection
  const checkForDuplicates = async (items: ProcessedItem[]) => {
    if (!user) return [];

    try {
      const titles = items.map(item => item.title);
      const { data: existingItems } = await supabase
        .from('physical_media_collections')
        .select('title, format')
        .eq('user_id', user.id)
        .in('title', titles);

      return existingItems || [];
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    }
  };

  // Process CSV file - Enhanced with better error handling
  const processCSV = async (data: CSVRow[]) => {
    if (!user) throw new Error('User not authenticated');

    const { valid, errors } = validateCSVData(data);
    
    if (valid.length === 0) {
      throw new Error('No valid rows found in CSV');
    }

    const processedItems: ProcessedItem[] = [];
    const processingErrors: string[] = [...errors];
    const notEnrichedItems: Array<{ title: string; year?: number; reason: string }> = [];

    setCurrentStep('processing');

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      
      try {
        // Try to enrich with OMDb data
        const { enrichedData, enrichmentStatus, errorMessage } = await enrichWithOMDb(row);

        // Track items that couldn't be enriched
        if (enrichmentStatus === 'not_found' || enrichmentStatus === 'error') {
          notEnrichedItems.push({
            title: row.Title.trim(),
            year: row.Year ? parseInt(row.Year) : undefined,
            reason: errorMessage || 'Unknown error'
          });
        }

        // Create processed item regardless of enrichment status
        const processedItem: ProcessedItem = {
          title: row.Title.trim(),
          year: row.Year ? parseInt(row.Year) : enrichedData.year,
          format: row.Format || 'DVD',
          collection_type: row['Collection Type'] || 'owned',
          imdb_id: row['IMDb ID']?.trim() || enrichedData.imdb_id,
          genre: enrichedData.genre || row.Genre,
          director: enrichedData.director || row.Director,
          poster_url: enrichedData.poster_url || row['Poster URL'],
          purchase_date: row['Purchase Date']?.trim(),
          purchase_price: row['Purchase Price'] ? parseFloat(row['Purchase Price']) : undefined,
          purchase_location: row['Purchase Location']?.trim(),
          condition: row.Condition || 'New',
          personal_rating: row['Personal Rating'] ? parseInt(row['Personal Rating']) : undefined,
          notes: row.Notes?.trim()
        };

        processedItems.push(processedItem);
      } catch (error) {
        processingErrors.push(`Row ${i + 2}: Failed to process - ${error}`);
      }
    }

    // Check for duplicates before saving
    const existingTitles = await checkForDuplicates(processedItems);
    const uniqueItems = processedItems.filter(item => 
      !existingTitles.some(existing => 
        existing.title.toLowerCase() === item.title.toLowerCase() && 
        existing.format === item.format
      )
    );

    if (uniqueItems.length === 0) {
      throw new Error('All items already exist in your collection');
    }

    // Save to database
    const itemsToInsert = uniqueItems.map(item => ({
      user_id: user.id,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertedData, error } = await supabase
      .from('physical_media_collections')
      .insert(itemsToInsert)
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Add duplicate warnings to processing errors
    const duplicatesSkipped = processedItems.length - uniqueItems.length;
    if (duplicatesSkipped > 0) {
      processingErrors.push(`${duplicatesSkipped} items skipped (already in collection)`);
    }

    return {
      success: insertedData?.length || 0,
      failed: processingErrors.length,
      errors: processingErrors,
      notEnriched: notEnrichedItems
    };
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            if (results.errors.length > 0) {
              throw new Error(`CSV parsing error: ${results.errors[0].message}`);
            }

            const result = await processCSV(results.data as CSVRow[]);
            setImportResult(result);
            setCurrentStep('complete');
            
            if (result.success > 0) {
              onSuccess(result.success);
            }
          } catch (error) {
            alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          alert(`CSV parsing failed: ${error.message}`);
          setIsProcessing(false);
        }
      });
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current?.files?.[0]) {
      handleFileUpload(fileInputRef.current.files[0]);
    }
  };

  const handleClose = () => {
    setCurrentStep('upload');
    setImportResult(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Import Collection from CSV</h2>
            <p className="text-sm text-slate-600 mt-1">
              Import your movie collection from IMDb, Letterboxd, or custom CSV files
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">Download CSV Template</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Use our template to format your data correctly before importing.
                    </p>
                    <button
                      onClick={generateTemplate}
                      className="inline-flex items-center space-x-2 mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Template</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Upload your CSV file
                </h3>
                <p className="text-slate-600 mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <button className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                  <FileText className="h-4 w-4" />
                  <span>Choose File</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Supported Formats */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-2">Supported CSV Sources:</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• <strong>IMDb:</strong> Export from "Your Ratings" → three dots → Export</li>
                  <li>• <strong>Letterboxd:</strong> Account export from Settings → Download ZIP</li>
                  <li>• <strong>Custom CSV:</strong> Use our template format</li>
                  <li>• <strong>Excel files:</strong> Save as CSV format first</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Processing */}
          {currentStep === 'processing' && (
            <div className="text-center py-8">
              <Loader className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Processing Import...</h3>
              <p className="text-slate-600">
                Validating data and enriching with movie details
              </p>
            </div>
          )}

          {/* Step 3: Complete */}
          {currentStep === 'complete' && importResult && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Import Complete!</h3>
              </div>

              {/* Results Summary */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                    <div className="text-sm text-slate-600">Items Imported</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{importResult.notEnriched.length}</div>
                    <div className="text-sm text-slate-600">Not Enriched</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-slate-600">Errors</div>
                  </div>
                </div>
              </div>

              {/* Items Not Enriched with IMDb Data */}
              {importResult.notEnriched.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-orange-900 mb-2">
                        Items Imported Without IMDb Enhancement ({importResult.notEnriched.length})
                      </h4>
                      <p className="text-sm text-orange-800 mb-3">
                        These titles were imported with your CSV data but couldn't be matched with IMDb. 
                        Check spelling or add IMDb IDs for better metadata.
                      </p>
                      <div className="max-h-32 overflow-y-auto">
                        <ul className="text-sm text-orange-700 space-y-1">
                          {importResult.notEnriched.slice(0, 10).map((item, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="font-medium">•</span>
                              <div>
                                <span className="font-medium">{item.title}</span>
                                {item.year && <span className="text-orange-600"> ({item.year})</span>}
                                <div className="text-xs text-orange-600">{item.reason}</div>
                              </div>
                            </li>
                          ))}
                          {importResult.notEnriched.length > 10 && (
                            <li className="font-medium text-orange-600">
                              ... and {importResult.notEnriched.length - 10} more items
                            </li>
                          )}
                        </ul>
                      </div>
                      {importResult.notEnriched.length > 5 && (
                        <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                          💡 <strong>Tip:</strong> You can edit these items later to add IMDb IDs for automatic poster and metadata updates.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Errors */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Import Issues ({importResult.failed})</h4>
                      <ul className="text-sm text-red-700 mt-2 space-y-1">
                        {importResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li className="font-medium">... and {importResult.errors.length - 5} more issues</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importResult.success > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-green-700">
                        <strong>Success!</strong> {importResult.success} items have been added to your collection.
                        {importResult.notEnriched.length > 0 && (
                          <> You can edit the non-enriched items later to add more details.</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}