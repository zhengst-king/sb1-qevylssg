import React from 'react';
import { Globe } from 'lucide-react';
import { useUserRegion, REGIONS } from '../hooks/useUserRegion';

export function RegionSelector() {
  const { region, updateRegion, availableRegions } = useUserRegion();
  
  return (
    <div className="flex items-center space-x-2">
      <Globe className="h-4 w-4 text-slate-500" />
      <select
        value={region}
        onChange={(e) => updateRegion(e.target.value)}
        className="text-sm border border-slate-200 rounded px-2 py-1"
      >
        {Object.entries(availableRegions).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </div>
  );
}