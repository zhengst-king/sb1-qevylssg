// src/components/common/OptimizedImage.tsx
import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  webpSrc?: string;
  placeholderSrc?: string;
  lazy?: boolean;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export function OptimizedImage({
  src,
  alt,
  webpSrc,
  placeholderSrc,
  lazy = true,
  aspectRatio,
  objectFit = 'cover',
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, isInView]);

  // Load image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setIsLoaded(true); // Still mark as loaded to remove blur
    };
  }, [isInView, src]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* WebP source if provided */}
      {webpSrc && isInView && (
        <picture>
          <source srcSet={webpSrc} type="image/webp" />
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            loading={lazy ? 'lazy' : 'eager'}
            className={`
              w-full h-full transition-all duration-300
              ${objectFit === 'cover' ? 'object-cover' : ''}
              ${objectFit === 'contain' ? 'object-contain' : ''}
              ${objectFit === 'fill' ? 'object-fill' : ''}
              ${objectFit === 'none' ? 'object-none' : ''}
              ${objectFit === 'scale-down' ? 'object-scale-down' : ''}
              ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}
            `}
            {...props}
          />
        </picture>
      )}

      {/* Regular image */}
      {(!webpSrc || !isInView) && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          className={`
            w-full h-full transition-all duration-300
            ${objectFit === 'cover' ? 'object-cover' : ''}
            ${objectFit === 'contain' ? 'object-contain' : ''}
            ${objectFit === 'fill' ? 'object-fill' : ''}
            ${objectFit === 'none' ? 'object-none' : ''}
            ${objectFit === 'scale-down' ? 'object-scale-down' : ''}
            ${isLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}
          `}
          {...props}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse" />
      )}
    </div>
  );
}

// Utility function to generate placeholder data URL
export function generatePlaceholder(width: number, height: number, color = '#e2e8f0'): string {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Preload critical images
export function preloadImage(src: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

// Batch image preloader
export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve();
          img.onerror = reject;
        })
    )
  );
}