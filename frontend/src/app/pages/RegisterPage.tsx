import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, Search, ArrowRight, Loader2, ShieldCheck, Zap, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import bgImage from '../../assets/background.png';
import Prism from '../components/ui/Prism';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, register } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(name, email, password);
      toast.success('Registration Successful!', { description: 'Please sign in with your new account.' });
      navigate('/login');
    } catch (error: any) {
      toast.error('Registration Failed', { description: error.message || 'Protocol error during data ingestion.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-sky-50 to-white font-sans p-6 relative overflow-hidden">
      
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05] mix-blend-multiply scale-110"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100/20 via-sky-100/20 to-white/40 backdrop-blur-[1px] z-10"></div>
        <div className="absolute inset-0 z-0 opacity-20">
           <Prism
            animationType="rotate"
            timeScale={0.2}
            height={5}
            baseWidth={7}
            scale={4.0}
            hueShift={280}
            colorFrequency={0.5}
            noise={0}
            glow={0.5}
          />
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="p-4 bg-sky-500 rounded-[2rem] shadow-2xl shadow-sky-200 mb-6 group cursor-pointer hover:rotate-12 transition-transform duration-500">
            <Search className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">EaseFind<span className="text-sky-500">.AI</span></h1>
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Create Account</p>
        </div>

        {/* Register Card */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-[3rem] p-10 border border-pink-100 shadow-2xl shadow-pink-200/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest ml-1">Full Name</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <User size={18} />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/80 border-pink-50 pl-14 py-7 text-slate-800 placeholder:text-slate-300 focus:border-sky-500 focus:ring-0 rounded-2xl shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest ml-1">Personnel Email</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <Input
                    type="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/80 border-pink-50 pl-14 py-7 text-slate-800 placeholder:text-slate-300 focus:border-sky-500 focus:ring-0 rounded-2xl shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-800 text-[10px] font-black uppercase tracking-widest ml-1">Secure Key</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-sky-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create access key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/80 border-pink-50 pl-14 pr-14 py-7 text-slate-800 placeholder:text-slate-300 focus:border-sky-500 focus:ring-0 rounded-2xl shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-5 flex items-center text-slate-400 hover:text-pink-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black uppercase tracking-[0.3em] py-8 rounded-[1.5rem] text-[11px] transition-all shadow-2xl shadow-slate-200 active:scale-[0.98] disabled:opacity-70 group relative overflow-hidden"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <span className="flex items-center justify-center gap-3">
                  Submit <Zap size={18} className="group-hover:scale-110 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-pink-50 text-center">
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
              Already Registered?{' '}
              <Link to="/login" className="text-sky-500 hover:text-sky-600 transition-colors">
                Personnel Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Footer */}
        <div className="mt-12 flex items-center justify-center gap-4 text-slate-400 animate-pulse">
          <ShieldCheck size={16} />
          <span className="text-[9px] font-black uppercase tracking-[0.4em]">End-to-End Neural Encryption Active</span>
        </div>
      </div>
    </div>
  );
}