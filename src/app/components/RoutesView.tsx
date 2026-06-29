import { useState } from 'react';
import { MapPin, Plus, AlertCircle, ArrowDown, Trash2, Edit2, Map, Clock, Ruler } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SavedRoute } from '../types';

interface Props {
  routes: SavedRoute[];
  onAddRoute: () => void;
  onDeleteRoute: (id: string) => void;
  onEditRoute: (route: SavedRoute) => void;
  onViewOnMap: (route: SavedRoute) => void;
}

function RouteCard({
  route,
  onDelete,
  onEdit,
  onViewOnMap,
}: {
  route: SavedRoute;
  onDelete: () => void;
  onEdit: () => void;
  onViewOnMap: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Route line icon */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-1">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <div className="w-px h-5 bg-gray-200" />
          <MapPin size={11} className="text-gray-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {route.name && (
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">{route.name}</p>
          )}
          <p className="text-[13px] font-bold text-gray-900 truncate">{route.from}</p>
          <div className="flex items-center gap-1 my-0.5">
            <ArrowDown size={10} className="text-gray-400" />
          </div>
          <p className="text-[13px] text-gray-600 truncate">{route.to}</p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Ruler size={10} />{route.distance}
            </span>
            {route.duration && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Clock size={10} />{route.duration}
              </span>
            )}
          </div>

          {/* Hazard badge */}
          {route.nearbyReports > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 border border-red-300 bg-red-50 rounded-full px-3 py-1 text-[11px] font-bold text-red-700">
              <AlertCircle size={11} />
              {route.nearbyReports} Hazard{route.nearbyReports > 1 ? 's' : ''} Nearby
            </div>
          )}

          {/* View on Map button */}
          <button
            onClick={onViewOnMap}
            className="mt-2.5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Map size={12} />
            View on Map
          </button>
        </div>

        {/* 3-dot menu */}
        <div className="flex-shrink-0 relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="text-lg font-bold leading-none tracking-widest">⋯</span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10"
                style={{ minWidth: 140 }}
              >
                <button
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50"
                >
                  <Edit2 size={14} className="text-gray-500" />
                  Edit Route
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete Route
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function RoutesView({ routes, onAddRoute, onDeleteRoute, onEditRoute, onViewOnMap }: Props) {
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
            <MapPin size={36} className="text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">No saved routes yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Tap + to add your first route</p>
          </div>
        ) : (
          <AnimatePresence>
            {routes.map(r => (
              <RouteCard
                key={r.id}
                route={r}
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
