import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, HelpCircle, Zap, ArrowRight, Brain, ShieldCheck } from 'lucide-react';
import bgImage from '../../assets/background.png';
import Prism from '../components/ui/Prism';
import TextType from '../components/ui/TextType';
import UserGuideModal from '../components/UserGuideModal';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isGuideOpen, setIsGuideOpen] = useState(false);



  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-sky-50 to-white font-sans text-slate-800 overflow-x-hidden relative">
      
      {/* Premium Soft Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05] mix-blend-multiply scale-110 animate-slow-zoom"
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

      {/* Header / Navbar */}
      <nav className="fixed w-full z-50 transition-all duration-300 bg-white/40 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2.5 bg-sky-500 rounded-2xl shadow-lg shadow-sky-200 group-hover:rotate-12 transition-transform duration-500">
              <Search className="text-white h-6 w-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-800">EaseFind<span className="text-sky-500">.AI</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-sky-500 transition-colors">
              <HelpCircle className="w-4 h-4" />
              How It Works
            </button>
            <a href="#intelligence" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-sky-500 transition-colors">Intelligence</a>
            <a href="#protocols" className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-sky-500 transition-colors">Protocols</a>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => { if(user) logout(); navigate('/login'); }}
              className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-sky-500 transition-colors"
            >
              Sign In
            </button>
            <Link to="/register" className="bg-slate-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-slate-200 hover:bg-slate-900 hover:-translate-y-1 active:scale-95">
              Register Now
            </Link>
          </div>
        </div>
      </nav>

      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* Hero Section */}
      <div className="relative z-10 pt-48 pb-32 lg:pt-64 lg:pb-48">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/60 backdrop-blur-xl border border-pink-100 text-pink-500 text-[10px] font-black uppercase tracking-[0.3em] mb-12 shadow-sm">
            <Zap size={14} className="fill-pink-500 animate-pulse" />
            <span>Neural Reconciliation Engine v4.0</span>
          </div>

          <div className="mb-8">
             <TextType 
              text={["EaseFind.AI"]}
              typingSpeed={120}
              pauseDuration={3000}
              className="text-4xl lg:text-5xl font-black tracking-[0.2em] uppercase text-sky-500"
            />
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-black text-slate-800 tracking-tighter mb-10 leading-[1.05]">
            Recover what matters <br />
            <TextType 
              text={["faster than ever.", "with AI precision.", "across the campus.", "safely and securely."]}
              typingSpeed={70}
              pauseDuration={2000}
              deletingSpeed={40}
              showCursor={true}
              cursorCharacter="|"
              className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-pink-500 to-indigo-500"
            />
          </h1>
          
          <p className="text-xl lg:text-2xl text-slate-500 mb-16 max-w-3xl mx-auto leading-relaxed font-medium">
            Advanced computer vision and neural matching to reunite lost belongings with their owners in record time.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-32">
            <Link to="/register" className="w-full sm:w-auto bg-sky-500 text-white px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-sky-200 hover:bg-sky-600 hover:-translate-y-2 flex items-center justify-center gap-4 group active:scale-95">
              Submit Report <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <button 
              onClick={() => { if(user) logout(); navigate('/login'); }}
              className="w-full sm:w-auto bg-white/60 backdrop-blur-xl text-slate-800 px-12 py-6 rounded-3xl font-black uppercase tracking-widest text-sm transition-all border border-pink-100 hover:bg-white flex items-center justify-center gap-4 shadow-sm active:scale-95"
            >
              Sign In Now
            </button>
          </div>

          {/* Stats Grid */}
          <div id="protocols" className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto py-20 border-t border-pink-100">
            {[
              { label: 'Security', val: '100%', sub: 'ENCRYPTED' },
              { label: 'Efficiency', val: 'INSTANT', sub: 'MATCHING' },
              { label: 'Intelligence', val: '99.9%', sub: 'ACCURACY' },
              { label: 'Scope', val: 'GLOBAL', sub: 'COVERAGE' }
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center group cursor-default">
                <span className="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-pink-500 transition-colors duration-500">{stat.val}</span>
                <span className="text-[10px] text-sky-500 uppercase tracking-[0.3em] font-black mt-2 opacity-60 group-hover:opacity-100 transition-opacity">{stat.sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="intelligence" className="py-48 relative z-10 bg-white/40 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-32">
            <h2 className="text-5xl lg:text-7xl font-black text-slate-800 tracking-tighter mb-8 uppercase">Operational Excellence</h2>
            <p className="text-slate-500 text-xl font-medium leading-relaxed">Systematic reunification protocols powered by next-generation artificial intelligence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { 
                icon: <Brain size={36} />, 
                title: 'Neural Analysis', 
                desc: 'Deep learning models analyze item characteristics to identify potential matches with surgical precision.',
              },
              { 
                icon: <ShieldCheck size={36} />, 
                title: 'Secure Custody', 
                desc: 'Verification keys ensure that items are returned only to their verified legal owners.',
              },
              { 
                icon: <Zap size={36} />, 
                title: 'Real-time Sync', 
                desc: 'Instant notifications across all devices as soon as an intelligence match is detected.',
              }
            ].map((feature) => (
              <div key={feature.title} className="bg-white/80 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-pink-50 hover:-translate-y-4 transition-all duration-700 group shadow-xl">
                <div className={`w-20 h-20 bg-sky-500/10 text-sky-500 rounded-3xl flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 group-hover:bg-sky-500 group-hover:text-white group-hover:shadow-xl group-hover:shadow-sky-200`}>
                  {feature.icon}
                </div>
                <h3 className="text-3xl font-black text-slate-800 mb-6 tracking-tight group-hover:text-pink-500 transition-colors">{feature.title}</h3>
                <p className="text-slate-500 text-lg leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white text-slate-800 py-24 relative overflow-hidden border-t border-pink-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-12 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500 rounded-lg">
              <Search className="text-white h-6 w-6" />
            </div>
            <span className="text-3xl font-black tracking-tighter">EaseFind<span className="text-sky-500">.AI</span></span>
          </div>
          <div className="flex gap-12">
            {['Privacy', 'Terms', 'Network', 'Support'].map(link => (
              <a key={link} href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-sky-500 transition-colors">{link}</a>
            ))}
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} Global Intelligence. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
