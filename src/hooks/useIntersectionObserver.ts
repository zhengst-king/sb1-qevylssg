// src/hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = true,
  } = options;

  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already visible and should freeze, don't observe again
    if (freezeOnceVisible && isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setIsVisible(isIntersecting);

        // If freezeOnceVisible is true and element is now visible, disconnect
        if (freezeOnceVisible && isIntersecting) {
          observer.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, freezeOnceVisible, isVisible]);

  return [elementRef, isVisible];
}

// Hook for multiple elements
export function useMultipleIntersectionObserver(
  count: number,
  options: UseIntersectionObserverOptions = {}
) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(count).fill(false)
  );
  const elementRefs = useRef<(HTMLElement | null)[]>(
    new Array(count).fill(null)
  );

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    elementRefs.current.forEach((element, index) => {
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleItems((prev) => {
              const newItems = [...prev];
              newItems[index] = true;
              return newItems;
            });

            if (options.freezeOnceVisible !== false) {
              observer.disconnect();
            }
          }
        },
        {
          threshold: options.threshold || 0.1,
          root: options.root || null,
          rootMargin: options.rootMargin || '0px',
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [count, options]);

  const setRef = (index: number) => (element: HTMLElement | null) => {
    elementRefs.current[index] = element;
  };

  return { visibleItems, setRef };
}