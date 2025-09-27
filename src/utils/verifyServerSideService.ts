// src/utils/verifyServerSideService.ts
// FIXED VERSION - Replace your existing file with this

import { serverSideEpisodeService } from '../services/serverSideEpisodeService';

export class ServerSideServiceVerification {
  
  /**
   * Run all verification tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Server-Side Episode Service Verification...\n');

    // Fixed: Use proper static method references
    const tests = [
      ServerSideServiceVerification.testServiceInitialization,
      ServerSideServiceVerification.testDatabaseConnectivity,
      ServerSideServiceVerification.testQueueManagement,
      ServerSideServiceVerification.testSeriesStatusChecking,
      ServerSideServiceVerification.testCacheOperations,
      ServerSideServiceVerification.testSmartTTLCalculation,
      ServerSideServiceVerification.testErrorHandling
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      try {
        await test();
        passedTests++;
        console.log('✅ PASSED\n');
      } catch (error) {
        console.log('❌ FAILED:', error instanceof Error ? error.message : error, '\n');
      }
    }

    console.log(`\n📊 VERIFICATION SUMMARY:`);
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Server-side service is ready.');
      console.log('➡️  Ready for Step 3: Update TV Series Card Component');
    } else {
      console.log('⚠️  Some tests failed. Please check the issues above.');
    }
  }

  /**
   * Test 1: Service Initialization
   */
  static async testServiceInitialization(): Promise<void> {
    console.log('🧪 Test 1: Service Initialization');
    
    // Check if service exists and has expected methods
    if (!serverSideEpisodeService) {
      throw new Error('Service not initialized');
    }

    const expectedMethods = [
      'getSeasonEpisodes',
      'getTotalSeasons', 
      'getTotalEpisodesCount',
      'isSeriesBeingFetched',
      'getSeriesStatus',
      'addSeriesToQueue',
      'forceRefreshSeries',
      'getQueueStatus',
      'clearAll'
    ];

    for (const method of expectedMethods) {
      if (typeof (serverSideEpisodeService as any)[method] !== 'function') {
        throw new Error(`Missing method: ${method}`);
      }
    }

    console.log('Service initialized with all required methods');
  }

