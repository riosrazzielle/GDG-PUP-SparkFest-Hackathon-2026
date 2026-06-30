import { Plus, Pencil, Trash2, FileText, MapPin } from 'lucide-react';
import { LandscapeThumb } from './LandscapeThumb';
import type { UserReport } from '../types';

interface Props {
  reports: UserReport[];
  onAddReport: () => void;
  onEditReport?: (report: UserReport) => void;
  onDeleteReport?: (reportId: string, pinId: string) => void;
}

const statusStyle: Record<string, string> = {
  pending: 'border-blue-400 text-blue-600 bg-blue-50',
  acknowledged: 'border-blue-400 text-blue-600 bg-blue-50',
  'in-progress': 'border-amber-400 text-amber-600 bg-amber-50',
  resolved: 'border-green-400 text-green-600 bg-green-50',
  confirmed: 'border-black text-black',
  rejected: 'border-red-400 text-red-500',
};

function ReportCard({ 
  report, 
  onEdit, 
  onDelete 
}: { 
  report: UserReport, 
  onEdit?: () => void, 
  onDelete?: () => void 
}) {
  const isResolved = report.status === 'resolved';
  const displayStatus = isResolved ? 'Resolved' : 'Active';
  const activeStyle = isResolved ? statusStyle.resolved : statusStyle.pending;

  const CATEGORIES: Record<string, string> = {
    'flood': 'Flood',
    'traffic': 'Traffic',
    'fallen-pole': 'Fallen Pole',
    'car-crash': 'Car Crash',
    'road-work': 'Road Work',
    'fire': 'Fire',
    'hazard': 'Road Hazard',
    'other': 'Other'
  };
  const categoryName = report.typeKey ? CATEGORIES[report.typeKey] || report.typeName : report.typeName;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-3.5 py-3 mb-3 shadow-sm relative">
      <div className="flex items-center gap-3">
        {report.photo || (report.photos && report.photos.length > 0) ? (
          <img src={report.photos?.[0] || report.photo} alt="Thumbnail" className="w-[72px] h-[72px] rounded-xl object-cover" />
        ) : (
          <LandscapeThumb className="w-[72px] h-[72px] rounded-xl" />
        )}
        <div className="flex-1 min-w-0 flex flex-col justify-between" style={{ minHeight: '72px' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <p className="text-[14px] font-bold text-gray-900 truncate">{categoryName}</p>
              <span className={`flex-shrink-0 text-[10px] font-bold border rounded-full px-2 py-0.5 leading-none ${activeStyle}`}>
                {displayStatus}
              </span>
            </div>
            {report.status === 'pending' && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button 
                  onClick={onEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit Report"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={onDelete}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Report"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
          <p className="text-[12px] text-gray-500 truncate">{report.moreDetails}</p>
          <p className="text-[11px] text-gray-500 font-medium">{report.date} <span className="text-gray-300 mx-1">|</span> {report.time}</p>
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 truncate flex-1">{report.location}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportsView({ reports, onAddReport, onEditReport, onDeleteReport }: Props) {
  return (
    <div className="absolute inset-0 bg-gray-50 z-40 flex flex-col">
      <div className="px-4 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
        <h2 className="text-[20px] font-extrabold text-gray-900">My Reports</h2>
        <p className="text-[12px] text-gray-400 mt-0.5">{reports.length} report{reports.length !== 1 ? 's' : ''} submitted</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <FileText size={36} className="text-gray-300 mb-3" />
            <p className="text-[14px] font-bold text-gray-400">No reports submitted</p>
            <p className="text-[12px] text-gray-400 mt-1">Tap + to report your first hazard</p>
          </div>
        ) : (
          reports.map(r => (
            <ReportCard 
              key={r.id} 
              report={r} 
              onEdit={() => onEditReport?.(r)}
              onDelete={() => onDeleteReport?.(r.id, r.pinId)}
            />
          ))
        )}
      </div>

      <button
        onClick={onAddReport}
        className="group absolute bottom-6 right-5 h-14 w-14 hover:w-auto hover:px-5 bg-black text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ease-in-out active:scale-95 cursor-pointer overflow-hidden"
      >
        <span className="font-extrabold text-[13px] tracking-wide whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:mr-1.5 transition-all duration-300 ease-in-out">
          Add New Report
        </span>
        <Plus size={20} className="flex-shrink-0" />
      </button>
    </div>
  );
}
