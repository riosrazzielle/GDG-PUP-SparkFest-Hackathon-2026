import { useState } from 'react';
import { MapPin as MapPinIcon, Plus, AlertCircle, ArrowDown, Trash2, Edit2, Map, Clock, Ruler, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SavedRoute, MapPin } from '../types';
import { countNearbyPins } from '../hooks/useRoutes';

interface Props {
  routes: SavedRoute[];
  pins: MapPin[];
  onAddRoute: () => void;
  onDeleteRoute: (id: string) => void;
  onEditRoute: (route: SavedRoute) => void;
  onViewOnMap: (route: SavedRoute) => void;
}

/* ── Haversine helper to find exact nearby pins ── */
function getDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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

function RouteCard({
  route,
  pins,
  onDelete,
  onEdit,
  onViewOnMap,
}: {
  route: SavedRoute;
  pins: MapPin[];
  onDelete: () => void;
  onEdit: () => void;
  onViewOnMap: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hazardsListOpen, setHazardsListOpen] = useState(false);

  // Find actual nearby pins
  const nearbyPins = pins.filter(pin =>
    (route.routePath ?? []).some(point => getDistance(pin, point) <= 500)
  );
  const nearbyCount = nearbyPins.length;

  const MODE_LABELS: Record<string, string> = {
    DRIVING: '🚗 Car',
    MOTOR: '🛵 Motor',
    TRANSIT: '🚌 Transit',
    WALKING: '🚶 Walk',
  };
  const modeLabel = MODE_LABELS[route.travelMode ?? 'DRIVING'] ?? '🚗 Car';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Content — name and addresses */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {route.name && (
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">{route.name}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                {modeLabel}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                <Ruler size={9} />{route.distance}
              </span>
              {route.duration && (
                <span className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Clock size={9} />{route.duration}
                </span>
              )}
            </div>
          </div>

          {/* Addresses timeline */}
          <div className="relative pl-5 space-y-2.5 mt-2">
            {/* Vertical connecting line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-[1px] bg-gray-200" />

            {/* Starting Point */}
            <div className="relative flex items-center">
              <div className="absolute -left-[19px] w-2.5 h-2.5 rounded-full border border-green-500 bg-white flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-green-500" />
              </div>
              <p className="text-[13px] text-gray-600 truncate">{route.from}</p>
            </div>

            {/* Destination */}
            <div className="relative flex items-center">
              <div className="absolute -left-[19px] w-2.5 h-2.5 rounded-full border border-blue-600 bg-white flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-600" />
              </div>
              <p className="text-[13px] text-gray-600 truncate">{route.to}</p>
            </div>
          </div>
        </div>

        {/* Right column: Inline Action Buttons (Eye, Edit, Delete) + Hazard badge */}
        <div className="flex-shrink-0 flex flex-col items-end gap-3 justify-start">
          {/* Action buttons row */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onViewOnMap}
              title="View on Map"
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={onEdit}
              title="Edit Route"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={onDelete}
              title="Delete Route"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Hazard badge (clickable dropdown toggle) */}
          {nearbyCount > 0 ? (
            <button
              onClick={() => setHazardsListOpen(v => !v)}
              className="inline-flex items-center gap-1 border border-red-200 bg-red-50 hover:bg-red-100 rounded-full px-2.5 py-1 text-[10px] font-bold text-red-700 cursor-pointer transition-colors"
            >
              <AlertCircle size={10} />
              {nearbyCount} Hazard{nearbyCount > 1 ? 's' : ''}
              {hazardsListOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 border border-green-200 bg-green-50 rounded-full px-2.5 py-1 text-[10px] font-bold text-green-700 whitespace-nowrap">
              <AlertCircle size={10} />
              Clear
            </div>
          )}
        </div>
      </div>

      {/* Expanded Hazards Preview List — Rendered full-width at the bottom of the card */}
      <AnimatePresence>
        {hazardsListOpen && nearbyPins.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3.5 pt-3.5 border-t border-gray-100 space-y-1.5 overflow-hidden"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hazards on Route:</p>
            <div className="space-y-1.5">
              {nearbyPins.map(pin => (
                <div key={pin.id} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-900">{pin.title}</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">({pin.address || 'nearby'})</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function RoutesView({ routes, pins, onAddRoute, onDeleteRoute, onEditRoute, onViewOnMap }: Props) {
  return (
    <div className="absolute inset-0 bg-gray-50 z-40 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-[20px] font-extrabold text-gray-900">Saved Routes</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">{routes.length} route{routes.length !== 1 ? 's' : ''} saved</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {routes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <MapPinIcon size={36} className="text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">No saved routes yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Tap + to add your first route</p>
          </div>
        ) : (
          <AnimatePresence>
            {routes.map(r => (
              <RouteCard
                key={r.id}
                route={r}
                pins={pins}
                onDelete={() => onDeleteRoute(r.id)}
                onEdit={() => onEditRoute(r)}
                onViewOnMap={() => onViewOnMap(r)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAddRoute}
        className="group absolute bottom-6 right-5 h-14 w-14 hover:w-auto hover:px-5 bg-black text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ease-in-out active:scale-95 cursor-pointer overflow-hidden"
      >
        <span className="font-extrabold text-[13px] tracking-wide whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:mr-1.5 transition-all duration-300 ease-in-out">
          Add New Route
        </span>
        <Plus size={20} className="flex-shrink-0" />
      </button>
    </div>
  );
}
