import { MapPin, MoreHorizontal, Plus, AlertCircle, ArrowDown } from 'lucide-react';
import type { SavedRoute } from '../types';

interface Props {
  routes: SavedRoute[];
  onAddRoute: () => void;
}

function RouteCard({ route }: { route: SavedRoute }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3.5 mb-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <MapPin size={20} className="text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-gray-900 truncate">{route.from}</p>
          <div className="flex items-center gap-1 my-0.5">
            <ArrowDown size={10} className="text-gray-400" />
          </div>
          <p className="text-[13px] text-gray-600 truncate">{route.to}</p>
          <p className="text-[11px] text-gray-400 mt-1">
            {route.distance} · Last edited {route.lastEdited}
          </p>
          {route.nearbyReports > 0 && (
            <button className="mt-2 flex items-center gap-1.5 border border-black rounded-full px-3 py-1 text-[11px] font-bold text-black">
              <AlertCircle size={11} />
              {route.nearbyReports} New Reports Nearby
            </button>
          )}
        </div>
        <button className="text-gray-400 flex-shrink-0">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

export function RoutesView({ routes, onAddRoute }: Props) {
  return (
    <div className="absolute inset-0 bg-gray-50 z-40 flex flex-col">
      <div className="px-4 pt-5 pb-3 bg-white border-b border-gray-100">
        <h2 className="text-[20px] font-extrabold text-gray-900">Saved Routes</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {routes.map(r => <RouteCard key={r.id} route={r} />)}
      </div>

      <button
        onClick={onAddRoute}
        className="group absolute bottom-6 right-5 h-14 w-14 hover:w-auto hover:px-5 bg-black text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ease-in-out active:scale-95 cursor-pointer"
      >
        <span className="font-extrabold text-[13px] tracking-wide whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:mr-1.5 transition-all duration-300 ease-in-out">
          Add New Route
        </span>
        <Plus size={20} className="flex-shrink-0" />
      </button>
    </div>
  );
}
