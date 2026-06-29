import { useState, useRef, useEffect } from 'react';
import {
  Droplets, TreePine, HardHat, Car, Zap, Flame, Mountain, AlertTriangle,
  Locate, ChevronDown, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapBackground } from './MapBackground';
import { LandscapeThumb } from './LandscapeThumb';
import type { MapPin, HazardLevel, HazardFilter } from '../types';
import { HAZARD_COLORS } from '../types';

const reportIcons: Record<string, React.ElementType> = {
  flood: Droplets,
  'fallen-tree': TreePine,
  'road-work': HardHat,
  'car-crash': Car,
  'fallen-pole': Zap,
  fire: Flame,
  landslide: Mountain,
  other: AlertTriangle,
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
  onAddReport?: () => void;
  onOpenDetail: (pin: MapPin) => void;
}

/* ── Single component: pin + tooltip as one unit ── */
function PinWithTooltip({
  pin,
  mapWidth,
  selected,
  onClick,
  onViewMore,
}: {
  pin: MapPin;
  mapWidth: number;
  selected: boolean;
  onClick: () => void;
  onViewMore: () => void;
}) {
  const { bg } = HAZARD_COLORS[pin.hazardLevel];
  const Icon = reportIcons[pin.type] ?? AlertTriangle;

  // Nudge tooltip left/right so it doesn't overflow the map edges.
  // Tooltip is 230px wide, centered on the pin.
  // pin.x is 0–100. Center pixel ≈ pin.x / 100 * mapWidth.
  const centerPx = (pin.x / 100) * mapWidth;
  const half = 115; // 230 / 2
  let nudge = 0;
  if (centerPx - half < 8) nudge = 8 - (centerPx - half);       // too close to left
  if (centerPx + half > mapWidth - 8) nudge = (mapWidth - 8) - (centerPx + half);   // too close to right

  return (
    // Wrapper positioned so its BOTTOM EDGE sits at (pin.x%, pin.y%) on the map.
    // The pin teardrop hangs down from here; the tooltip floats up from here.
    <div
      className="absolute"
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        transform: 'translate(-50%, -100%)',
        width: 32,
        height: 42,
      }}
    >
      {/* ── Tooltip: bottom:100% guarantees it's above the pin wrapper ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 8 }}
            transition={{ type: 'spring', damping: 22, stiffness: 400 }}
            className="absolute z-20 pointer-events-auto"
            style={{
              bottom: '100%',       // top of pin wrapper = bottom of tooltip zone
              marginBottom: 6,      // small gap between arrow tip and pin head
              left: `calc(50% + ${nudge}px)`,
              transform: 'translateX(-50%)',
              width: 230,
            }}
          >
            {/* Unified drop-shadow for card + arrow */}
            <div style={{ filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.22))' }}>

              {/* Card: thumbnail LEFT, text RIGHT */}
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
                      onClick={e => { e.stopPropagation(); onViewMore(); }}
                      className="text-[11px] font-bold"
                      style={{ color: '#1d4ed8' }}
                    >
                      View more
                    </button>
                  </div>
                </div>
              </div>

              {/* Downward arrow pointing at the pin */}
              <div className="flex justify-center" style={{ marginTop: -1 }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '12px solid white',
                }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Teardrop pin button ── */}
      <button
        onClick={onClick}
        className="absolute inset-0 focus:outline-none active:scale-95 transition-transform"
      >
        <div className="relative w-full h-full">
          {/* Shadow blob */}
          <div
            className="absolute bottom-0 left-1/2 rounded-full opacity-20"
            style={{ width: 14, height: 5, transform: 'translateX(-50%)', background: '#000', filter: 'blur(2px)' }}
          />
          {/* Teardrop */}
          <svg width="32" height="42" viewBox="0 0 32 42" fill="none">
            <path
              d="M16 2C9.373 2 4 7.373 4 14C4 23 16 40 16 40C16 40 28 23 28 14C28 7.373 22.627 2 16 2Z"
              fill={bg} stroke="white" strokeWidth="2"
            />
            <circle cx="16" cy="14" r="7" fill="white" fillOpacity="0.25" />
          </svg>
          {/* Icon */}
          <div className="absolute flex items-center justify-center" style={{ top: 6, left: 7, width: 18, height: 18 }}>
            <Icon size={13} color="white" strokeWidth={2.5} />
          </div>
          {/* Thread count badge */}
          {pin.threadCount > 1 && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-[9px] font-bold flex items-center justify-center shadow"
              style={{ color: bg, border: `2px solid ${bg}` }}
            >
              {pin.threadCount}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

/* ── Filter dropdown ── */
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold shadow-lg border"
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
            className="absolute top-full mt-2 left-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30"
            style={{ transform: 'translateX(-50%)', minWidth: 200 }}
          >
            {FILTERS.map(f => {
              const color = f.key !== 'all' ? HAZARD_COLORS[f.key as HazardLevel] : null;
              const isActive = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { onChange(f.key); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
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

/* ── MapView ── */
export function MapView({ pins, onOpenDetail }: Props) {
  const [filter, setFilter] = useState<HazardFilter>('all');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidth] = useState(430);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setMapWidth(entry.contentRect.width || 430);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const visible = filter === 'all' ? pins : pins.filter(p => p.hazardLevel === filter);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#f0ebe0]">
      {/* Map */}
      <div className="absolute inset-0 overflow-hidden">
        <MapBackground />
      </div>

      {/* Backdrop — dismiss on map tap, sits below pins */}
      {selectedPinId && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setSelectedPinId(null)}
        />
      )}

      {/* Pins (each manages its own tooltip as a child) */}
      {visible.map(pin => (
        <PinWithTooltip
          key={pin.id}
          pin={pin}
          mapWidth={mapWidth}
          selected={selectedPinId === pin.id}
          onClick={() => setSelectedPinId(id => id === pin.id ? null : pin.id)}
          onViewMore={() => { onOpenDetail(pin); setSelectedPinId(null); }}
        />
      ))}

      {/* Filter dropdown — centred at top */}
      <div className="absolute top-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <FilterDropdown
            filter={filter}
            onChange={f => { setFilter(f); setSelectedPinId(null); }}
          />
        </div>
      </div>

      {/* Locate button */}
      <button
        className="absolute right-3 bottom-3 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600"
      >
        <Locate size={18} />
      </button>
    </div>
  );
}
