import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, CheckCircle, Trash2, User, QrCode } from 'lucide-react';
import { Button } from '../components/ui/button';
import PersonalMatchChat from '../components/PersonalMatchChat';
import QRHandshakeModal from '../components/QRHandshakeModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { getMatches, deleteMatch, confirmMatch } from "../services/api";
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
  isConfidential: boolean;
}

interface Match {
  id: string;
  status: string;
  lostItem: Item;
  foundItem: Item;
  confidence: number;
  matchReason: string[];
  matchDate: string;
}

export default function MatchResultsPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const location = useLocation();
  const highlightedMatchId = new URLSearchParams(location.search).get('matchId');
  const matchRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
    if (matches.length > 0 && highlightedMatchId) {
      const element = matchRefs.current[highlightedMatchId];
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [matches, highlightedMatchId]);

  const [viewMode, setViewMode] = useState<'PERSONAL' | 'GLOBAL'>('PERSONAL');

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user, viewMode]);

  const fetchMatches = async () => {
    try {
      if (!user) return;
      
      // Fetch based on selected mode
      const data = viewMode === 'PERSONAL' 
        ? await getMatches(user.userId) 
        : await getMatches(); // No ID = Global fetch
        
      setMatches(data);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const handleConfirmMatch = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Recovery",
      message: "Is the physical item successfully returned to its owner? This will publicly mark the items as MATCH FOUND!",
      type: 'info',
      onConfirm: async () => {
        try {
          // Optimistic UI Update: Mark it as resolved locally so it disappears from 'Pending' list
          setMatches(prev => prev.map(m => m.id === id ? { ...m, status: 'RESOLVED' } : m));
          
          await confirmMatch(id);
          toast.success("Match marked as recovered!");
          setTimeout(fetchMatches, 1000);
        } catch (error: any) {
          toast.error(error.message || "Failed to confirm match");
        }
      }
    });
  };

  const handleDeleteMatch = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Match",
      message: "Are you sure you want to clear this match? The items will become pending again.",
      type: 'danger',
      onConfirm: async () => {
        try {
          // Optimistic UI Update: Remove it from the screen instantly
          setMatches(prev => prev.filter(m => m.id !== id));
          
          await deleteMatch(id);
          toast.success("Match cleared successfully");
          setTimeout(fetchMatches, 1000); // Verify with server after 1s
        } catch (error: any) {
          toast.error(error.message || "Failed to clear match");
        }
      }
    });
  };

  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Matches",
      message: "Are you sure you want to clear ALL matches? This cannot be undone.",
      type: 'danger',
      onConfirm: async () => {
        try {
          for (const match of matches) {
            await deleteMatch(match.id);
          }
          toast.success("All matches cleared successfully");
          fetchMatches();
        } catch (error: any) {
          toast.error("Failed to clear some matches");
        }
      }
    });
  };

  const openChat = (match: Match) => {
    setSelectedMatch(match);
    setIsChatOpen(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl text-slate-800 font-black tracking-tighter uppercase">Match Results</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            AI identifying potential item reunions
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex gap-2 p-1.5 bg-white/30 backdrop-blur-xl rounded-[1.25rem] border border-white/40 shadow-sm">
          <button
            onClick={() => setViewMode('PERSONAL')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'PERSONAL' 
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            My Matches
          </button>
          <button
            onClick={() => setViewMode('GLOBAL')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              viewMode === 'GLOBAL' 
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            Global Discovery
          </button>
        </div>

        {matches.some(m => m.lostItem.userId?.toString() === user?.userId?.toString() || m.foundItem.userId?.toString() === user?.userId?.toString()) && (
          <Button 
            onClick={handleClearAll}
            className="bg-white/50 text-slate-500 hover:text-rose-500 border border-pink-100 px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm"
          >
            Clear List
          </Button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[3rem] p-24 text-center border border-pink-100 shadow-xl">
          <div className="w-24 h-24 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={48} className="text-pink-300" />
          </div>
          <p className="text-slate-800 text-3xl font-black mb-3 tracking-tight uppercase">No matches found yet</p>
          <p className="text-slate-500 text-lg font-medium">
            Our AI is continuously analyzing reports to find your belongings.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {matches.map((match) => {
            const isHighlighted = match.id.toString() === highlightedMatchId;
            return (
            <div
              key={match.id}
              ref={(el) => (matchRefs.current[match.id] = el)}
              className={`bg-white/60 backdrop-blur-2xl rounded-[2rem] p-8 border border-pink-100 relative group overflow-hidden transition-all duration-500 ${match.status === 'RESOLVED' ? 'border-amber-400/30' : 'hover:border-sky-400/30'} ${isHighlighted ? 'ring-2 ring-sky-500 ring-offset-2' : ''}`}
            >
              {match.status === 'RESOLVED' ? (
                <div className="absolute top-4 right-[-45px] bg-amber-500 text-white text-[10px] font-black px-12 py-2 rotate-45 shadow-lg z-20 tracking-widest">
                  RECOVERED
                </div>
              ) : (
                <div className="absolute top-4 right-[-40px] bg-sky-500 text-white text-[10px] font-black px-12 py-2 rotate-45 shadow-lg z-20 tracking-widest">
                  AI MATCH
                </div>
              )}

              <button
                onClick={() => handleDeleteMatch(match.id)}
                className="absolute top-8 right-16 p-4 bg-white/80 backdrop-blur-md hover:bg-pink-500 text-slate-400 hover:text-white rounded-2xl transition-all z-30"
                title="Clear Match"
              >
                <Trash2 size={20} />
              </button>

              <div className="flex items-center justify-between mb-8 flex-wrap gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <CheckCircle className="text-sky-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl text-slate-800 font-black tracking-tight uppercase">{match.status === 'RESOLVED' ? 'Recovered!' : 'AI Analysis Match'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Matched {new Date(match.matchDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 ml-6 bg-white/40 px-4 py-3 rounded-2xl border border-pink-50">
                    <div className="relative w-10 h-10">
                      <svg className="transform -rotate-90 w-10 h-10">
                        <circle cx="20" cy="20" r="17" stroke="#f1f5f9" strokeWidth="4" fill="none" />
                        <circle
                          cx="20" cy="20" r="17" stroke="#0ea5e9" strokeWidth="4" fill="none"
                          strokeDasharray={`${Math.round((match.confidence / 100) * 106.8)} 106.8`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-black text-sky-600">{Math.round(match.confidence)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Score</p>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">AI Precision</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  {(match.lostItem.userId?.toString() === user?.userId?.toString() || 
                    match.foundItem.userId?.toString() === user?.userId?.toString()) ? (
                    <>
                      <Button
                        onClick={() => openChat(match)}
                        className="bg-sky-500 hover:bg-sky-600 text-white font-black uppercase tracking-widest text-[9px] py-4 px-6 rounded-xl transition-all shadow-md"
                      >
                        <MessageSquare size={16} className="mr-2" />
                        Open Chat
                      </Button>
                      
                      {match.status !== 'RESOLVED' && (
                        <Button
                          onClick={() => { setSelectedMatch(match); setIsQRModalOpen(true); }}
                          className="bg-pink-500 hover:bg-pink-600 text-white font-black uppercase tracking-widest text-[9px] py-4 px-6 rounded-xl transition-all shadow-md"
                        >
                          <QrCode size={16} className="mr-2" />
                          {match.lostItem.userId?.toString() === user?.userId?.toString() ? "Generate QR" : "Scan QR"}
                        </Button>
                      )}
                      
                      {match.status !== 'RESOLVED' && (
                        <Button
                          onClick={() => handleConfirmMatch(match.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[9px] py-4 px-6 rounded-xl transition-all shadow-md"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          Mark Recovered
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="bg-white/40 px-6 py-3 rounded-xl border border-pink-50">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        Private Interaction Required
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-8 p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                <p className="text-[11px] text-sky-600 font-black uppercase tracking-widest flex items-center gap-3">
                  <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
                  Key Intelligence Factors: {match.matchReason.join(', ')}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lost Item */}
                <div className="bg-white/40 rounded-[2rem] p-6 border border-pink-50 relative group/item hover:bg-white/60 transition-all duration-500">
                  {match.lostItem.isConfidential && (
                    <div className="absolute top-4 right-4 bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border border-amber-200">
                      🔐 Protected
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 bg-pink-500 text-white text-[8px] rounded-lg font-black tracking-widest uppercase shadow-md">
                      LOST
                    </span>
                    <h4 className="text-xl text-slate-800 font-black tracking-tight uppercase">{match.lostItem.itemName}</h4>
                  </div>
                  {match.lostItem.image && (
                    <div className="rounded-xl overflow-hidden mb-4 shadow-md aspect-video border border-pink-50">
                      <img
                        src={match.lostItem.image}
                        alt={match.lostItem.itemName}
                        className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <p className="text-[13px] text-slate-500 mb-6 leading-relaxed font-medium line-clamp-3">
                    {match.lostItem.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-pink-50">
                    <p className="text-xs text-slate-800 font-black uppercase tracking-widest flex items-center gap-2">
                      <User size={14} className="text-pink-400" />
                      {match.lostItem.userName}
                    </p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                      {new Date(match.lostItem.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Found Item */}
                <div className="bg-white/40 rounded-[2rem] p-6 border border-sky-50 relative group/item hover:bg-white/60 transition-all duration-500">
                  {match.foundItem.isConfidential && (
                    <div className="absolute top-4 right-4 bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border border-amber-200">
                      🔐 Protected
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 bg-sky-500 text-white text-[8px] rounded-lg font-black tracking-widest uppercase shadow-md">
                      FOUND
                    </span>
                    <h4 className="text-xl text-slate-800 font-black tracking-tight uppercase">{match.foundItem.itemName}</h4>
                  </div>
                  {match.foundItem.image && (
                    <div className="rounded-xl overflow-hidden mb-4 shadow-md aspect-video border border-sky-50">
                      <img
                        src={match.foundItem.image}
                        alt={match.foundItem.itemName}
                        className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <p className="text-[13px] text-slate-500 mb-6 leading-relaxed font-medium line-clamp-3">
                    {match.foundItem.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-sky-50">
                    <p className="text-xs text-slate-800 font-black uppercase tracking-widest flex items-center gap-2">
                      <User size={14} className="text-sky-400" />
                      {match.foundItem.userName}
                    </p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                      {new Date(match.foundItem.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

      {selectedMatch && (
        <PersonalMatchChat
          isOpen={isChatOpen}
          onClose={() => { setIsChatOpen(false); setSelectedMatch(null); }}
          match={selectedMatch}
        />
      )}

      {selectedMatch && (
        <QRHandshakeModal
          isOpen={isQRModalOpen}
          onClose={() => { setIsQRModalOpen(false); setSelectedMatch(null); }}
          match={selectedMatch}
          userRole={selectedMatch.lostItem.userId?.toString() === user?.userId?.toString() ? 'owner' : 'finder'}
          onSuccess={fetchMatches}
        />
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