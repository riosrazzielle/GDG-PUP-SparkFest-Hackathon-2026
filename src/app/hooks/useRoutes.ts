import { useState, useCallback, useEffect } from 'react';
import type { SavedRoute } from '../types';
import { mockPins } from '../mockData';

/* ── Haversine distance between two lat/lng points in metres ── */
function haversineMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

/* 
  Returns the count of hazard pins that fall within `thresholdMetres`
  of any point along the route path polyline.
*/
export function countNearbyPins(
  routePath: { lat: number; lng: number }[],
  thresholdMetres = 500
): number {
  if (routePath.length === 0) return 0;
  return mockPins.filter(pin =>
    routePath.some(point => haversineMetres(pin, point) <= thresholdMetres)
  ).length;
}

export function useRoutes() {
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch routes from API on mount
  useEffect(() => {
    fetch('/api/routes')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch routes');
        return res.json();
      })
      .then(data => {
        setRoutes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const addRoute = useCallback((route: SavedRoute) => {
    fetch('/api/routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(route),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save route');
        return res.json();
      })
      .then(savedRoute => {
        setRoutes(prev => [savedRoute, ...prev]);
      })
      .catch(err => console.error(err));
  }, []);

  const updateRoute = useCallback((id: string, updated: SavedRoute) => {
    setRoutes(prev => prev.map(r => r.id === id ? updated : r));
  }, []);

  const deleteRoute = useCallback((id: string) => {
    fetch(`/api/routes/${id}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete route');
        return res.json();
      })
      .then(() => {
        setRoutes(prev => prev.filter(r => r.id !== id));
      })
      .catch(err => console.error(err));
  }, []);

  return { routes, addRoute, updateRoute, deleteRoute, loading };
}
