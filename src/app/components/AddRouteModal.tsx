import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Loader2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { SavedRoute } from '../types';
import { countNearbyPins } from '../hooks/useRoutes';

const GOOGLE_MAPS_API_KEY = 'AIzaSyB2WFoRbVp3HPXHotn27e600KWnHJZZQ80';

interface Props {
  onClose: () => void;
  onSave: (route: SavedRoute) => void;
  editRoute?: SavedRoute;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-extrabold text-gray-900 mb-1.5">{children}</p>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 transition-colors cursor-pointer"
      style={{ width: 36, height: 20, borderRadius: 10, background: value ? '#1d4ed8' : '#d1d5db' }}
    >
      <span
        className="absolute top-0.5 transition-transform bg-white rounded-full shadow"
        style={{ width: 16, height: 16, left: 2, transform: value ? 'translateX(16px)' : 'none' }}
      />
    </button>
  );
}

/* ── Address input with Google Places Autocomplete ── */
function PlacesInput({
  placeholder,
  value,
  onChange,
  onPlaceSelected,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    let destroyed = false;

    setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });
    importLibrary('places').then(() => {
      if (destroyed || !inputRef.current) return;
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'ph' },
        fields: ['formatted_address', 'geometry', 'name'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.formatted_address) {
          onChange(place.formatted_address);
          onPlaceSelected(place);
        }
      });
      autocompleteRef.current = ac;
    });

    return () => { destroyed = true; };
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-[13px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors disabled:opacity-50"
    />
  );
}

const ROUTE_OPTIONS = [
  { key: 'fastest', label: '⚡ Fastest' },
  { key: 'avoid-tolls', label: '🚫 Avoid Tolls' },
  { key: 'avoid-highways', label: '🛤 Avoid Highways' },
];

export function AddRouteModal({ onClose, onSave, editRoute }: Props) {
  const [routeName, setRouteName] = useState(editRoute?.name ?? '');
  const [startAddress, setStartAddress] = useState(editRoute?.from ?? '');
  const [destAddress, setDestAddress] = useState(editRoute?.to ?? '');
  const [startPlace, setStartPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [destPlace, setDestPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLatLng, setCurrentLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['fastest']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!editRoute;
  const canSave = isEditMode
    ? (useCurrentLocation ? !!currentLatLng : true)
    : (useCurrentLocation ? !!currentLatLng : !!startPlace) && !!destPlace;

  const toggleOption = (key: string) =>
    setSelectedOptions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  /* Get current GPS position when toggle is flipped on */
  useEffect(() => {
    if (!useCurrentLocation) { setCurrentLatLng(null); setStartAddress(''); return; }
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentLatLng({ lat, lng });
        setStartAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setStartPlace(null);
      },
      () => setError('Could not get current location.')
    );
  }, [useCurrentLocation]);

  const handleSave = async () => {
    if (!canSave) { setError('Please fill in both a start and destination.'); return; }
    setError('');
    setSaving(true);

    try {
      setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });
      await importLibrary('routes');

      const directionsService = new google.maps.DirectionsService();

      const origin = useCurrentLocation && currentLatLng
        ? new google.maps.LatLng(currentLatLng.lat, currentLatLng.lng)
        : startPlace?.geometry?.location ?? (isEditMode ? startAddress : null);

      if (!origin) throw new Error('Please re-select the start address from the dropdown.');

      const destination = destPlace?.geometry?.location ?? (isEditMode ? destAddress : null);
      if (!destination) throw new Error('Please re-select the destination from the dropdown.');

      const avoidTolls = selectedOptions.includes('avoid-tolls');
      const avoidHighways = selectedOptions.includes('avoid-highways');

      const result = await directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        avoidTolls,
        avoidHighways,
      });

      const leg = result.routes[0]?.legs[0];
      if (!leg) throw new Error('No route found between these locations.');

      // Decode polyline path to lat/lng array
      const rawPath = result.routes[0].overview_path ?? [];
      const routePath = rawPath.map((p: google.maps.LatLng) => ({ lat: p.lat(), lng: p.lng() }));

      const nearbyReports = countNearbyPins(routePath);

      const now = new Date();
      const lastEdited = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      const route: SavedRoute = {
        id: editRoute?.id ?? crypto.randomUUID(),
        name: routeName.trim() || `Route ${now.toLocaleTimeString()}`,
        from: useCurrentLocation ? 'Current Location' : (startPlace?.name ?? startPlace?.formatted_address ?? startAddress),
        to: destPlace?.name ?? destPlace?.formatted_address ?? destAddress,
        distance: leg.distance?.text ?? '—',
        duration: leg.duration?.text ?? '—',
        lastEdited,
        nearbyReports,
        routePath,
      };

      onSave(route);
      setSaved(true);
      setTimeout(onClose, 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not calculate route. Check that the Directions API is enabled.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="absolute inset-0 bg-white z-50 flex flex-col"
    >
      <AnimatePresence mode="wait">
        {saved ? (
          /* ── Success State ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 14 }}
              className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-5"
            >
              <CheckCircle size={40} className="text-blue-600" />
            </motion.div>
            <h2 className="text-[22px] font-bold text-gray-900 mb-2">Route Saved!</h2>
            <p className="text-[14px] text-gray-500">Your route has been added to your saved routes.</p>
          </motion.div>
        ) : (
          /* ── Form ── */
          <motion.div key="form" className="flex-1 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="relative flex items-center justify-center px-4 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
              <h1 className="text-[20px] font-extrabold text-gray-900">{isEditMode ? 'Edit Route' : 'New Route'}</h1>
              <button
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* Route Name */}
              <div>
                <SectionLabel>Route Name</SectionLabel>
                <input
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  placeholder="e.g., Home → Work"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-[13px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
              </div>

              {/* Start Point */}
              <div>
                <SectionLabel>Start Point</SectionLabel>
                <div className="mb-2">
                  <PlacesInput
                    placeholder="e.g., Tondo, Manila"
                    value={startAddress}
                    onChange={setStartAddress}
                    onPlaceSelected={p => { setStartPlace(p); setUseCurrentLocation(false); }}
                    disabled={useCurrentLocation}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-600 font-medium">
                    <Navigation size={12} className="text-blue-500" />
                    <span>Use Current Location</span>
                  </div>
                  <Toggle value={useCurrentLocation} onChange={setUseCurrentLocation} />
                </div>
              </div>

              {/* Destination */}
              <div>
                <SectionLabel>Destination</SectionLabel>
                <PlacesInput
                  placeholder="e.g., Makati CBD"
                  value={destAddress}
                  onChange={setDestAddress}
                  onPlaceSelected={setDestPlace}
                />
              </div>

              {/* Route Options */}
              <div>
                <SectionLabel>Route Options</SectionLabel>
                <div className="flex gap-2 flex-wrap">
                  {ROUTE_OPTIONS.map(opt => {
                    const active = selectedOptions.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleOption(opt.key)}
                        className="px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer"
                        style={active
                          ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }
                          : { background: 'white', borderColor: '#e5e7eb', color: '#374151' }
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12px] text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="px-4 pt-2 pb-6 bg-white border-t border-gray-100 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                className="w-full py-4 rounded-2xl text-white text-[16px] font-bold active:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#1d4ed8' }}
              >
                {saving ? (
                  <><Loader2 size={18} className="animate-spin" /> Calculating Route…</>
                ) : (
                  isEditMode ? 'Update Route' : 'Save Route'
                )}
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
