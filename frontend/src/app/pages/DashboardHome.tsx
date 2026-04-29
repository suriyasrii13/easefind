import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router';
import { Package, Search, CheckCircle, TrendingUp, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL, deleteLostItem, deleteFoundItem, deleteMatch } from '../services/api';
import { toast } from 'sonner';

export default function DashboardHome() {

  const { user } = useAuth();

  const [statsData, setStatsData] = useState({
    lost: 0,
    found: 0,
    matches: 0,
    successRate: 0
  });

  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    // 📊 Fetch stats
    axios.get(`${BASE_URL}/dashboard/stats`)
      .then(res => setStatsData(res.data))
      .catch(err => console.error(err));

    // 🕒 Fetch recent activity feed (Filtered for speed)
    const fetchActivity = async () => {
      if (!user) return;
      try {
        const [lost, found, matches] = await Promise.all([
          axios.get(`${BASE_URL}/lost-items?userId=${user.userId}`),
          axios.get(`${BASE_URL}/found-items?userId=${user.userId}`),
          axios.get(`${BASE_URL}/match?userId=${user.userId}`)
        ]);

        const combined = [
          ...lost.data.map((i: any) => ({ ...i, id: i.itemId, type: 'lost', time: i.createdAt || i.dateLost })),
          ...found.data.map((i: any) => ({ ...i, id: i.itemId, type: 'found', time: i.createdAt || i.dateFound })),
          ...matches.data.map((i: any) => ({ ...i, id: i.matchId, type: 'match', time: i.matchDate || new Date() }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5); 

        setActivities(combined);
      } catch (err) {
        console.error("Activity fetch failed:", err);
      }
    };

    fetchActivity();
    
    // Add to window for external access if needed (or just keep it local)
    (window as any).refreshActivity = fetchActivity;
  }, [user]);

  const fetchActivity = () => (window as any).refreshActivity?.();

  const handleDeleteActivity = async (id: any, type: string) => {
    try {
      if (type === 'lost') await deleteLostItem(id);
      else if (type === 'found') await deleteFoundItem(id);
      else if (type === 'match') await deleteMatch(id);
      
      toast.success(`${type.toUpperCase()} removed`);
      fetchActivity();
      
      // Update stats too
      axios.get(`${BASE_URL}/dashboard/stats`)
        .then(res => setStatsData(res.data));
    } catch (error) {
      toast.error("Failed to remove activity");
    }
  };

  const stats = [
    { label: 'Total Lost Items', value: statsData.lost, icon: Package, color: 'bg-[#FCA5A5]/20 text-[#DC2626]' },
    { label: 'Total Found Items', value: statsData.found, icon: Search, color: 'bg-[#93C5FD]/20 text-[#2563EB]' },
    { label: 'Matches Found', value: statsData.matches, icon: CheckCircle, color: 'bg-[#86EFAC]/20 text-[#16A34A]' },
    { label: 'Success Rate', value: Number(statsData.successRate).toFixed(1) + "%", icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ];

  const quickActions = [
    { label: 'Report Lost Item', path: '/dashboard/report-item', color: 'bg-[#FCA5A5] hover:bg-[#FCA5A5]/90' },
    { label: 'Report Found Item', path: '/dashboard/report-item', color: 'bg-[#93C5FD] hover:bg-[#93C5FD]/90' },
    { label: 'View Matches', path: '/dashboard/match-results', color: 'bg-[#86EFAC] hover:bg-[#86EFAC]/90' },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <div className="bg-[#1e293b]/90 backdrop-blur-xl text-white p-12 rounded-[2rem] shadow-2xl relative overflow-hidden group border border-white/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Welcome back, {user?.fullName}!</h2>
          <p className="text-slate-300 text-lg max-w-2xl font-medium leading-relaxed">
            Track your lost items, view real-time AI matches, and manage your reported belongings all in one place.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass p-8 rounded-[2rem] shadow-xl border border-white/60 hover:scale-105 transition-all duration-300 group">
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:shadow-md transition-all`}>
              <stat.icon size={28} />
            </div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="text-4xl text-[#1e293b] font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-2xl mb-8 text-[#1e293b] font-bold tracking-tight">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.path}
              className={`${action.color} text-slate-900 p-10 rounded-[2rem] shadow-xl transition-all hover:-translate-y-2 hover:shadow-2xl border border-white/40 flex flex-col items-center justify-center group`}
            >
              <p className="text-2xl font-black text-center">{action.label}</p>
              <div className="mt-4 w-12 h-1 bg-black/10 rounded-full group-hover:w-20 transition-all"></div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass p-10 rounded-[2.5rem] shadow-xl border border-white/60">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl text-[#1e293b] font-bold tracking-tight">Recent Activity</h3>
          <Link to="/dashboard/notifications" className="text-blue-600 font-bold hover:bg-blue-50/50 px-4 py-2 rounded-xl transition-all">View All</Link>
        </div>

        <div className="space-y-6">
          {activities.length === 0 ? (
            <p className="text-slate-500 text-center py-10">No recent activity protocol detected.</p>
          ) : (
            activities.map((act, i) => (
              <div key={i} className="flex items-center gap-6 p-6 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 hover:bg-white hover:shadow-lg transition-all group animate-in fade-in slide-in-from-bottom-2 relative">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                  act.type === 'lost' ? 'bg-rose-100 text-rose-600' : 
                  act.type === 'found' ? 'bg-blue-100 text-blue-600' : 
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {act.type === 'lost' ? <Package size={28} /> : 
                   act.type === 'found' ? <Search size={28} /> : 
                   <CheckCircle size={28} />}
                </div>
                <div className="flex-1 pr-12">
                  <p className="text-lg text-[#1e293b] font-bold">
                    {act.type === 'match' 
                      ? `AI Match: ${act.lostItem?.itemName} & ${act.foundItem?.itemName}`
                      : `${act.type === 'lost' ? 'Lost' : 'Found'} item "${act.itemName}" reported`}
                  </p>
                  <p className="text-slate-500 font-medium text-sm">
                    {new Date(act.time).toLocaleDateString()} • By {act.user?.fullName || act.user?.name || act.finder?.fullName || act.finder?.name || 'Anonymous'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-5 py-2 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${
                    act.type === 'lost' ? 'bg-rose-500 shadow-rose-200' : 
                    act.type === 'found' ? 'bg-blue-500 shadow-blue-200' : 
                    'bg-emerald-500 shadow-emerald-200'
                  }`}>
                    {act.type}
                  </div>
                  <button
                    onClick={() => handleDeleteActivity(act.id, act.type)}
                    className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Remove from history"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}