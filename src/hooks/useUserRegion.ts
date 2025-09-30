import { useState, useEffect } from 'react';

const REGION_STORAGE_KEY = 'user_preferred_region';

// Common regions with names
export const REGIONS = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  BR: 'Brazil',
  MX: 'Mexico',
  IN: 'India'
};

export function useUserRegion() {
  const [region, setRegion] = useState<string>('US');
  
  useEffect(() => {
    // Try to get from localStorage
    const stored = localStorage.getItem(REGION_STORAGE_KEY);
    if (stored && REGIONS[stored as keyof typeof REGIONS]) {
      setRegion(stored);
      return;
    }
    
    // Auto-detect using browser/IP geolocation
    detectUserRegion().then(detected => {
      if (detected) setRegion(detected);
    });
  }, []);
  
  const updateRegion = (newRegion: string) => {
    setRegion(newRegion);
    localStorage.setItem(REGION_STORAGE_KEY, newRegion);
  };
  
  return { region, updateRegion, availableRegions: REGIONS };
}

async function detectUserRegion(): Promise<string | null> {
  try {
    // Use free IP geolocation API
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || 'US';
  } catch {
    return 'US'; // Default fallback
  }
}