import { useState, useRef, useEffect } from 'react';
import {
  Droplets, TreePine, HardHat, Car, Zap, Flame, Mountain, AlertTriangle,
  Locate, ChevronDown, Check, Info,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap as useLeafletMap } from 'react-leaflet';
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow, useMap as useGoogleMap } from '@vis.gl/react-google-maps';
import L from 'leaflet';
import { LandscapeThumb } from './LandscapeThumb';
import type { MapPin, HazardLevel, HazardFilter } from '../types';
import { HAZARD_COLORS } from '../types';

/* 
  ── Google Maps Configurations ── 
  To use Google Maps:
  1. Replace "YOUR_API_KEY_HERE" with a valid Google Maps API Key.
  2. Optional: Provide a Google Maps MAP_ID if using advanced vectors.
*/
const GOOGLE_MAPS_API_KEY = "AIzaSyB2WFoRbVp3HPXHotn27e600KWnHJZZQ80";
const GOOGLE_MAPS_MAP_ID = ""; // Optional Advanced Map ID

const IS_GOOGLE_MAPS_ACTIVE = 
  GOOGLE_MAPS_API_KEY !== "YOUR_API_KEY_HERE" && 
  GOOGLE_MAPS_API_KEY.trim() !== "";

const reportSvgPaths: Record<string, string> = {
  flood: '<path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'fallen-tree': '<path d="M17 22H7M12 22v-5M9 13l3-3 3 3M8 17l4-4 4 4M12 10a4 4 0 0 0-4-4 4 4 0 0 0 8 0 4 4 0 0 0-4 4z" fill="none" stroke="currentColor" stroke-width="2"/>',
  'road-work': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'car-crash': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h2M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="none" stroke="currentColor" stroke-width="2"/>',
  'fallen-pole': '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="none" stroke="currentColor" stroke-width="2"/>',
  landslide: '<path d="M8 3v10M3 13h10M16 18l4-4 4 4M20 14v8" fill="none" stroke="currentColor" stroke-width="2"/>',
  other: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" fill="none" stroke="currentColor" stroke-width="2"/>',
};

const FILTERS: { key: HazardFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'minor', label: 'Minor' },
  { key: 'needs-attention', label: 'Needs Attention' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'life-threatening', label: 'Critical' },
];

interface Props {
  pins: MapPin[];
  onOpenDetail: (pin: MapPin) => void;
}

// Framer motion wrapper for header dropdown animation
import { motion, AnimatePresence } from 'motion/react';

/* ────────── LEAFLET CUSTOMIZATIONS ────────── */

// Helper to create Leaflet Custom DivIcon matching styling guidelines
const createCustomIcon = (pin: MapPin) => {
  const { bg } = HAZARD_COLORS[pin.hazardLevel];
  const svgContent = reportSvgPaths[pin.type] ?? reportSvgPaths['other'];
  
  const htmlString = `
    <div class="relative w-8 h-[42px] select-none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
      <div class="absolute bottom-0 left-1/2 rounded-full opacity-20" style="width: 14px; height: 5px; transform: translateX(-50%); background: #000; filter: blur(2px);"></div>
      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" style="display: block;">
        <path d="M16 2C9.373 2 4 7.373 4 14C4 23 16 40 16 40C16 40 28 23 28 14C28 7.373 22.627 2 16 2Z" fill="${bg}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="14" r="7" fill="white" fill-opacity="0.25" />
      </svg>
      <div class="absolute flex items-center justify-center text-white" style="top: 8px; left: 9px; width: 14px; height: 14px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${svgContent}
        </svg>
      </div>
      ${pin.threadCount > 1 ? `
        <div class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[9px] font-bold flex items-center justify-center shadow" style="color: ${bg}; border: 2px solid ${bg}">
          ${pin.threadCount}
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: htmlString,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36],
  });
};

