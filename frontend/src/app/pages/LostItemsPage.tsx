import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, MapPin, User, Trash2 } from "lucide-react";
import { Package } from "lucide-react";
import { Button } from "../components/ui/button";
import ConfirmModal from "../components/ui/ConfirmModal";
import { getLostItems, deleteLostItem, UPLOADS_URL } from "../services/api";
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

export default function LostItemsPage() {
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
    fetchLostItems();
  }, [showGlobal]);

  const fetchLostItems = async () => {
    try {
      const data = await getLostItems(showGlobal ? undefined : user?.userId);

      const mappedData = data.map((item: any) => ({
        id: item.itemId,
        itemName: item.itemName,
        category: item.category || "Other",
        description: item.description || "",
        contactInfo: item.user?.email || "",
        date: item.dateLost,
        location: item.location,
        image: item.imagePath ? `${UPLOADS_URL}/${item.imagePath}` : null,
        userName: item.user?.name || "Unknown",
        userId: item.user?.userId || "",
        type: "lost",
        createdAt: "",
        status: item.status || "PENDING"
      }));

      setItems(mappedData);

    } catch (error) {
      console.error("Error fetching lost items:", error);
    }
  };

  const handleDelete = (id: string | number) => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Item",
      message: "Are you sure you want to clear this item from your records?",
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteLostItem(id);
          toast.success("Item cleared successfully");
          fetchLostItems();
        } catch (error: any) {
          toast.error(error.message || "Failed to clear item");
        }
      }
    });
  };

  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Lost Items",
      message: "Are you sure you want to clear ALL lost items? This cannot be undone.",
      type: 'danger',
      onConfirm: async () => {
        try {
          for (const item of items) {
            await deleteLostItem(item.id);
          }
          toast.success("All items cleared successfully");
          fetchLostItems();
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
          <h2 className="text-3xl text-slate-800 font-black tracking-tighter uppercase">Lost Items</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">Search items reported as lost on campus.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowGlobal(!showGlobal)}
            className={`px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm border ${
              showGlobal 
                ? "bg-sky-500 text-white border-sky-400" 
                : "bg-white text-slate-500 border-pink-100"
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
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-md shadow-pink-100"
          >
            Report Lost
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] p-20 text-center border border-pink-100 shadow-xl">
          <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package size={40} className="text-pink-300" />
          </div>
          <p className="text-slate-800 text-2xl font-black mb-2 uppercase tracking-tight">No lost items reported yet</p>
          <p className="text-slate-500 text-lg font-medium">Lost items will appear here once reported by the community.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="group bg-white/60 backdrop-blur-2xl rounded-[1.75rem] shadow-lg border border-pink-50 overflow-hidden hover:-translate-y-1 transition-all duration-500 flex flex-col h-full"
            >
              <div className="relative aspect-video overflow-hidden border-b border-pink-50">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.itemName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-pink-50/30 flex items-center justify-center">
                    <Package size={48} className="text-pink-200" />
                  </div>
                )}
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-4 left-4 p-3 bg-white/90 backdrop-blur-md hover:bg-pink-500 hover:text-white text-pink-500 rounded-xl shadow-lg transition-all z-30"
                  title="Clear Item"
                >
                  <Trash2 size={18} />
                </button>

                <div className="absolute top-4 right-4 bg-pink-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">
                  LOST
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl text-slate-800 mb-2 font-black tracking-tight line-clamp-1 group-hover:text-sky-600 transition-colors">
                  {item.itemName}
                </h3>
                <p className="text-[13px] text-slate-500 mb-4 line-clamp-2 leading-relaxed font-medium">
                  {item.description}
                </p>

                <div className="space-y-3 mt-auto">
                  <div className="flex items-center gap-3 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                    <MapPin size={18} className="text-sky-500" />
                    <span className="text-slate-600 text-sm font-bold line-clamp-1">
                      {item.location}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-sky-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-sky-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest line-clamp-1">
                        {item.userName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-pink-50">
                    <p className="text-[10px] text-pink-400 font-black mb-2 uppercase tracking-widest">Contact Information</p>
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