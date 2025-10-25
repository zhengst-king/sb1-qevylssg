// src/utils/analytics.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Types
export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export interface AnalyticsConfig {
  trackingId: string;
  enabled: boolean;
  debug?: boolean;
}

// Analytics utility class
class Analytics {
  private config: AnalyticsConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = {
      trackingId: import.meta.env.VITE_GA_TRACKING_ID || '',
      enabled: import.meta.env.PROD,
      debug: import.meta.env.DEV
    };
  }

  // Initialize Google Analytics
  initialize() {
    if (this.initialized || !this.config.trackingId || !this.config.enabled) {
      return;
    }

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.trackingId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', this.config.trackingId, {
      send_page_view: false, // We'll handle this manually
      anonymize_ip: true // GDPR compliance
    });

    this.initialized = true;

    if (this.config.debug) {
      console.log('Analytics initialized with tracking ID:', this.config.trackingId);
    }
  }

  // Track page view
  pageView(path: string, title?: string) {
    if (!this.config.enabled || !window.gtag) {
      if (this.config.debug) {
        console.log('Analytics pageView:', { path, title });
      }
      return;
    }

    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title || document.title
    });
  }

  // Track custom event
  event({ category, action, label, value }: AnalyticsEvent) {
    if (!this.config.enabled || !window.gtag) {
      if (this.config.debug) {
        console.log('Analytics event:', { category, action, label, value });
      }
      return;
    }

    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }

  // Track user signup
  trackSignup(method: string) {
    this.event({
      category: 'User',
      action: 'signup',
      label: method
    });
  }

  // Track user login
  trackLogin(method: string) {
    this.event({
      category: 'User',
      action: 'login',
      label: method
    });
  }

  // Track CTA clicks
  trackCTAClick(location: string, ctaText: string) {
    this.event({
      category: 'CTA',
      action: 'click',
      label: `${location} - ${ctaText}`
    });
  }

  // Track feature interaction
  trackFeatureUse(featureName: string, action: string) {
    this.event({
      category: 'Feature',
      action: action,
      label: featureName
    });
  }

  // Track outbound link clicks
  trackOutboundLink(url: string) {
    this.event({
      category: 'Outbound',
      action: 'click',
      label: url
    });
  }

  // Track video play
  trackVideoPlay(videoTitle: string) {
    this.event({
      category: 'Video',
      action: 'play',
      label: videoTitle
    });
  }

  // Track search
  trackSearch(query: string, resultsCount?: number) {
    this.event({
      category: 'Search',
      action: 'query',
      label: query,
      value: resultsCount
    });
  }

  // Track form submission
  trackFormSubmit(formName: string, success: boolean) {
    this.event({
      category: 'Form',
      action: success ? 'submit_success' : 'submit_error',
      label: formName
    });
  }

  // Track timing (e.g., page load time)
  trackTiming(category: string, variable: string, time: number) {
    if (!this.config.enabled || !window.gtag) {
      return;
    }

    window.gtag('event', 'timing_complete', {
      name: variable,
      value: time,
      event_category: category
    });
  }
}

// Export singleton instance
export const analytics = new Analytics();

// React hook for automatic page view tracking
export function useAnalytics() {
  const location = useLocation();

  useEffect(() => {
    analytics.initialize();
  }, []);

  useEffect(() => {
    analytics.pageView(location.pathname + location.search);
  }, [location]);

  return analytics;
}

// Higher-order component for analytics initialization
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AnalyticsWrapper(props: P) {
    useAnalytics();
    return <Component {...props} />;
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Track page load time
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (loadTime > 0) {
        analytics.trackTiming('Page Load', 'load_time', loadTime);
      }
    }

    // Track First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              analytics.trackTiming('Performance', 'fcp', entry.startTime);
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Silently fail if observer not supported
      }
    }
  }, []);
}

// TypeScript declarations
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export default analytics;