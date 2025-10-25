// src/components/landing/SEOHead.tsx
import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
}

export function SEOHead({
  title = 'Tagflix - Smart Movie & TV Show Watchlist Management',
  description = 'Discover, track, and organize your favorite movies and TV shows with intelligent recommendations, custom collections, and personalized analytics. Your ultimate entertainment companion.',
  canonicalUrl = 'https://tagflix.com',
  ogImage = 'https://tagflix.com/og-image.jpg',
  ogType = 'website'
}: SEOHeadProps) {
  
  useEffect(() => {
    // Update meta tags dynamically
    document.title = title;
    
    // Update or create meta tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
      }
      if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', 'movie watchlist, tv shows, streaming guide, movie tracker, watchlist app, entertainment, recommendations');
    updateMetaTag('author', 'Tagflix');
    updateMetaTag('robots', 'index, follow');

    // Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', canonicalUrl);
    updateMetaTag('og:type', ogType);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:site_name', 'Tagflix');
    updateMetaTag('og:locale', 'en_US');

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);
    updateMetaTag('twitter:creator', '@tagflix');
    updateMetaTag('twitter:site', '@tagflix');

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

  }, [title, description, canonicalUrl, ogImage, ogType]);

  return null; // This is a meta-only component
}

// Structured Data Component for JSON-LD
interface StructuredDataProps {
  type: 'WebApplication' | 'Organization' | 'WebSite';
  data: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    // Remove existing structured data scripts
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => {
      if (script.textContent?.includes(`"@type": "${type}"`)) {
        script.remove();
      }
    });

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [type, data]);

  return null;
}

// Pre-configured structured data for the app
export function AppStructuredData() {
  const webAppData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Tagflix",
    "description": "Smart movie and TV show watchlist management application with intelligent recommendations and personalized analytics.",
    "url": "https://tagflix.com",
    "applicationCategory": "EntertainmentApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250",
      "bestRating": "5",
      "worstRating": "1"
    },
    "featureList": [
      "Smart movie recommendations",
      "Custom watchlist collections",
      "TV series tracking",
      "Cast and crew exploration",
      "Personalized analytics",
      "Cross-device sync",
      "Advanced search and filtering"
    ],
    "screenshot": [
      "https://tagflix.com/screenshots/dashboard.jpg",
      "https://tagflix.com/screenshots/recommendations.jpg",
      "https://tagflix.com/screenshots/collections.jpg"
    ],
    "softwareVersion": "1.0",
    "inLanguage": "en-US",
    "browserRequirements": "Requires JavaScript. Requires HTML5."
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Tagflix",
    "url": "https://tagflix.com",
    "logo": "https://tagflix.com/logo.png",
    "description": "Provider of intelligent movie and TV show management solutions.",
    "sameAs": [
      "https://twitter.com/tagflix",
      "https://facebook.com/tagflix",
      "https://instagram.com/tagflix"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "support@tagflix.com",
      "availableLanguage": "English"
    }
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Tagflix",
    "url": "https://tagflix.com",
    "description": "Smart movie and TV show watchlist management",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://tagflix.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <StructuredData type="WebApplication" data={webAppData} />
      <StructuredData type="Organization" data={organizationData} />
      <StructuredData type="WebSite" data={websiteData} />
    </>
  );
}