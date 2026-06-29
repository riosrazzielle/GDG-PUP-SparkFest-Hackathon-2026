import { useState } from 'react';
import { X, ThumbsUp, MessageCircle, Share2, CheckCircle, Clock, RefreshCw, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { LandscapeThumb } from './LandscapeThumb';
import type { MapPin as MapPinType } from '../types';
import { HAZARD_COLORS } from '../types';

interface Props {
  pin: MapPinType;
  onClose: () => void;
}

const statusConfig = {
  pending: { label: 'Pending', Icon: Clock, color: '#6b7280' },
  acknowledged: { label: 'Acknowledged', Icon: CheckCircle, color: '#2563eb' },
  'in-progress': { label: 'In Progress', Icon: RefreshCw, color: '#d97706' },
  resolved: { label: 'Resolved', Icon: CheckCircle, color: '#16a34a' },
};

export function ReportDetailPanel({ pin, onClose }: Props) {
  const [upvoted, setUpvoted] = useState(false);
  const [upvotes, setUpvotes] = useState(pin.upvotes);
  const { bg, label: hazardLabel } = HAZARD_COLORS[pin.hazardLevel];
  const { label: statusLabel, Icon: StatusIcon, color: statusColor } = statusConfig[pin.status];

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="absolute inset-0 bg-white z-50 flex flex-col overflow-hidden"
    >
      {/* Hero image */}
      <div className="relative flex-shrink-0" style={{ height: 220 }}>
        <LandscapeThumb className="w-full h-full" />
        {/* Close button over image */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <X size={18} />
        </button>
        {/* Hazard badge over image */}
        <div className="absolute bottom-3 left-4">
          <span
            className="text-[11px] font-bold text-white px-3 py-1 rounded-full"
            style={{ backgroundColor: bg }}
          >
            {hazardLabel}
          </span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-8">
          {/* Title */}
          <h2 className="text-[18px] font-extrabold text-gray-900 leading-snug mb-1">{pin.title}</h2>
          <p className="text-[13px] text-gray-500 mb-3">{pin.description.slice(0, 80)}…</p>

          {/* Reporter row */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-gray-600">
                {pin.reportedBy.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-gray-900">@{pin.reportedBy}</p>
              <p className="text-[11px] text-gray-400">{pin.timeAgo}</p>
            </div>
            {/* Status */}
            <span
              className="flex items-center gap-1 text-[11px] font-semibold"
              style={{ color: statusColor }}
            >
              <StatusIcon size={11} />
              {statusLabel}
            </span>
          </div>

          {/* Location row */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2.5 mb-4">
            <MapPin size={14} className="text-gray-500 flex-shrink-0" />
            <p className="text-[13px] text-gray-700">{pin.address}</p>
          </div>

          {/* Details section */}
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Details</p>
          <p className="text-[14px] text-gray-700 leading-relaxed mb-4">{pin.description}</p>

          {/* Combined reports note */}
          {pin.threadCount > 1 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-3 py-2.5 mb-4">
              <p className="text-[13px] text-blue-700 font-medium">
                {pin.threadCount} reports combined — multiple users reported this incident.
              </p>
            </div>
          )}

          {/* Second user entry */}
          <div className="flex items-start gap-2 mb-4 bg-gray-50 rounded-2xl p-3">
            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-600">U2</span>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-gray-800">user234</p>
              <p className="text-[11px] text-gray-400 mb-1">8 mins ago</p>
              <p className="text-[13px] text-gray-700 leading-snug">
                Confirming — the area is still flooded. Stay away from Tondo Market entrance.
              </p>
            </div>
          </div>

          {/* Photo thumbnails */}
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">Photos ({pin.threadCount + 1})</p>
          <div className="flex gap-2 mb-5">
            <LandscapeThumb className="flex-1 rounded-xl" style={{ height: 80 } as React.CSSProperties} />
            <LandscapeThumb className="flex-1 rounded-xl" style={{ height: 80 } as React.CSSProperties} />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mb-4" />

          {/* Interaction row */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => { setUpvoted(v => !v); setUpvotes(v => upvoted ? v - 1 : v + 1); }}
              className="flex items-center gap-2 text-[14px] font-semibold"
              style={{ color: upvoted ? '#16a34a' : '#6b7280' }}
            >
              <ThumbsUp size={18} />
              {upvotes}
            </button>
            <button className="flex items-center gap-2 text-[14px] font-semibold text-gray-500">
              <MessageCircle size={18} />
              Reply
            </button>
            <div className="flex-1" />
            <button className="flex items-center gap-2 text-[14px] font-semibold text-gray-500">
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
