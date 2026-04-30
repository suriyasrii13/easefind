import { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { 
  LayoutDashboard, 
  HelpCircle, 
  Phone, 
  Settings, 
  Bell, 
  MessageSquare,
  Menu,
  Search,
  X,
  LogOut,
  Home
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { 
  getUnreadNotificationCount, 
  getGlobalNotifications, 
  getNotifications, 
  markNotificationAsRead,
  SOCKET_URL
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import AIChatPanel from '../components/AIChatPanel';
import bgImage from '../../assets/background.png';
import Prism from '../components/ui/Prism';

import UserGuideModal from '../components/UserGuideModal';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const fetchInitialUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await getUnreadNotificationCount(user.userId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch initial notification count:", error);
    }
  };

  // ─── WebSocket: connect ONCE per login session, not on every navigation ───
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    fetchInitialUnreadCount();

    const socket = new SockJS(SOCKET_URL, null, { timeout: 10000 });
    const stompClient = new Client({
      webSocketFactory: () => socket as any,
      reconnectDelay: 10000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        // Subscribe to personal notifications
        stompClient.subscribe(`/topic/user_${user.userId}`, (message) => {
          const notification = JSON.parse(message.body);
          setUnreadCount((prev) => prev + 1);
          toast.message(notification.title, {
            description: notification.message,
            duration: 6000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0'
            }
          });
        });
      },
      onStompError: () => {
        // Silently handle errors — polling fallback will catch missed notifications
      }
    });

    stompClient.activate();

    // ─── Polling fallback: refresh unread count every 30s ───────────────────
    const pollInterval = setInterval(() => {
      fetchInitialUnreadCount();
    }, 30000);

    return () => {
      stompClient.deactivate();
      clearInterval(pollInterval);
    };

  }, [user]); // ✅ Only depends on user — NOT location.pathname


  const contextValue = { unreadCount, refreshUnreadCount: fetchInitialUnreadCount };
  const isActive = (path: string) => location.pathname === path;

  // ─── Navigation progress bar (separate from WebSocket) ──────────────────
  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (

    <div className="min-h-screen relative text-slate-800 overflow-x-hidden bg-gradient-to-br from-pink-50 via-sky-50 to-white font-sans">
      
      {/* Top Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 h-1 bg-sky-500 z-[100] animate-pulse transition-all duration-500 shadow-[0_0_10px_#0ea5e9]" style={{ width: '100%' }}></div>
      )}

      {/* Universal Premium Soft Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08] mix-blend-multiply"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-200/30 via-sky-200/30 to-white/30 backdrop-blur-[2px] z-10"></div>
        <div className="absolute inset-0 z-0 opacity-25">
           <Prism
            animationType="rotate"
            timeScale={0.1}
            height={4}
            baseWidth={6}
            scale={4}
            hueShift={280}
            colorFrequency={0.5}
            noise={0}
            glow={0.6}
          />
        </div>
      </div>

      {/* Top Navigation Bar - Soft Glass */}
      <nav className="sticky top-0 z-40 bg-white/40 backdrop-blur-2xl h-[72px] shadow-sm border-b border-pink-100">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between h-full px-8 relative z-10">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
            <span className="text-2xl font-black tracking-tighter text-slate-800">EaseFind<span className="text-sky-500">.AI</span></span>
            <span className="ml-3 px-2 py-1 bg-sky-500/10 text-sky-500 text-[10px] font-black rounded-lg border border-sky-100 uppercase tracking-tighter">v1.2 - Optimized</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            {[
              { to: "/dashboard/report-item", label: "Report Item" },
              { to: "/dashboard/lost-items", label: "Lost Items" },
              { to: "/dashboard/found-items", label: "Found Items" },
              { to: "/dashboard/match-results", label: "Match Results" },
              { to: "/dashboard/gis-map", label: "GIS Map" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                  isActive(link.to) 
                    ? "text-sky-600 border-b-2 border-sky-500 pb-1" 
                    : "text-slate-400 hover:text-pink-500"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setIsGuideOpen(true)} className="text-slate-400 hover:text-pink-500 transition-all">
              <HelpCircle size={20} />
            </button>
            <button onClick={() => navigate('/')} className="text-slate-400 hover:text-sky-500 transition-all">
              <Home size={20} />
            </button>

            <Link to="/dashboard/notifications" className="relative text-slate-400 hover:text-pink-500 transition-all">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-white"></span>
              )}
            </Link>

            <button onClick={() => setIsChatOpen(!isChatOpen)} className="text-slate-400 hover:text-sky-500 transition-all">
              <MessageSquare size={20} />
            </button>
            
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-pink-500 transition-all border border-pink-50 shadow-sm"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex relative z-10">
        {/* Soft Pink Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[72px] left-0 h-[calc(100vh-72px)] bg-white/30 backdrop-blur-3xl z-30 transition-all duration-300 border-r border-pink-100
            ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-64'}
          `}
        >
          <nav className="p-6 space-y-4">
            {[
              { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-sky-500" },
              { to: "/dashboard/help", label: "Help", icon: HelpCircle, color: "text-pink-500" },
              { to: "/dashboard/contact", label: "Contact Us", icon: Phone, color: "text-sky-500" },
              { to: "/dashboard/settings", label: "Settings", icon: Settings, color: "text-pink-500" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 font-black uppercase tracking-widest text-[9px] ${
                  isActive(item.to)
                    ? "bg-white text-slate-800 border border-pink-100 shadow-md"
                    : "text-slate-400 hover:bg-white/50 hover:text-sky-500"
                }`}
              >
                <item.icon size={18} className={`${item.color}`} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 lg:p-12 min-h-[calc(100vh-72px)]">
          <div className="max-w-7xl mx-auto">
            <Outlet context={contextValue} />
          </div>
        </main>
      </div>

      <AIChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-pink-900/20 backdrop-blur-sm z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
}