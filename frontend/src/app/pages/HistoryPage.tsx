import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  getLostItems,
  getFoundItems,
  getMatches,
  getNotifications,
  BASE_URL,
} from '../services/api';
import {
  PackageSearch,
  MapPin,
  Sparkles,
  Bell,
  Clock,
  Filter,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Search,
  MessageCircle,
} from 'lucide-react';

type EventType = 'LOST' | 'FOUND' | 'MATCH' | 'NOTIFICATION';

interface HistoryEvent {
  id: string;
  type: EventType;
  title: string;
  subtitle: string;
  detail: string;
  date: Date;
  status?: string;
  imageUrl?: string | null;
  actionUrl?: string;
}

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  LOST: {
    label: 'Lost Report',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: <AlertTriangle size={18} className="text-rose-500" />,
  },
  FOUND: {
    label: 'Found Report',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: <Search size={18} className="text-sky-500" />,
  },
  MATCH: {
    label: 'AI Match',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <Sparkles size={18} className="text-emerald-500" />,
  },
  NOTIFICATION: {
    label: 'Notification',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    icon: <Bell size={18} className="text-violet-500" />,
  },
};

function timeLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function dayLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupByDay(events: HistoryEvent[]): { day: string; events: HistoryEvent[] }[] {
  const map = new Map<string, HistoryEvent[]>();
  for (const e of events) {
    const key = e.date.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([key, evts]) => ({ day: dayLabel(new Date(key)), events: evts }));
}