/* Safe wrapper to stop click propagation in Leaflet popups */
function SafePopupContent({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  return <div ref={ref}>{children}</div>;
}

/* Locate control specifically for Leaflet map */
function LeafletLocateControl() {
  const map = useLeafletMap();
  
  const handleLocate = () => {
    map.locate().on('locationfound', (e) => {
      map.flyTo(e.latlng, 16, { animate: true, duration: 1.5 });
    }).on('locationerror', () => {
      map.flyTo([14.5995, 120.9842], 14, { animate: true, duration: 1.5 });
    });
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute right-3 bottom-3 z-[1000] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform"
    >
      <Locate size={18} />
    </button>
  );
}

/* ────────── GOOGLE MAPS CUSTOMIZATIONS ────────── */

/* Locate control specifically for Google map */
function GoogleMapLocateControl() {
  const map = useGoogleMap();
  
  const handleLocate = () => {
    if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.panTo(pos);
          map.setZoom(16);
        },
        () => {
          map.panTo({ lat: 14.5995, lng: 120.9842 });
          map.setZoom(14);
        }
      );
    }
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute right-3 bottom-3 z-[1000] w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform cursor-pointer"
    >
      <Locate size={18} />
    </button>
  );
}

/* ────────── SHARED CONTROLS ────────── */

