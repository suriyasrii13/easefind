import { useState } from 'react';
import { MapPin, Upload, Mic, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import { reportItem, BASE_URL } from "../services/api";


export default function ReportItemPage() {
  const { user } = useAuth();
  const [itemType, setItemType] = useState<'lost' | 'found'>('lost');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isTextMode, setIsTextMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const categories = ['Electronics', 'Personal Items', 'Documents', 'Accessories', 'Clothing', 'Keys', 'Bags', 'Jewelry', 'Other'];
  const campusLocations = ['Classroom', 'Library', 'Canteen', 'Lab', 'Hostel', 'Playground', 'Auditorium', 'Parking Area', 'Other'];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEnableLocation = () => {
    if (navigator.geolocation) {
      setIsFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${position.coords.longitude},${position.coords.latitude}&f=pjson`);
            const data = await res.json();
            if (data && data.address && data.address.Match_addr) {
              setLocation(data.address.Match_addr);
            } else {
              setLocation(`Lat: ${position.coords.latitude.toFixed(4)}, Long: ${position.coords.longitude.toFixed(4)}`);
            }
          } catch(e) {
            setLocation(`Lat: ${position.coords.latitude.toFixed(4)}, Long: ${position.coords.longitude.toFixed(4)}`);
          } finally {
            setIsFetchingLocation(false);
          }
        },
        () => {
          setIsFetchingLocation(false);
          toast.error("Unable to retrieve location");
        }
      );
    }
  };

  const handleManualParse = async () => {
    if (!manualText.trim()) {
      toast.error("Please enter some text for the AI to parse.");
      return;
    }
    setIsParsing(true);
    try {
      const res = await fetch(`${BASE_URL}/voice/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: manualText })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.suggestion || errData.error || "AI Service is offline or unreachable.");
      }
      
      const data = await res.json();
      if (data.itemName) setItemName(data.itemName);
      
      // Robust category matching
      if (data.category) {
        const matchedCat = categories.find(c => c.toLowerCase() === data.category.toLowerCase());
        if (matchedCat) setCategory(matchedCat);
      }
      
      if (data.description) setDescription(data.description);
      if (data.location) setLocation(data.location);
      if (data.date) setDate(data.date);
      if (data.itemType) setItemType(data.itemType);
      
      toast.success("AI has filled the details successfully!");
      setIsTextMode(false);
      setManualText('');
    } catch (e: any) {
      toast.error("AI Parsing Failed", { description: e.message });
    } finally {
      setIsParsing(false);
    }
  };

  const handleVoiceAssistant = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice recognition not supported. Please use manual type mode.");
      setIsTextMode(true);
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Microphone active. Please speak your item details...", { duration: 3000 });
    };
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsParsing(true);
      try {
        const res = await fetch(`${BASE_URL}/voice/parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.suggestion || errData.error || "AI Service is offline or unreachable.");
        }
        
        const data = await res.json();
        if (data.itemName) setItemName(data.itemName);
        
        // Robust category matching
        if (data.category) {
          const matchedCat = categories.find(c => c.toLowerCase() === data.category.toLowerCase());
          if (matchedCat) setCategory(matchedCat);
        }
        
        if (data.description) setDescription(data.description);
        if (data.location) setLocation(data.location);
        if (data.date) setDate(data.date);
        if (data.itemType) setItemType(data.itemType);
        
        toast.success("AI has filled the details successfully!", {
          description: "Review the filled fields below."
        });
      } catch (e: any) { 
        console.error("AI parse error:", e);
        toast.error("AI Parsing Failed", {
          description: e.message || "Please try again."
        }); 
      } finally { 
        setIsParsing(false); 
      }
    };
    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        toast.error("Microphone Access Denied", { 
          description: "Please allow microphone access or use manual type mode.",
          duration: 6000 
        });
      } else if (event.error === 'network') {
        toast.error("Network Error", { description: "Browser speech service is unavailable. Switching to manual type mode." });
        setIsTextMode(true);
      } else {
        toast.error("Voice Recognition Error", { description: `Error: ${event.error}.` });
      }
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const resetForm = () => {
    setItemName(''); setCategory(''); setDescription(''); setContactInfo('');
    setDate(''); setLocation(''); setStorageLocation('');
    setImagePreview(null); setImageFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Per-field validation — tells user exactly what's missing
    const missingFields: string[] = [];
    if (!itemName.trim())     missingFields.push('Item Name');
    if (!category)            missingFields.push('Category');
    if (!date)                missingFields.push('Date');
    if (!description.trim())  missingFields.push('Description');
    if (!location)            missingFields.push(itemType === 'lost' ? 'Lost Location' : 'Found Location');
    if (!contactInfo.trim())  missingFields.push('Contact Information');
    if (itemType === 'found' && !storageLocation.trim()) missingFields.push('Current Storage Location');

    if (missingFields.length > 0) {
      toast.error(`Required: Please fill in the ${missingFields[0]}`, {
        description: "This field is mandatory for reporting.",
        duration: 4000
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user || !user.userId) {
        throw new Error("User session expired. Please log in again.");
      }

      const formData = new FormData();
      formData.append("itemType", itemType);
      formData.append("userId", user.userId.toString());  
      formData.append("itemName", itemName);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("contactInfo", contactInfo);
      formData.append("dateLost", date);
      formData.append("location", location);
      if (itemType === "found") formData.append("storageLocation", storageLocation || "N/A");
      if (imageFile) formData.append("image", imageFile);

      await reportItem(formData);
      toast.success("Item reported successfully!");
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to report item");
    } finally { setIsSubmitting(false); }
  };


  return (
    <div className="max-w-2xl mx-auto pb-12 relative z-10">
      <div className="bg-white/60 backdrop-blur-3xl rounded-[2.5rem] shadow-xl p-8 border border-pink-100">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl text-slate-800 font-black tracking-tight flex items-center gap-2 uppercase leading-none">
              Report Item
            </h2>
            <p className="text-slate-500 font-medium mt-1 text-xs">Intelligent Intelligence Protocol</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
               <Button
                type="button"
                onClick={() => setIsTextMode(!isTextMode)}
                className={`rounded-2xl w-12 h-12 transition-all ${
                  isTextMode ? "bg-pink-500 text-white" : "bg-white text-slate-400 border border-pink-100"
                } shadow-md flex items-center justify-center`}
                title="Type mode"
              >
                <Sparkles size={18} />
              </Button>
              <Button
                type="button"
                onClick={handleVoiceAssistant}
                disabled={isListening || isParsing}
                className={`rounded-2xl px-6 py-6 transition-all ${
                  isListening ? "bg-pink-500 animate-pulse" : "bg-sky-500 hover:bg-sky-600"
                } text-white shadow-lg flex items-center gap-3`}
              >
                {isParsing ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
                <span className="font-black text-[10px] uppercase tracking-widest">{isParsing ? "Parsing..." : isListening ? "Listening..." : "AI Assist"}</span>
              </Button>
            </div>
            {isTextMode && (
              <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                <Input 
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Describe your item (e.g. Lost my blue wallet today at library)"
                  className="bg-white/80 border-pink-100 text-[10px] py-4 rounded-xl shadow-sm w-64"
                  onKeyDown={(e) => e.key === 'Enter' && handleManualParse()}
                />
                <Button 
                  onClick={handleManualParse}
                  disabled={isParsing}
                  className="bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded-xl px-4"
                >
                  Parse
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mb-8 bg-white/40 p-1.5 rounded-2xl border border-pink-50 shadow-sm">
          <button type="button" onClick={() => setItemType('lost')} className={`flex-1 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${itemType === 'lost' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400'}`}>Report Lost</button>
          <button type="button" onClick={() => setItemType('found')} className={`flex-1 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${itemType === 'found' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400'}`}>Report Found</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-5">
            <div>
              <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-2 block">Item Name *</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Laptop, Keys" className="bg-white/80 border-pink-50 text-slate-800 text-xs py-5 rounded-xl shadow-sm" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-2 block">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-white/80 border-pink-50 text-slate-800 text-xs py-5 rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-pink-50">
                    {categories.map((cat) => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-2 block">Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/80 border-pink-50 text-slate-800 text-xs py-5 rounded-xl shadow-sm" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-2 block">Description *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." className="bg-white/80 border-pink-50 text-slate-800 min-h-[100px] text-xs p-4 rounded-xl shadow-sm" />
          </div>

          {itemType === 'lost' && (
            <div>
              <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-2 block">Lost Location *</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="bg-white/80 border-pink-50 text-slate-800 text-xs py-5 rounded-xl">
                  <SelectValue placeholder="Select where you lost it (Classroom, Library, etc.)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-pink-50">
                  {campusLocations.map((loc) => <SelectItem key={loc} value={loc} className="text-xs">{loc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {itemType === 'found' && (
            <div className="bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-pink-50 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-3 block">Found Location *</Label>
                <div className="flex gap-2 mb-3">
                  <Button type="button" onClick={handleEnableLocation} disabled={isFetchingLocation} className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase tracking-widest text-[8px] py-4 rounded-xl">
                    <MapPin size={14} className="mr-2" /> {isFetchingLocation ? 'Locating...' : 'Auto-detect'}
                  </Button>
                </div>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where did you find it? (e.g., Canteen, near exit)" className="bg-white border-pink-50 text-slate-800 text-xs py-5 rounded-xl" />
              </div>
              <div>
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-3 block">Current Storage Location *</Label>
                <Input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} placeholder="Where is it now? (e.g., Security, My Desk)" className="bg-white border-pink-50 text-slate-800 text-xs py-5 rounded-xl" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest mb-2 block">Contact Information *</Label>
            <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Email or Phone" className="bg-white/80 border-pink-50 text-slate-800 text-xs py-5 rounded-xl shadow-sm" />
          </div>

          <div className="bg-white/40 backdrop-blur-md rounded-2xl p-6 border border-pink-50 text-center">
            <Label className="text-slate-800 text-[9px] font-black uppercase tracking-widest mb-4 block">Image Evidence</Label>
            <div className="relative cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
              {imagePreview ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white"><img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /></div>
              ) : (
                <div className="aspect-video rounded-2xl border-2 border-dashed border-pink-100 bg-white/50 flex flex-col items-center justify-center hover:bg-sky-50 transition-all"><Upload size={24} className="text-pink-300 mb-2" /><p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Upload Protocol</p></div>
              )}
              <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-6 rounded-2xl text-[10px] transition-all shadow-lg group">
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <span>Submit <Sparkles size={14} className="inline ml-2 text-sky-400" /></span>}
            </Button>
            
            <Button 
              type="button" 
              onClick={() => setIsClearModalOpen(true)}
              className="w-full bg-white/50 text-slate-400 hover:text-rose-500 border border-pink-100 font-black uppercase tracking-widest py-4 rounded-xl text-[9px] transition-all"
            >
              <Trash2 size={14} className="mr-2" /> Clear All Data
            </Button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={resetForm}
        title="Reset Form"
        message="Are you sure you want to clear all data in this report? This cannot be undone."
        type="danger"
      />
    </div>
  );
}