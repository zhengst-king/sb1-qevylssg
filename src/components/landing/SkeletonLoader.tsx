// src/components/landing/SkeletonLoader.tsx
import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export function SkeletonLoader({
  variant = 'rectangular',
  width = '100%',
  height = '20px',
  className = '',
  count = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const Skeleton = () => (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );

  if (count === 1) {
    return <Skeleton />;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </div>
  );
}

// Predefined skeleton layouts
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg space-y-4">
      <SkeletonLoader variant="rectangular" width="60px" height="60px" />
      <SkeletonLoader variant="text" width="80%" height="24px" />
      <SkeletonLoader variant="text" count={3} />
      <SkeletonLoader variant="rectangular" width="120px" height="40px" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="space-y-6 text-center max-w-3xl mx-auto">
      <SkeletonLoader variant="text" width="80%" height="48px" className="mx-auto" />
      <SkeletonLoader variant="text" width="60%" height="48px" className="mx-auto" />
      <SkeletonLoader variant="text" width="70%" height="24px" className="mx-auto" />
      <div className="flex gap-4 justify-center mt-8">
        <SkeletonLoader variant="rectangular" width="150px" height="50px" />
        <SkeletonLoader variant="rectangular" width="150px" height="50px" />
      </div>
    </div>
  );
}

export function TestimonialSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg space-y-4">
      <div className="flex items-center space-x-3">
        <SkeletonLoader variant="circular" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="60%" height="16px" />
          <SkeletonLoader variant="text" width="40%" height="14px" />
        </div>
      </div>
      <SkeletonLoader variant="text" count={4} />
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonLoader key={i} variant="rectangular" width="20px" height="20px" />
        ))}
      </div>
    </div>
  );
}

export function PricingCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg space-y-6">
      <SkeletonLoader variant="text" width="40%" height="24px" />
      <div className="space-y-2">
        <SkeletonLoader variant="text" width="60%" height="48px" />
        <SkeletonLoader variant="text" width="80%" height="16px" />
      </div>
      <SkeletonLoader variant="rectangular" width="100%" height="48px" />
      <div className="space-y-3 pt-6 border-t">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <SkeletonLoader variant="circular" width="20px" height="20px" />
            <SkeletonLoader variant="text" width="70%" height="16px" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureSkeleton() {
  return (
    <div className="flex items-start space-x-6">
      <SkeletonLoader variant="rectangular" width="80px" height="80px" />
      <div className="flex-1 space-y-3">
        <SkeletonLoader variant="text" width="60%" height="28px" />
        <SkeletonLoader variant="text" count={3} />
      </div>
    </div>
  );
}

// Loading overlay for entire sections
export function SectionLoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  );
}

// Shimmer effect for images
export function ImageSkeleton({ aspectRatio = '16/9' }: { aspectRatio?: string }) {
  return (
    <div
      className="bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse rounded-lg"
      style={{ aspectRatio }}
    />
  );
}