function FilterDropdown({ filter, onChange }: { filter: HazardFilter; onChange: (f: HazardFilter) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = FILTERS.find(f => f.key === filter)!;
  const activeColor = filter !== 'all' ? HAZARD_COLORS[filter as HazardLevel] : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative text-gray-800">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold shadow-lg border cursor-pointer"
        style={
          activeColor
            ? { background: activeColor.bg, borderColor: activeColor.bg, color: 'white' }
            : { background: 'white', borderColor: '#e5e7eb', color: '#111' }
        }
      >
        <span>Filter: {active.label}</span>
        <ChevronDown
          size={14} strokeWidth={2.5}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[1001]"
            style={{ transform: 'translateX(-50%)', minWidth: 200 }}
          >
            {FILTERS.map(f => {
              const color = f.key !== 'all' ? HAZARD_COLORS[f.key as HazardLevel] : null;
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { onChange(f.key); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: color ? color.bg : '#9ca3af' }} />
                  <span className={isActive ? 'font-bold text-gray-900' : 'text-gray-700'}>{f.label}</span>
                  {isActive && <Check size={14} className="ml-auto text-gray-900" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────── MAIN MAPVIEW COMPONENT ────────── */

export function MapView({ pins, onOpenDetail }: Props) {
  const [filter, setFilter] = useState<HazardFilter>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const visible = filter === 'all' ? pins : pins.filter(p => p.hazardLevel === filter);

  // Center coordinate of Manila City Center
  const centerPosition = { lat: 14.5995, lng: 120.9842 };

  // 1. Google Maps View
  if (IS_GOOGLE_MAPS_ACTIVE) {
    return (
      <div className="relative w-full h-full z-0 text-gray-800">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            defaultCenter={centerPosition}
            defaultZoom={13}
            disableDefaultUI={true}
            mapId={GOOGLE_MAPS_MAP_ID || undefined}
            style={{ width: '100%', height: '100%', outline: 'none' }}
          >
            {visible.map(pin => {
              const { bg } = HAZARD_COLORS[pin.hazardLevel];
              const svgPath = reportSvgPaths[pin.type] ?? reportSvgPaths['other'];
              const isSelected = selectedPinId === pin.id;

              return (
                <div key={pin.id}>
                  <AdvancedMarker
                    position={{ lat: pin.lat, lng: pin.lng }}
                    onClick={() => setSelectedPinId(pin.id)}
                  >
                    {/* Custom HTML Marker Teardrop */}
                    <div className="relative w-8 h-[42px] select-none cursor-pointer" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))' }}>
                      <div className="absolute bottom-0 left-1/2 rounded-full opacity-20" style={{ width: 14, height: 5, transform: 'translateX(-50%)', background: '#000', filter: 'blur(2px)' }}></div>
                      <svg width="32" height="42" viewBox="0 0 32 42" fill="none" style={{ display: 'block' }}>
                        <path d="M16 2C9.373 2 4 7.373 4 14C4 23 16 40 16 40C16 40 28 23 28 14C28 7.373 22.627 2 16 2Z" fill={bg} stroke="white" strokeWidth="2"/>
                        <circle cx="16" cy="14" r="7" fill="white" fillOpacity="0.25" />
                      </svg>
                      <div className="absolute flex items-center justify-center text-white" style={{ top: 8, left: 9, width: 14, height: 14 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <g dangerouslySetInnerHTML={{ __html: svgPath }} />
                        </svg>
                      </div>
                      {pin.threadCount > 1 && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[9px] font-bold flex items-center justify-center shadow" style={{ color: bg, border: `2px solid ${bg}` }}>
                          {pin.threadCount}
                        </div>
                      )}
                    </div>
                  </AdvancedMarker>

                  {isSelected && (
                    <InfoWindow
                      position={{ lat: pin.lat, lng: pin.lng }}
                      onCloseClick={() => setSelectedPinId(null)}
                      headerDisabled={true}
                    >
                      {/* Info Window Card matching Popup layout */}
                      <div className="bg-white rounded-xl overflow-hidden flex" style={{ width: 230 }}>
                        <LandscapeThumb className="w-[72px] flex-shrink-0" />
                        <div className="flex-1 px-2.5 pt-2.5 pb-2 min-w-0 flex flex-col">
                          <p
                            className="text-[12px] font-extrabold text-gray-900 leading-snug mb-0.5"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {pin.title}
                          </p>
                          <p
                            className="text-[11px] text-gray-500 mb-1"
                            style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          >
                            {pin.description.slice(0, 45)}
                          </p>
                          <p className="text-[10px] text-gray-400">Reported by {pin.reportedBy}</p>
                          <p className="text-[10px] text-gray-400 mb-1">{pin.timeAgo}</p>
                          <div className="flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDetail(pin);
                              }}
                              className="text-[11px] font-bold cursor-pointer"
                              style={{ color: '#1d4ed8' }}
                            >
                              View more
                            </button>
                          </div>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </div>
              );
            })}
            
            <GoogleMapLocateControl />
          </GoogleMap>
        </APIProvider>

        {/* Filter dropdown — centred at top */}
        <div className="absolute top-3 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <FilterDropdown
              filter={filter}
              onChange={setFilter}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. Leaflet Fallback View (Zero-config Default)
  return (
    <div className="relative w-full h-full bg-[#f0ebe0] z-0 text-gray-800">
      <MapContainer
        center={[centerPosition.lat, centerPosition.lng]}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visible.map(pin => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createCustomIcon(pin)}
          >
            <Popup closeButton={false} className="custom-leaflet-popup">
              <SafePopupContent>
                <div className="bg-white rounded-xl overflow-hidden flex shadow-lg border border-gray-100" style={{ width: 230 }}>
                  <LandscapeThumb className="w-[72px] flex-shrink-0" />
                  <div className="flex-1 px-2.5 pt-2.5 pb-2 min-w-0 flex flex-col">
                    <p
                      className="text-[12px] font-extrabold text-gray-900 leading-snug mb-0.5"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {pin.title}
                    </p>
                    <p
                      className="text-[11px] text-gray-500 mb-1"
                      style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {pin.description.slice(0, 45)}
                    </p>
                    <p className="text-[10px] text-gray-400">Reported by {pin.reportedBy}</p>
                    <p className="text-[10px] text-gray-400 mb-1">{pin.timeAgo}</p>
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(pin);
                        }}
                        className="text-[11px] font-bold cursor-pointer"
                        style={{ color: '#1d4ed8' }}
                      >
                        View more
                      </button>
                    </div>
                  </div>
                </div>
              </SafePopupContent>
            </Popup>
          </Marker>
        ))}

        <LeafletLocateControl />
      </MapContainer>

      {/* Fallback Banner Notice */}
      <div className="absolute top-[64px] left-0 right-0 z-[1000] flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg border border-white/10 flex items-center gap-1.5 select-none">
          <Info size={11} className="text-blue-400" />
          <span>Leaflet Map Active</span>
          <span className="opacity-30">|</span>
          <span className="text-gray-300 font-normal">Add Google Maps API key in MapView.tsx to swap</span>
        </div>
      </div>

      {/* Filter dropdown — centred at top */}
      <div className="absolute top-3 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FilterDropdown
            filter={filter}
            onChange={setFilter}
          />
        </div>
      </div>
    </div>
  );
}
