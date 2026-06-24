import React, { useState } from 'react';
import { Home, Search, Library, Heart, PlusSquare, X } from 'lucide-react';
import SMLogo from './SMLogo';

const Sidebar: React.FC<{ onClose?: () => void, onNavigate?: (view: string) => void, currentView?: string }> = ({ onClose, onNavigate, currentView = 'home' }) => {
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const navigate = (view: string) => {
    onNavigate?.(view);
    onClose?.();
  };

  return (
    <div className="w-64 glass-panel text-white h-screen flex flex-col border-r border-white/5 relative">
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-6 right-4 p-2 text-white/50 hover:text-white"
      >
        <PlusSquare className="w-6 h-6 rotate-45" />
      </button>

      <div className="p-6 flex items-center gap-3">
        <SMLogo className="w-8 h-8 text-white" />
        <h1 className="text-2xl font-bold tracking-tighter font-sans bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">shareMusic</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2.5 overflow-y-auto scrollbar-hide">
        <div onClick={() => navigate('home')}><NavItem icon={<Home className="w-5 h-5" />} label="Главная" active={currentView === 'home' || currentView === 'playlist-detail'} /></div>
        <div onClick={() => navigate('search')}><NavItem icon={<Search className="w-5 h-5" />} label="Поиск" active={currentView === 'search'} /></div>
        <div onClick={() => navigate('liked')}><NavItem icon={<Heart className="w-5 h-5" />} label="Любимые треки" active={currentView === 'liked'} /></div>
      </nav>

      {/* AADS Banner Ad */}
      <div className="px-6 py-4 flex flex-col items-center border-t border-white/5 bg-white/[0.01]">
        <span className="text-[10px] text-white/30 tracking-widest uppercase font-mono mb-2">Реклама</span>
        <div className="w-[130px] h-[130px] flex items-center justify-center bg-black/20 rounded-lg border border-white/5">
          <iframe 
            data-aa="2445570" 
            src="//ad.a-ads.com/2445570/?size=125x125" 
            style={{ border: 'none', padding: 0, width: '125px', height: '125px', overflow: 'hidden', display: 'block' }}
          />
        </div>
      </div>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => setIsLegalOpen(true)}
          className="text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors text-left"
        >
          Правовая информация
        </button>
      </div>

      {/* Modern, high-contrast Modal for Legal Disclaimer */}
      {isLegalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-[#0b0b0e]/90 backdrop-blur-2xl border border-white/10 rounded-2xl max-w-md w-full p-6 text-white relative shadow-2xl">
            <button 
              onClick={() => setIsLegalOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <SMLogo className="w-6 h-6 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Правовая информация</h2>
            </div>
            
            <div className="space-y-4 text-sm text-white/60 leading-relaxed mb-6 font-sans">
              <p>
                Данная стриминг-платформа является исключительно <strong>независимым фанатским проектом</strong>, созданным в ознакомительных целях. 
              </p>
              <p>
                Мы никак <strong>не связаны, не аффилированы и не спонсируемся</strong> оригинальной платформой. Этот проект представляет собой авторскую концепцию, созданную исключительно из вдохновения оригинальным словом и страсти к музыке и технологиям.
              </p>
            </div>

            <button 
              onClick={() => setIsLegalOpen(false)}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-all text-sm tracking-wide"
            >
              Понятно / I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <div className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${active ? 'glass-btn glass-btn-active text-white shadow-md shadow-black/30' : 'text-white/50 hover:text-white/90 hover:bg-white/5'}`}>
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </div>
);

export default Sidebar;
