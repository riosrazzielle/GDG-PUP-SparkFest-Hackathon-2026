import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Loader2, Navigation, MapPin as MapPinIcon, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type { SavedRoute } from '../types';

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

/* ─────────────────────────────────────────────────────────────
   PlacesInput
   Waits for `placesReady` before attaching Autocomplete so both
   Start and Destination inputs work without a race condition.
───────────────────────────────────────────────────────────── */
function PlacesInput({
  placeholder,
  value,
  onChange,
  onPlaceSelected,
  disabled,
  placesReady,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  disabled?: boolean;
  placesReady: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // Only initialise once the shared library load has finished
    if (!placesReady || !inputRef.current || autocompleteRef.current) return;

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
  }, [placesReady]);

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

/* ─────────────────────────────────────────────────────────────
   MapPicker — full-screen tap-to-pin overlay
───────────────────────────────────────────────────────────── */
function MapPicker({
  label,
  initialLatLng,
  onConfirm,
  onCancel,
}: {
  label: string;
  initialLatLng?: { lat: number; lng: number };
  onConfirm: (latLng: { lat: number; lng: number }, address: string) => void;
  onCancel: () => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(initialLatLng ?? null);
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const reverseGeocode = (latLng: { lat: number; lng: number }) => {
    setGeocoding(true);
    setSelected(latLng);
    geocoderRef.current?.geocode({ location: latLng }, (results, status) => {
      setGeocoding(false);
      setAddress(
        status === 'OK' && results?.[0]
          ? results[0].formatted_address
          : `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`
      );
    });
  };

  const placeOrMoveMarker = (map: google.maps.Map, latLng: { lat: number; lng: number }) => {
    if (markerRef.current) {
      markerRef.current.setPosition(latLng);
    } else {
      const marker = new google.maps.Marker({
        map,
        position: latLng,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) reverseGeocode({ lat: pos.lat(), lng: pos.lng() });
      });
      markerRef.current = marker;
    }
    reverseGeocode(latLng);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });

    Promise.all([importLibrary('maps'), importLibrary('geocoding')]).then(() => {
      if (!mapRef.current) return;

      const center = initialLatLng ?? { lat: 14.5995, lng: 120.9842 };
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: initialLatLng ? 15 : 13,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      });
      mapInstanceRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      // Pre-place marker if editing
      if (initialLatLng) placeOrMoveMarker(map, initialLatLng);

      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        placeOrMoveMarker(map, { lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    });
  }, []);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="absolute inset-0 z-[60] bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer"
        >
          <X size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900">Pin {label}</p>
          <p className="text-[11px] text-gray-400">Tap the map · drag pin to adjust</p>
        </div>
      </div>

      {/* Map fills the remaining space */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Bottom confirm bar */}
      <div className="px-4 pt-3 pb-6 bg-white border-t border-gray-100 flex-shrink-0">
        {selected ? (
          <div className="mb-3 flex items-start gap-2">
            <MapPinIcon size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-2">
              {geocoding ? 'Getting address…' : address || `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-gray-400 mb-3 text-center">
            Tap anywhere on the map to drop a pin
          </p>
        )}
        <button
          onClick={() => selected && onConfirm(selected, address)}
          disabled={!selected || geocoding}
          className="w-full py-3.5 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-[0.98]"
          style={{ backgroundColor: '#1d4ed8' }}
        >
          {geocoding ? <><Loader2 size={16} className="animate-spin" /> Getting address…</> : 'Confirm Location'}
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Route options config
───────────────────────────────────────────────────────────── */
const TRAVEL_MODES = [
  { key: 'DRIVING',   label: '🚗 Car',       mode: 'DRIVING'   },
  { key: 'MOTOR',     label: '🛵 Motor',     mode: 'DRIVING'   }, // motorcycles use the same road network
  { key: 'TRANSIT',   label: '🚌 Transit',   mode: 'TRANSIT'   },
  { key: 'WALKING',   label: '🚶 Walk',      mode: 'WALKING'   },
];

const AVOID_OPTIONS = [
  { key: 'avoid-tolls',    label: '🚫 Avoid Tolls' },
  { key: 'avoid-highways', label: '🛤 Avoid Highways' },
  { key: 'avoid-ferries',  label: '⛴ Avoid Ferries' },
  { key: 'avoid-indoor',   label: '🏢 Avoid Indoor' },
];

/* ─────────────────────────────────────────────────────────────
   AddRouteModal
───────────────────────────────────────────────────────────── */
export function AddRouteModal({ onClose, onSave, editRoute }: Props) {
  const [routeName, setRouteName] = useState(editRoute?.name ?? '');
  const [startAddress, setStartAddress] = useState(editRoute?.from ?? '');
  const [destAddress, setDestAddress] = useState(editRoute?.to ?? '');
  const [startPlace, setStartPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [destPlace, setDestPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [startLatLng, setStartLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [destLatLng, setDestLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLatLng, setCurrentLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [travelMode, setTravelMode] = useState<string>('DRIVING');
  const [avoidOptions, setAvoidOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [placesReady, setPlacesReady] = useState(false);
  const [mapPicker, setMapPicker] = useState<'start' | 'dest' | null>(null);

  // Alternative route selection state
  const [calculatedRoutes, setCalculatedRoutes] = useState<any[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [calculatingAlternatives, setCalculatingAlternatives] = useState(false);

  /* Load Google Maps + Places library ONCE so both autocomplete inputs work */
  useEffect(() => {
    setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });
    importLibrary('places').then(() => setPlacesReady(true));
  }, []);

  const isEditMode = !!editRoute;

  const hasValidStart = useCurrentLocation
    ? !!currentLatLng
    : !!(startPlace || startLatLng) || (isEditMode && startAddress.trim());

  const hasValidDest = !!(destPlace || destLatLng) || (isEditMode && destAddress.trim());

  const canSave = hasValidStart && hasValidDest;

  const toggleOption = (key: string) => {
    setAvoidOptions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    setCalculatedRoutes([]); // Reset alternatives on option change
  };

  /* GPS current location */
  useEffect(() => {
    if (!useCurrentLocation) { setCurrentLatLng(null); setStartAddress(''); return; }
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCurrentLatLng({ lat, lng });
        setStartAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setStartPlace(null);
        setStartLatLng(null);
        setCalculatedRoutes([]);
      },
      () => setError('Could not get current location.')
    );
  }, [useCurrentLocation]);

  const fetchRoutes = async (provideAlternatives = false) => {
    setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });
    await importLibrary('routes');

    const directionsService = new google.maps.DirectionsService();

    // Resolve origin
    const origin =
      useCurrentLocation && currentLatLng
        ? new google.maps.LatLng(currentLatLng.lat, currentLatLng.lng)
        : startLatLng
          ? new google.maps.LatLng(startLatLng.lat, startLatLng.lng)
          : startPlace?.geometry?.location ?? (isEditMode ? startAddress : null);

    if (!origin) throw new Error('Please re-select the start address from the dropdown or pin it on the map.');

    // Resolve destination
    const destination =
      destLatLng
        ? new google.maps.LatLng(destLatLng.lat, destLatLng.lng)
        : destPlace?.geometry?.location ?? (isEditMode ? destAddress : null);

    if (!destination) throw new Error('Please re-select the destination from the dropdown or pin it on the map.');

    const gmTravelMode = {
      DRIVING:   google.maps.TravelMode.DRIVING,
      WALKING:   google.maps.TravelMode.WALKING,
      BICYCLING: google.maps.TravelMode.BICYCLING,
      TRANSIT:   google.maps.TravelMode.TRANSIT,
    }[travelMode] ?? google.maps.TravelMode.DRIVING;

    const avoidTolls    = avoidOptions.includes('avoid-tolls');
    const avoidHighways = avoidOptions.includes('avoid-highways');
    const avoidFerries  = avoidOptions.includes('avoid-ferries');
    const avoidIndoor   = avoidOptions.includes('avoid-indoor');

    return await directionsService.route({
      origin,
      destination,
      travelMode: gmTravelMode,
      avoidTolls,
      avoidHighways,
      avoidFerries,
      avoidIndoor,
      provideRouteAlternatives: provideAlternatives,
    });
  };

  const handleFindAlternatives = async () => {
    if (!canSave) return;
    setError('');
    setCalculatingAlternatives(true);
    try {
      const result = await fetchRoutes(true);
      if (!result.routes || result.routes.length === 0) {
        throw new Error('No routes found.');
      }
      setCalculatedRoutes(result.routes);
      setSelectedRouteIndex(0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to calculate alternative routes.';
      setError(msg);
    } finally {
      setCalculatingAlternatives(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) { setError('Please fill in both a start and destination.'); return; }
    setError('');
    setSaving(true);

    try {
      let chosenRoute = calculatedRoutes[selectedRouteIndex];
      
      // If routes haven't been pre-calculated, fetch the default route now
      if (!chosenRoute) {
        const result = await fetchRoutes(false);
        chosenRoute = result.routes[0];
      }

      const leg = chosenRoute?.legs?.[0];
      if (!leg) throw new Error('No route found between these locations.');

      // Decode the full road-following polyline
      const rawPath = chosenRoute.overview_path ?? [];
      const routePath = rawPath.map((p: google.maps.LatLng) => ({ lat: p.lat(), lng: p.lng() }));

      const now = new Date();
      const lastEdited = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      const fromLabel = useCurrentLocation
        ? 'Current Location'
        : startLatLng
          ? startAddress || 'Pinned Start'
          : (startPlace?.name ?? startPlace?.formatted_address ?? startAddress);

      const toLabel = destLatLng
        ? destAddress || 'Pinned Destination'
        : (destPlace?.name ?? destPlace?.formatted_address ?? destAddress);

      const route: SavedRoute = {
        id: editRoute?.id ?? crypto.randomUUID(),
        name: routeName.trim() || `Route ${now.toLocaleTimeString()}`,
        from: fromLabel,
        to: toLabel,
        distance: leg.distance?.text ?? '—',
        duration: leg.duration?.text ?? '—',
        lastEdited,
        nearbyReports: 0, // computed live in RoutesView from current pins
        travelMode,
        routePath,
      };

      onSave(route);
      setSaved(true);
      setTimeout(onClose, 1800);
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? e.message
        : 'Could not calculate route. Make sure the Directions API is enabled in Google Cloud Console.';
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
          /* ── Success ── */
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

              {/* ── Start Point ── */}
              <div>
                <SectionLabel>Start Point</SectionLabel>
                <div className="mb-2">
                  <PlacesInput
                    placeholder="Search for a place…"
                    value={startAddress}
                    onChange={v => { setStartAddress(v); setStartLatLng(null); }}
                    onPlaceSelected={p => { setStartPlace(p); setStartLatLng(null); setUseCurrentLocation(false); }}
                    disabled={useCurrentLocation}
                    placesReady={placesReady}
                  />
                </div>
                {/* Controls row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Navigation size={12} className="text-blue-500 flex-shrink-0" />
                    <span className="text-[12px] text-gray-600 font-medium">Current Location</span>
                    <Toggle value={useCurrentLocation} onChange={setUseCurrentLocation} />
                  </div>
                  <button
                    onClick={() => setMapPicker('start')}
                    disabled={useCurrentLocation}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Map size={12} />
                    Pin on Map
                  </button>
                </div>
                {startLatLng && !useCurrentLocation && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                    <MapPinIcon size={10} /> Pinned on map
                  </p>
                )}
              </div>

              {/* ── Destination ── */}
              <div>
                <SectionLabel>Destination</SectionLabel>
                <div className="mb-2">
                  <PlacesInput
                    placeholder="Search for a place…"
                    value={destAddress}
                    onChange={v => { setDestAddress(v); setDestLatLng(null); }}
                    onPlaceSelected={p => { setDestPlace(p); setDestLatLng(null); }}
                    placesReady={placesReady}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setMapPicker('dest')}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Map size={12} />
                    Pin on Map
                  </button>
                </div>
                {destLatLng && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                    <MapPinIcon size={10} /> Pinned on map
                  </p>
                )}
              </div>

              {/* Route Options */}
              <div>
                <SectionLabel>Travel Mode</SectionLabel>
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {TRAVEL_MODES.map(m => {
                    const active = travelMode === m.key;
                    return (
                      <button
                        key={m.key}
                        onClick={() => setTravelMode(m.key)}
                        className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer"
                        style={active
                          ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }
                          : { background: 'white', borderColor: '#e5e7eb', color: '#6b7280' }
                        }
                      >
                        <span className="text-base leading-none">{m.label.split(' ')[0]}</span>
                        <span>{m.label.split(' ')[1]}</span>
                      </button>
                    );
                  })}
                </div>

                <SectionLabel>Avoid</SectionLabel>
                <div className="flex gap-2 flex-wrap">
                  {AVOID_OPTIONS.map(opt => {
                    const active = avoidOptions.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleOption(opt.key)}
                        className="px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors cursor-pointer"
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

              {/* Find alternative routes button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFindAlternatives}
                  disabled={calculatingAlternatives || !canSave}
                  className="w-full py-2.5 rounded-xl border border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-50 text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {calculatingAlternatives ? (
                    <><Loader2 size={14} className="animate-spin" /> Fetching Alternatives…</>
                  ) : (
                    '🔍 Find Alternative Routes'
                  )}
                </button>
              </div>

              {/* Alternatives List */}
              {calculatedRoutes.length > 0 && (
                <div className="space-y-2 border border-gray-100 bg-gray-50/50 p-3 rounded-2xl">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Select Route Path:</p>
                  <div className="space-y-1.5">
                    {calculatedRoutes.map((r, idx) => {
                      const leg = r.legs?.[0];
                      const selected = idx === selectedRouteIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedRouteIndex(idx)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border text-[13px] text-left transition-all cursor-pointer"
                          style={selected
                            ? { background: 'white', borderColor: '#3b82f6', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.08)' }
                            : { background: 'white', borderColor: '#e5e7eb' }
                          }
                        >
                          <div className="flex flex-col">
                            <span className={`font-semibold ${selected ? 'text-blue-600' : 'text-gray-700'}`}>
                              Option {idx + 1} {idx === 0 ? '(Recommended)' : ''}
                            </span>
                            <span className="text-[11px] text-gray-400">Via {r.summary || 'Main road'}</span>
                          </div>
                          <div className="text-right flex flex-col">
                            <span className="font-bold text-gray-900">{leg?.duration?.text || '—'}</span>
                            <span className="text-[11px] text-gray-400">{leg?.distance?.text || '—'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}



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
                {saving
                  ? <><Loader2 size={18} className="animate-spin" /> Calculating Route…</>
                  : isEditMode ? 'Update Route' : 'Save Route'
                }
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Map Picker Overlay ── */}
      <AnimatePresence>
        {mapPicker && (
          <MapPicker
            key={mapPicker}
            label={mapPicker === 'start' ? 'Start Point' : 'Destination'}
            initialLatLng={
              mapPicker === 'start'
                ? (startLatLng ?? undefined)
                : (destLatLng ?? undefined)
            }
            onConfirm={(latLng, address) => {
              if (mapPicker === 'start') {
                setStartLatLng(latLng);
                setStartAddress(address);
                setStartPlace(null);
                setUseCurrentLocation(false);
              } else {
                setDestLatLng(latLng);
                setDestAddress(address);
                setDestPlace(null);
              }
              setMapPicker(null);
            }}
            onCancel={() => setMapPicker(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
