import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { MapView } from './components/MapView';
import { BottomNav } from './components/BottomNav';
import { NotificationsPanel } from './components/NotificationsPanel';
import { RoutesView } from './components/RoutesView';
import { ReportsView } from './components/ReportsView';
import { ProfileView } from './components/ProfileView';
import { AddReportModal } from './components/AddReportModal';
import { ReportDetailPanel } from './components/ReportDetailPanel';
import { AddRouteModal } from './components/AddRouteModal';
import { mockNotifications } from './mockData';
import { useRoutes } from './hooks/useRoutes';
import type { AppPanel, MapPin, UserReport, SavedRoute } from './types';

export default function App() {
  const [activePanel, setActivePanel] = useState<AppPanel>(null);
  const [showAddReport, setShowAddReport] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [editingRoute, setEditingRoute] = useState<SavedRoute | null>(null);
  const [detailPin, setDetailPin] = useState<MapPin | null>(null);
  const [activeRoute, setActiveRoute] = useState<SavedRoute | null>(null);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [language, setLanguage] = useState<'en' | 'fil'>('en');
  const { routes, addRoute, updateRoute, deleteRoute } = useRoutes();
  
  const [pins, setPins] = useState<MapPin[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);

  const fetchPins = () => {
    fetch('/api/pins')
      .then(res => res.json())
      .then(data => setPins(data))
      .catch(err => console.error('Error fetching pins:', err));
  };

  const fetchReports = () => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => setUserReports(data))
      .catch(err => console.error('Error fetching reports:', err));
  };

  useEffect(() => {
    fetchPins();
    fetchReports();
  }, []);

  const unreadCount = notifications.filter(n => n.isNew).length;

  const handlePanelSelect = (panel: AppPanel) => {
    setActivePanel(panel);
  };

  const handleAddReportSubmit = (reportData: { type: string; address: string; description: string; lat: number; lng: number }) => {
    fetch('/api/pins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create report');
        return res.json();
      })
      .then(() => {
        fetchPins();
        fetchReports();
        setShowAddReport(false);
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div
        className="relative flex flex-col bg-white overflow-hidden w-full h-dvh sm:max-w-[768px] sm:h-[min(880px,calc(100vh-120px))] sm:rounded-[32px] sm:border-[6px] sm:border-slate-800 sm:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] lg:max-w-full lg:h-screen lg:rounded-none lg:border-0 lg:shadow-none"
      >
        {/* ── Content area (map + panels) ── */}
        <div className="flex-1 relative overflow-hidden min-h-0">
          {/* Map — always the base layer */}
          <div className="absolute inset-0">
            <MapView
              pins={pins}
              activeRoute={activeRoute}
              onOpenDetail={pin => {
                setActivePanel(null);
                setDetailPin(pin);
              }}
              onClearActiveRoute={() => setActiveRoute(null)}
            />
          </div>

          {/* Pages — shown instantly when a nav tab is selected */}
          {activePanel === 'notifications' && (
            <NotificationsPanel
              notifications={notifications}
              onMarkAllRead={() =>
                setNotifications(prev => prev.map(n => ({ ...n, isNew: false })))
              }
            />
          )}
          {activePanel === 'routes' && (
            <RoutesView
              routes={routes}
              pins={pins}
              onAddRoute={() => {
                setActivePanel(null);
                setShowAddRoute(true);
              }}
              onDeleteRoute={deleteRoute}
              onEditRoute={route => {
                setEditingRoute(route);
                setActivePanel(null);
              }}
              onViewOnMap={route => {
                setActiveRoute(route);
                setActivePanel(null);
              }}
            />
          )}
          {activePanel === 'reports' && (
            <ReportsView
              reports={userReports}
              onAddReport={() => {
                setActivePanel(null);
                setShowAddReport(true);
              }}
            />
          )}
          {activePanel === 'profile' && (
            <ProfileView
              language={language}
              onLanguageToggle={() => setLanguage(l => (l === 'en' ? 'fil' : 'en'))}
            />
          )}
        </div>

        {/* ── Bottom nav — always rendered in document flow, never overlapped ── */}
        <BottomNav
          activePanel={activePanel}
          onSelect={handlePanelSelect}
          unreadCount={unreadCount}
        />

        {/*
          Full-screen modals are rendered INSIDE the phone shell's relative container
          and positioned absolute so they can cover everything including the nav,
          while staying strictly bounded by the container size.
        */}
        <AnimatePresence>
          {detailPin && (
            <ReportDetailPanel
              key="detail"
              pin={detailPin}
              onClose={() => setDetailPin(null)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {(showAddRoute || editingRoute) && (
            <AddRouteModal
              key="add-route"
              editRoute={editingRoute ?? undefined}
              onClose={() => { setShowAddRoute(false); setEditingRoute(null); }}
              onSave={route => {
                if (editingRoute) {
                  updateRoute(editingRoute.id, route);
                } else {
                  addRoute(route);
                }
                setShowAddRoute(false);
                setEditingRoute(null);
              }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showAddReport && (
            <AddReportModal
              key="add-report"
              onClose={() => setShowAddReport(false)}
              onSubmit={handleAddReportSubmit}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
