import { useState } from 'react';
import { X, Crosshair, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onClose: () => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] font-extrabold text-gray-900 mb-2">{children}</p>;
}

function MapThumbnail({ type }: { type: 'start' | 'dest' }) {
  return (
    <div
      className="w-[86px] h-[76px] rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 relative"
      style={{ background: '#f0ebe0' }}
    >
      <svg width="100%" height="100%" viewBox="0 0 86 76" preserveAspectRatio="xMidYMid slice">
        <rect width="86" height="76" fill="#f0ebe0" />
        {/* Bay strip */}
        <rect x="0" y="0" width="12" height="76" fill="#b3d9f5" opacity="0.7" />
        {/* Roads */}
        <rect x="0" y="28" width="86" height="3" fill="white" opacity="0.85" />
        <rect x="0" y="52" width="86" height="2.5" fill="white" opacity="0.7" />
        <rect x="26" y="0" width="2.5" height="76" fill="white" opacity="0.85" />
        <rect x="54" y="0" width="2.5" height="76" fill="white" opacity="0.7" />
        {/* Blocks */}
        <rect x="14" y="4" width="10" height="21" fill="#e3dcd2" />
        <rect x="29" y="4" width="22" height="21" fill="#e3dcd2" />
        <rect x="57" y="4" width="16" height="21" fill="#e3dcd2" />
        <rect x="14" y="32" width="10" height="17" fill="#e3dcd2" />
        <rect x="29" y="32" width="22" height="17" fill="#e3dcd2" />
        <rect x="57" y="32" width="16" height="17" fill="#e3dcd2" />
        <rect x="14" y="56" width="10" height="18" fill="#e3dcd2" />
        <rect x="29" y="56" width="22" height="18" fill="#e3dcd2" />
        <rect x="57" y="56" width="16" height="18" fill="#e3dcd2" />
        {/* Pin */}
        {type === 'start' ? (
          <>
            <path d="M43 12 C40 12 38 14 38 17 C38 21.5 43 27 43 27 C43 27 48 21.5 48 17 C48 14 46 12 43 12Z" fill="#1d4ed8" />
            <circle cx="43" cy="17" r="2.5" fill="white" />
          </>
        ) : (
          /* Move icon for destination */
          <>
            <circle cx="43" cy="38" r="9" fill="#1d4ed8" opacity="0.15" />
            <circle cx="43" cy="38" r="5" fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
            {/* Arrow cross */}
            <line x1="43" y1="33" x2="43" y2="43" stroke="#1d4ed8" strokeWidth="1.5" />
            <line x1="38" y1="38" x2="48" y2="38" stroke="#1d4ed8" strokeWidth="1.5" />
            <polygon points="43,31 41.5,33.5 44.5,33.5" fill="#1d4ed8" />
            <polygon points="43,45 41.5,42.5 44.5,42.5" fill="#1d4ed8" />
            <polygon points="36,38 38.5,36.5 38.5,39.5" fill="#1d4ed8" />
            <polygon points="50,38 47.5,36.5 47.5,39.5" fill="#1d4ed8" />
          </>
        )}
      </svg>
      {/* Mapbox-style watermark */}
      <span className="absolute bottom-1 left-1 text-[7px] text-gray-400 font-medium">© mapbox</span>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0 transition-colors"
      style={{
        width: 36, height: 20,
        borderRadius: 10,
        background: value ? '#1d4ed8' : '#d1d5db',
      }}
    >
      <span
        className="absolute top-0.5 transition-transform bg-white rounded-full shadow"
        style={{
          width: 16, height: 16,
          left: 2,
          transform: value ? 'translateX(16px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}

const ROUTE_OPTIONS = [
  { key: 'fastest', label: 'Fastest' },
  { key: 'avoid-tolls', label: 'Avoid Tolls' },
  { key: 'scenic', label: 'Scenic' },
];

export function AddRouteModal({ onClose }: Props) {
  const [tab, setTab] = useState<'create' | 'import'>('create');
  const [routeName, setRouteName] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['fastest']);
  const [submitted, setSubmitted] = useState(false);

  const toggleOption = (key: string) => {
    setSelectedOptions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handlePreview = () => {
    setSubmitted(true);
    setTimeout(onClose, 1800);
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
        {submitted ? (
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
          <motion.div key="form" className="flex-1 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="relative flex items-center justify-center px-4 pt-5 pb-3 border-b border-gray-100">
              <h1 className="text-[20px] font-extrabold text-gray-900">New Route</h1>
              <button
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* Tab switcher */}
              <div className="flex gap-2">
                {(['create', 'import'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors"
                    style={
                      tab === t
                        ? { background: '#eff6ff', borderColor: '#93c5fd', color: '#1d4ed8' }
                        : { background: 'white', borderColor: '#e5e7eb', color: '#6b7280' }
                    }
                  >
                    {t === 'create' ? 'Create New Route' : 'Import Route'}
                  </button>
                ))}
              </div>

              {/* Route Name */}
              <div>
                <SectionLabel>Route Name</SectionLabel>
                <input
                  value={routeName}
                  onChange={e => setRouteName(e.target.value)}
                  placeholder="e.g., Home-Work"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-[13px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Set Start Point */}
              <div>
                <SectionLabel>Set Start Point</SectionLabel>
                <div className="flex gap-3 items-stretch">
                  <MapThumbnail type="start" />
                  <div className="flex-1 flex flex-col gap-2 justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                      <Crosshair size={13} className="text-gray-400" />
                      <span>Drag this to pin</span>
                    </div>
                    <input
                      value={startAddress}
                      onChange={e => setStartAddress(e.target.value)}
                      placeholder="Address (e.g., pole ID, ..."
                      className="border border-gray-200 rounded-lg px-3 py-2 text-[12px] bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-600 font-medium">Use Current Location</span>
                      <Toggle value={useCurrentLocation} onChange={setUseCurrentLocation} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Set Destination */}
              <div>
                <SectionLabel>Set Destination</SectionLabel>
                <div className="flex gap-3 items-stretch">
                  <MapThumbnail type="dest" />
                  <div className="flex-1 flex flex-col gap-2 justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                      <Crosshair size={13} className="text-gray-400" />
                      <span>Drag this to pin</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-gray-700 mb-1">Address</p>
                      <input
                        value={destAddress}
                        onChange={e => setDestAddress(e.target.value)}
                        placeholder="e.g., 123 Taft Ave, Manila"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] bg-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Options */}
              <div>
                <SectionLabel>Route Options</SectionLabel>
                <p className="text-[12px] text-gray-500 mb-2.5">(e.g., Avoid Tolls, Fastest, Scenic)</p>
                <div className="flex gap-2 flex-wrap">
                  {ROUTE_OPTIONS.map(opt => {
                    const active = selectedOptions.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleOption(opt.key)}
                        className="px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors"
                        style={
                          active
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

              <div className="h-2" />
            </div>

            {/* Preview Route button */}
            <div className="px-4 pt-2 pb-6 bg-white border-t border-gray-100">
              <button
                onClick={handlePreview}
                className="w-full py-4 rounded-2xl text-white text-[16px] font-bold active:opacity-90 transition-opacity"
                style={{ backgroundColor: '#1d4ed8' }}
              >
                Preview Route
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