const FILTERS: { label: string; value: EventType | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Lost', value: 'LOST' },
  { label: 'Found', value: 'FOUND' },
  { label: 'AI Matches', value: 'MATCH' },
  { label: 'Notifications', value: 'NOTIFICATION' },
];

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EventType | 'ALL'>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

  const FOUR_DAYS_AGO = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchAll();
  }, [user, refreshKey]);

  const fetchAll = async () => {
    if (!user) return;
    try {
      const [lostRaw, foundRaw, matchRaw, notifRaw] = await Promise.allSettled([
        getLostItems(user.userId),
        getFoundItems(user.userId),
        getMatches(user.userId),
        getNotifications(user.userId),
      ]);

      const collected: HistoryEvent[] = [];

      // Lost Items
      if (lostRaw.status === 'fulfilled' && Array.isArray(lostRaw.value)) {
        for (const item of lostRaw.value) {
          const date = new Date(item.dateLost || item.createdAt || item.date);
          if (isNaN(date.getTime()) || date < FOUR_DAYS_AGO) continue;
          collected.push({
            id: `lost-${item.id}`,
            type: 'LOST',
            title: item.itemName || 'Lost Item',
            subtitle: item.category || '',
            detail: item.description || 'No description provided.',
            date,
            status: item.status,
            imageUrl: item.imageUrl || item.image || null,
            actionUrl: '/dashboard/lost-items',
          });
        }
      }

      // Found Items
      if (foundRaw.status === 'fulfilled' && Array.isArray(foundRaw.value)) {
        for (const item of foundRaw.value) {
          const date = new Date(item.dateFound || item.createdAt || item.date);
          if (isNaN(date.getTime()) || date < FOUR_DAYS_AGO) continue;
          collected.push({
            id: `found-${item.id}`,
            type: 'FOUND',
            title: item.itemName || 'Found Item',
            subtitle: item.category || '',
            detail: item.description || 'No description provided.',
            date,
            status: item.status,
            imageUrl: item.imageUrl || item.image || null,
            actionUrl: '/dashboard/found-items',
          });
        }
      }

      // AI Matches
      if (matchRaw.status === 'fulfilled' && Array.isArray(matchRaw.value)) {
        for (const m of matchRaw.value) {
          const date = new Date(m.matchDate || m.createdAt || Date.now());
          if (isNaN(date.getTime()) || date < FOUR_DAYS_AGO) continue;
          collected.push({
            id: `match-${m.id}`,
            type: 'MATCH',
            title: `${m.lostItem?.itemName || 'Item'} ↔ ${m.foundItem?.itemName || 'Item'}`,
            subtitle: `${Math.round(m.confidence || 0)}% confidence`,
            detail: `Reasons: ${(m.matchReason || []).join(', ') || 'AI visual & text similarity'}`,
            date,
            status: m.status,
            actionUrl: `/dashboard/match-results?matchId=${m.id}`,
          });
        }
      }

      // Notifications
      if (notifRaw.status === 'fulfilled' && Array.isArray(notifRaw.value)) {
        for (const n of notifRaw.value) {
          const date = new Date(n.createdAt);
          if (isNaN(date.getTime()) || date < FOUR_DAYS_AGO) continue;
          collected.push({
            id: `notif-${n.id}`,
            type: 'NOTIFICATION',
            title: n.title || 'Notification',
            subtitle: n.type || '',
            detail: n.message || '',
            date,
            actionUrl: n.actionUrl,
          });
        }
      }

      // Sort newest first
      collected.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(collected);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = activeFilter === 'ALL' ? events : events.filter(e => e.type === activeFilter);
  const grouped = groupByDay(filtered);

  const stats = {
    LOST: events.filter(e => e.type === 'LOST').length,
    FOUND: events.filter(e => e.type === 'FOUND').length,
    MATCH: events.filter(e => e.type === 'MATCH').length,
    NOTIFICATION: events.filter(e => e.type === 'NOTIFICATION').length,
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl text-slate-800 font-black tracking-tighter uppercase flex items-center gap-3">
            <Clock size={28} className="text-sky-500" />
            Activity History
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Your last 4 days — Lost, Found, Matches & Alerts
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-2 px-5 py-3 bg-white/60 hover:bg-sky-50 text-slate-500 hover:text-sky-600 border border-pink-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(Object.entries(stats) as [EventType, number][]).map(([type, count]) => {
          const cfg = TYPE_CONFIG[type];
          return (
            <div
              key={type}
              onClick={() => setActiveFilter(activeFilter === type ? 'ALL' : type)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all duration-300 ${
                activeFilter === type
                  ? `${cfg.bg} ${cfg.border} shadow-md scale-105`
                  : 'bg-white/50 border-pink-50 hover:border-pink-100 hover:bg-white/70'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                  {cfg.icon}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-3xl font-black text-slate-800">{count}</p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Last 4 days</p>
            </div>
          );
        })}
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeFilter === f.value
                ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-100'
                : 'bg-white/50 text-slate-400 border-pink-50 hover:border-sky-200 hover:text-sky-600'
            }`}
          >
            <Filter size={10} className="inline mr-1.5 -mt-0.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-20 text-center border border-pink-100 shadow-xl">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Loading your history...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-20 text-center border border-pink-100 shadow-xl">
          <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <PackageSearch size={40} className="text-sky-300" />
          </div>
          <p className="text-slate-800 text-2xl font-black mb-2 uppercase tracking-tight">No activity found</p>
          <p className="text-slate-500 text-sm font-medium">
            No {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} activity in the past 4 days.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ day, events: dayEvents }) => (
            <div key={day}>
              {/* Day Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="px-4 py-1.5 bg-white/70 backdrop-blur-xl rounded-xl border border-pink-100 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{day}</span>
                </div>
                <div className="flex-1 h-px bg-pink-100" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-4 pl-2 border-l-2 border-dashed border-pink-100 ml-3">
                {dayEvents.map(event => {
                  const cfg = TYPE_CONFIG[event.type];
                  return (
                    <div
                      key={event.id}
                      className="relative ml-6 group"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-[2.15rem] top-5 w-4 h-4 rounded-full border-2 border-white shadow-md ${cfg.bg} flex items-center justify-center`}>
                        <div className={`w-2 h-2 rounded-full ${
                          event.type === 'LOST' ? 'bg-rose-400' :
                          event.type === 'FOUND' ? 'bg-sky-400' :
                          event.type === 'MATCH' ? 'bg-emerald-400' : 'bg-violet-400'
                        }`} />
                      </div>

                      <div className={`bg-white/60 backdrop-blur-2xl rounded-2xl p-5 border ${cfg.border} border-opacity-50 hover:shadow-lg hover:border-opacity-100 transition-all duration-300 group-hover:bg-white/80`}>
                        <div className="flex items-start gap-4">
                          {/* Image thumbnail */}
                          {event.imageUrl && (
                            <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-pink-50 shadow-sm">
                              <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>
                          )}

                          {/* No image — type icon */}
                          {!event.imageUrl && (
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                              {cfg.icon}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                {cfg.label}
                              </span>
                              {event.status && (
                                <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                  event.status === 'RESOLVED'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {event.status}
                                </span>
                              )}
                            </div>

                            <h3 className="text-slate-800 font-black text-base tracking-tight mb-0.5 truncate">
                              {event.title}
                            </h3>
                            {event.subtitle && (
                              <p className={`text-[10px] font-black uppercase tracking-widest ${cfg.color} mb-1`}>
                                {event.subtitle}
                              </p>
                            )}
                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 font-medium">
                              {event.detail}
                            </p>
                          </div>

                          <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">
                              {timeLabel(event.date)}
                            </span>
                            {event.actionUrl && (
                              <button
                                onClick={() => navigate(event.actionUrl!)}
                                className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${cfg.color} hover:opacity-70 transition-opacity`}
                              >
                                View <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