  /**
   * Test 2: Database Connectivity
   */
  static async testDatabaseConnectivity(): Promise<void> {
    console.log('🧪 Test 2: Database Connectivity');
    
    try {
      // Test basic database query
      const queueStatus = await serverSideEpisodeService.getQueueStatus();
      
      if (typeof queueStatus.queueLength !== 'number') {
        throw new Error('Invalid queue status response');
      }

      console.log(`Database connected. Queue length: ${queueStatus.queueLength}`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Test 3: Queue Management
   */
  static async testQueueManagement(): Promise<void> {
    console.log('🧪 Test 3: Queue Management');

    const testSeriesId = 'tt_test_queue_' + Date.now();
    const testSeriesTitle = 'Test Series for Queue';

    try {
      // Test adding to queue
      await serverSideEpisodeService.addSeriesToQueue(testSeriesId, testSeriesTitle, 'high');
      console.log('Series added to queue successfully');

      // Test queue status
      const queueStatus = await serverSideEpisodeService.getQueueStatus();
      console.log(`Queue status: ${queueStatus.queueLength} items, processing: ${queueStatus.isProcessing}`);

      // Clean up test data
      await ServerSideServiceVerification.cleanupTestData(testSeriesId);

    } catch (error) {
      throw new Error(`Queue management test failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Test 4: Series Status Checking
   */
  static async testSeriesStatusChecking(): Promise<void> {
    console.log('🧪 Test 4: Series Status Checking');

    const testSeriesId = 'tt_test_status_' + Date.now();

    try {
      // Test status for non-existent series
      const status = await serverSideEpisodeService.getSeriesStatus(testSeriesId);
      
      if (typeof status.cached !== 'boolean' ||
          typeof status.totalSeasons !== 'number' ||
          typeof status.totalEpisodes !== 'number' ||
          typeof status.isBeingFetched !== 'boolean') {
        throw new Error('Invalid status response structure');
      }

      // For non-existent series, should return default values
      if (status.cached !== false || 
          status.totalSeasons !== 0 || 
          status.totalEpisodes !== 0) {
        throw new Error('Non-existent series should return default status');
      }

      console.log('Series status checking works correctly');

    } catch (error) {
      throw new Error(`Series status test failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Test 5: Cache Operations
   */
  static async testCacheOperations(): Promise<void> {
    console.log('🧪 Test 5: Cache Operations');

    const testSeriesId = 'tt_test_cache_' + Date.now();

    try {
      // Test getting episodes from empty cache
      const episodes = await serverSideEpisodeService.getSeasonEpisodes(testSeriesId, 1);
      
      if (episodes !== null) {
        throw new Error('Empty cache should return null for episodes');
      }

      // Test total seasons/episodes for non-existent series
      const totalSeasons = await serverSideEpisodeService.getTotalSeasons(testSeriesId);
      const totalEpisodes = await serverSideEpisodeService.getTotalEpisodesCount(testSeriesId);

      if (totalSeasons !== 0 || totalEpisodes !== 0) {
        throw new Error('Non-existent series should return 0 for totals');
      }

      console.log('Cache operations handle empty cache correctly');

    } catch (error) {
      throw new Error(`Cache operations test failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Test 6: Smart TTL Calculation
   */
  static async testSmartTTLCalculation(): Promise<void> {
    console.log('🧪 Test 6: Smart TTL Calculation');

    try {
      // Import supabase to test the TTL function directly
      const { supabase } = await import('../lib/supabase');

      // Test TTL calculation function
      const { data: ttl1, error: error1 } = await supabase
        .rpc('calculate_smart_ttl', { rating: 9.0 });

      const { data: ttl2, error: error2 } = await supabase
        .rpc('calculate_smart_ttl', { rating: 7.0 });

      const { data: ttl3, error: error3 } = await supabase
        .rpc('calculate_smart_ttl', { rating: 5.0 });

      const { data: ttl4, error: error4 } = await supabase
        .rpc('calculate_smart_ttl', { rating: 3.0 });

      if (error1 || error2 || error3 || error4) {
        throw new Error('TTL calculation function not working');
      }

      if (ttl1 !== 28 || ttl2 !== 21 || ttl3 !== 14 || ttl4 !== 7) {
        throw new Error(`TTL calculation incorrect. Expected: 28,21,14,7 Got: ${ttl1},${ttl2},${ttl3},${ttl4}`);
      }

      console.log('Smart TTL calculation working correctly (28/21/14/7 days)');

    } catch (error) {
      throw new Error(`Smart TTL test failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Test 7: Error Handling
   */
  static async testErrorHandling(): Promise<void> {
    console.log('🧪 Test 7: Error Handling');

    try {
      // Test with invalid IMDb ID
      const invalidId = 'invalid_imdb_id_12345';
      
      // These should not throw errors but handle gracefully
      const status = await serverSideEpisodeService.getSeriesStatus(invalidId);
      const episodes = await serverSideEpisodeService.getSeasonEpisodes(invalidId, 1);
      const totalSeasons = await serverSideEpisodeService.getTotalSeasons(invalidId);
      const isBeingFetched = await serverSideEpisodeService.isSeriesBeingFetched(invalidId);

      // Verify graceful handling
      if (status.cached !== false || episodes !== null || totalSeasons !== 0 || isBeingFetched !== false) {
        throw new Error('Error handling not working correctly');
      }

      console.log('Error handling works gracefully');

    } catch (error) {
      throw new Error(`Error handling test failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Helper: Clean up test data
   */
  private static async cleanupTestData(seriesId: string): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabase');
      
      // Clean up any test data
      await supabase.from('episodes_cache').delete().eq('imdb_id', seriesId);
      await supabase.from('series_episode_counts').delete().eq('imdb_id', seriesId);
      await supabase.from('episode_discovery_queue').delete().eq('series_imdb_id', seriesId);
      
    } catch (error) {
      console.warn('Could not clean up test data:', error);
    }
  }
}

// Export for easy testing
export const runVerification = ServerSideServiceVerification.runAllTests;