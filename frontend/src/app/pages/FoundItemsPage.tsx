import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../contexts/AuthContext";
import { Calendar, MapPin, User, Phone, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getFoundItems, deleteFoundItem, UPLOADS_URL } from "../services/api";
import { toast } from "sonner";

interface Item {
  id: string;
  userId: string;
  userName: string;
  type: string;
  itemName: string;
  category: string;
  description: string;
  contactInfo: string;
  date: string;
  location: string;
  image: string | null;
  createdAt: string;
  status: string;
}

export default function FoundItemsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showGlobal, setShowGlobal] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  useEffect(() => {
    fetchFoundItems();
  }, [showGlobal]);

  const fetchFoundItems = async () => {
    try {
      const data = await getFoundItems(showGlobal ? undefined : user?.userId);
      
      const mappedData = data.map((item: any) => ({
        id: item.itemId,
        itemName: item.itemName,
        category: item.category || "Other",
        description: item.description || "",
        contactInfo: item.contactInfo || item.finder?.email || "",
        date: item.dateFound,
        location: item.location,
        image: item.imagePath ? `${UPLOADS_URL}/${item.imagePath}` : null,
        userName: item.finder?.name || "Unknown",
        userId: item.finder?.userId || "",
        type: "found",
        createdAt: "",
        status: item.status || "PENDING"
      }));

      setItems(mappedData);
    } catch (error) {
      console.error("Error fetching found items:", error);
    }
  };

  const handleDelete = (id: string | number) => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Item",
      message: "Are you sure you want to clear this item from the found database?",
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteFoundItem(id);
          toast.success("Item cleared successfully");
          fetchFoundItems();
        } catch (error: any) {
          toast.error(error.message || "Failed to clear item");
        }
      }
    });
  };

  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Found Items",
      message: "Are you sure you want to clear ALL found items? This cannot be undone.",
      type: 'danger',
      onConfirm: async () => {
        try {
          for (const item of items) {
            await deleteFoundItem(item.id);
          }
          toast.success("All items cleared successfully");
          fetchFoundItems();
        } catch (error: any) {
          toast.error("Failed to clear some items");
        }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 relative z-10 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl text-slate-800 font-black tracking-tighter uppercase">Found Items</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Search items reported as found on campus.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowGlobal(!showGlobal)}
            className={`px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm border ${
              showGlobal 
                ? "bg-pink-500 text-white border-pink-400" 
                : "bg-white text-slate-500 border-sky-100"
            }`}
          >
            {showGlobal ? "System History Active" : "Personal Records"}
          </Button>
          {items.some(i => i.userId?.toString() === user?.userId?.toString()) && (
            <Button 
              onClick={handleClearAll}
              className="bg-white/50 text-slate-500 hover:text-rose-500 border border-pink-100 px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm"
            >
              Clear My Items
            </Button>
          )}
          <Button 
            onClick={() => navigate('/dashboard/report-item')}
            className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-md shadow-sky-100"
          >
            Report Found
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[3rem] p-20 text-center border border-sky-100 shadow-xl">
          <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-sky-300" />
          </div>
          <p className="text-slate-800 text-2xl font-black mb-2 uppercase tracking-tight">No found items reported yet</p>
          <p className="text-slate-500 text-lg font-medium">Found items will appear here once reported by the community.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-white/60 backdrop-blur-2xl rounded-[1.75rem] shadow-lg border border-sky-50 overflow-hidden hover:-translate-y-1 transition-all duration-500 flex flex-col h-full"
            >
              <div className="relative aspect-video overflow-hidden border-b border-sky-50">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.itemName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-sky-50/30 flex items-center justify-center">
                    <Search size={48} className="text-sky-200" />
                  </div>
                )}
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-md hover:bg-pink-500 hover:text-white text-pink-500 rounded-xl shadow-lg transition-all z-30"
                  title="Clear Item"
                >
                  <Trash2 size={18} />
                </button>

                <div className="absolute top-4 right-4 bg-sky-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">
                  FOUND
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl text-slate-800 mb-2 font-black tracking-tight line-clamp-1 group-hover:text-pink-600 transition-colors">
                  {item.itemName}
                </h3>
                <p className="text-[13px] text-slate-500 mb-4 line-clamp-2 leading-relaxed font-medium">
                  {item.description}
                </p>

                <div className="space-y-3 mt-auto">
                  <div className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                    <MapPin size={18} className="text-pink-500" />
                    <span className="text-slate-600 text-sm font-bold line-clamp-1">
                      {item.location}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-pink-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-pink-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest line-clamp-1">
                        {item.userName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-sky-50">
                    <p className="text-[10px] text-sky-400 font-black mb-2 uppercase tracking-widest">Contact Information</p>
                    <p className="text-sm text-slate-800 font-black tracking-widest">
                      {item.contactInfo}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}