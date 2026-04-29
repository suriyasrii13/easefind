import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Package, Search, CheckCircle, MessageCircle, Globe, Trash2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import { 
  getNotifications, 
  getGlobalNotifications, 
  markNotificationAsRead, 
  deleteNotification,
  clearAllNotifications,
  Notification 
} from '../services/api';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const { refreshUnreadCount } = useOutletContext<{ refreshUnreadCount: () => void }>();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    onConfirm: () => {},
  });

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [privateData, globalData] = await Promise.all([
        getNotifications(user.userId),
        getGlobalNotifications()
      ]);

      const combined = [...privateData, ...globalData].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(combined);
      setLoading(false);
      
      const unreadPrivateIds = privateData.filter(n => !n.isRead).map(n => n.id);
      if (unreadPrivateIds.length > 0) {
        await Promise.all(unreadPrivateIds.map(id => markNotificationAsRead(id)));
        refreshUnreadCount();
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      refreshUnreadCount();
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = () => {
    if (!user || notifications.length === 0) return;
    
    setConfirmModal({
      isOpen: true,
      onConfirm: async () => {
        try {
          await clearAllNotifications(user.userId);
          setNotifications([]);
          refreshUnreadCount();
          toast.success("All notifications cleared");
        } catch (error) {
          toast.error("Failed to clear notifications");
        }
      }
    });
  };

  const getNotificationStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'GLOBAL':
        return {
          icon: <div className="p-3 bg-sky-500/10 rounded-xl"><Globe className="text-sky-500" size={20} /></div>,
          badge: 'Public Alert',
        };
      case 'CHAT':
        return {
          icon: <div className="p-3 bg-pink-500/10 rounded-xl"><MessageCircle className="text-pink-500" size={20} /></div>,
          badge: 'Message',
        };
      case 'FOUND':
        return {
          icon: <div className="p-3 bg-sky-500/10 rounded-xl"><Search className="text-sky-500" size={20} /></div>,
          badge: 'Found',
        };
      case 'MATCH':
        return {
          icon: <div className="p-3 bg-emerald-500/10 rounded-xl"><CheckCircle className="text-emerald-500" size={20} /></div>,
          badge: 'Match',
        };
      case 'LOST':
      default:
        return {
          icon: <div className="p-3 bg-rose-500/10 rounded-xl"><Package className="text-rose-500" size={20} /></div>,
          badge: 'Lost Item',
        };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 relative z-10">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl text-slate-800 font-black tracking-tighter uppercase">Notifications</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Stay updated with your intelligence alerts.</p>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={handleClearAll}
            className="flex items-center gap-2 px-6 py-3 bg-white/50 text-slate-500 hover:text-rose-500 border border-pink-100 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {['ALL', 'UNREAD', 'MATCHES', 'CHATS'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${
              activeTab === tab 
                ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-100' 
                : 'bg-white/50 text-slate-400 border-pink-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-16 text-center animate-pulse border border-pink-100">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Syncing Data...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-16 text-center border border-pink-100 shadow-xl">
          <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-pink-300" />
          </div>
          <p className="text-slate-800 text-2xl font-black mb-2 uppercase tracking-tight">All caught up!</p>
          <p className="text-slate-500 text-sm font-medium">No new notifications detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.filter(n => {
            if (activeTab === 'ALL') return true;
            if (activeTab === 'UNREAD') return !n.isRead;
            if (activeTab === 'MATCHES') return n.type === 'MATCH';
            if (activeTab === 'CHATS') return n.type === 'CHAT';
            return true;
          }).map((notification) => {
            const style = getNotificationStyle(notification.type);
            const isUnread = !notification.isRead && notification.recipientId !== 0;
            
            return (
              <div
                key={notification.id}
                className={`group relative bg-white/60 backdrop-blur-2xl rounded-[1.75rem] shadow-md p-6 border border-pink-50 transition-all hover:shadow-lg ${
                  isUnread ? 'border-l-4 border-l-sky-500' : ''
                }`}
              >
                <button 
                  onClick={() => handleDelete(notification.id)}
                  className="absolute top-6 right-6 p-3 text-slate-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {style.icon}
                  </div>
                  <div className="flex-1 pr-12">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg text-slate-800 font-black tracking-tight">
                        {notification.title}
                      </h3>
                      {isUnread && (
                        <span className="px-3 py-1 bg-sky-500 text-white text-[8px] rounded-lg font-black uppercase tracking-widest shadow-md">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mb-4 leading-relaxed font-medium">{notification.message}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-pink-50 mt-auto">
                      <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase">{formatDate(notification.createdAt)}</p>
                      
                      {notification.actionUrl && (
                        <button
                          onClick={() => navigate(notification.actionUrl!)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-600 hover:text-sky-700 group/btn"
                        >
                          {notification.actionText || 'View'} 
                          <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title="Clear All Notifications"
        message="Are you sure you want to clear all your notifications? This cannot be undone."
        type="danger"
      />
    </div>
  );
}