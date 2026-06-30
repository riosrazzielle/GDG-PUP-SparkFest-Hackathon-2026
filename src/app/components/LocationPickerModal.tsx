import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { X, Check } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyB2WFoRbVp3HPXHotn27e600KWnHJZZQ80";

interface Props {
  initialLocation: { lat: number, lng: number } | null;
  onConfirm: (location: { lat: number, lng: number }, address: string) => void;
  onClose: () => void;
}

export function LocationPickerModal({ initialLocation, onConfirm, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  const [loaded, setLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(initialLocation);
  const [address, setAddress] = useState<string>('Custom Pinned Location');
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOptions({ apiKey: GOOGLE_MAPS_API_KEY, version: 'weekly' });

    importLibrary('maps').then(() => {
      if (cancelled || !mapRef.current) return;
      
      const center = initialLocation || { lat: 14.5995, lng: 120.9842 };
      
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 16,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
      });
      
      mapInstanceRef.current = map;

      const marker = new google.maps.Marker({
        map,
        position: center,
        draggable: true,
      });
      markerRef.current = marker;

      // When the map is clicked, move the marker
      map.addListener('click', (e: any) => {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        marker.setPosition(newPos);
        handleLocationChange(newPos);
      });

      // When the marker is dragged, update location
      marker.addListener('dragend', (e: any) => {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        handleLocationChange(newPos);
      });

      setLoaded(true);
      
      if (initialLocation) {
        handleLocationChange(initialLocation);
      }
    });

    return () => { cancelled = true; };
  }, []);

  const handleLocationChange = (loc: {lat: number, lng: number}) => {
    setSelectedLocation(loc);
    setIsGeocoding(true);
    
    try {
      // Reverse Geocode
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: loc }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          setAddress("Custom Map Location");
        }
        setIsGeocoding(false);
      });
    } catch (error) {
      console.error("Geocoding failed", error);
      setAddress("Custom Map Location");
      setIsGeocoding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-[70] bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm z-10 relative">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-500 rounded-full hover:bg-gray-100 transition-colors">
          <X size={20} />
        </button>
        <h2 className="text-[15px] font-extrabold text-gray-900">Pin Location</h2>
        <button 
          onClick={() => selectedLocation && onConfirm(selectedLocation, address)}
          disabled={!selectedLocation || isGeocoding}
          className="p-2 -mr-2 text-blue-600 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          <Check size={20} />
        </button>
      </div>

      {/* Map View */}
      <div className="flex-1 relative bg-gray-100">
        <div ref={mapRef} className="w-full h-full" />
        
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Floating Address Bar */}
        <div className="absolute bottom-6 left-4 right-4 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 z-10">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Pinned Address</p>
          <p className="text-[14px] font-medium text-gray-900 line-clamp-2 min-h-[42px]">
            {isGeocoding ? "Locating..." : address}
          </p>
          <button 
            onClick={() => selectedLocation && onConfirm(selectedLocation, address)}
            disabled={!selectedLocation || isGeocoding}
            className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-[14px] font-bold active:scale-95 transition-transform disabled:opacity-70 disabled:active:scale-100"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </motion.div>
  );
}
