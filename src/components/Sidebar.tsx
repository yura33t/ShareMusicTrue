import React, { useState } from 'react';
import { Home, Search, Heart, PlusSquare, X, LogOut, Info, Settings, Users } from 'lucide-react';
import SMLogo from './SMLogo';

const Sidebar: React.FC<{ onClose?: () => void, onNavigate?: (view: string) => void, currentView?: string }> = ({ onClose, onNavigate, currentView = 'home' }) => {
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const navigate = (view: string) => {
    onNavigate?.(view);
    onClose?.();
  };

  return (
    <div className="w-64 shrink-0 bg-[#08080a] text-zinc-400 h-screen flex flex-col justify-between p-6 relative overflow-hidden select-none">
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-6 right-4 p-2 text-zinc-500 hover:text-white z-20"
      >
        <PlusSquare className="w-6 h-6 rotate-45" />
      </button>

      {/* Top Section */}
      <div className="space-y-12">
        {/* Logo matching the exact layout of the mockup */}
        <div className="flex items-center gap-3 mt-2 px-2">
          <SMLogo className="w-7 h-7 text-white" />
          <div className="flex flex-col leading-tight">
            <span className="text-white text-sm font-black tracking-wider uppercase font-display">Share</span>
            <span className="text-white text-xs font-semibold tracking-widest uppercase text-white/70">Music</span>
          </div>
        </div>

        {/* Navigation - simple text links as in the mockup */}
        <nav className="space-y-4">
          <div onClick={() => navigate('home')}>
            <NavItem 
              icon={<Home className="w-4 h-4" />} 
              label="Лента" 
              active={currentView === 'home' || currentView === 'playlist-detail'} 
            />
          </div>
          <div onClick={() => navigate('search')}>
            <NavItem 
              icon={<Search className="w-4 h-4" />} 
              label="Поиск" 
              active={currentView === 'search'} 
            />
          </div>
          <div onClick={() => navigate('liked')}>
            <NavItem 
              icon={<Heart className="w-4 h-4" />} 
              label="Любимое" 
              active={currentView === 'liked'} 
            />
          </div>
          <div onClick={() => navigate('rooms')}>
            <NavItem 
              icon={<Users className="w-4 h-4" />} 
              label="Слушать вместе" 
              active={currentView === 'rooms'} 
            />
          </div>
          <div onClick={() => navigate('settings')}>
            <NavItem 
              icon={<Settings className="w-4 h-4" />} 
              label="Настройки" 
              active={currentView === 'settings'} 
            />
          </div>
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-4 border-t border-white/5 pt-6">
        <button 
          onClick={() => setIsLegalOpen(true)}
          className="w-full flex items-center gap-3 px-2 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-left"
        >
          <Info className="w-4 h-4 text-zinc-500" />
          <span>Правовая информация</span>
        </button>
      </div>

      {/* Modern, high-contrast Modal for Legal Disclaimer */}
      {isLegalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#121215] border border-white/10 rounded-2xl max-w-md w-full p-6 text-white relative shadow-2xl">
            <button 
              onClick={() => setIsLegalOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2 mb-4">
              <SMLogo className="w-6 h-6 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white font-display">Правовая информация</h2>
            </div>
            
            <div className="space-y-4 text-sm text-zinc-400 leading-relaxed mb-6">
              <p>
                Данная стриминг-платформа является исключительно <strong>независимым фанатским проектом</strong>, созданным в ознакомительных целях. 
              </p>
              <p>
                Мы никак <strong>не связаны, не аффилированы и не спонсируемся</strong> оригинальной платформой. Этот проект представляет собой авторскую концепцию, созданную исключительно из вдохновения оригинальным словом и страсти к музыке и технологиям.
              </p>
            </div>

            <button 
              onClick={() => setIsLegalOpen(false)}
              className="w-full py-3 bg-zinc-100 hover:bg-white text-black font-semibold rounded-lg transition-colors text-sm tracking-wide"
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
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
    active 
      ? 'text-white font-bold bg-[#3b82f6]/10 border border-[#3b82f6]/25' 
      : 'text-zinc-500 hover:text-zinc-200'
  }`}>
    <span className={active ? 'text-[#3b82f6]' : 'text-zinc-500'}>{icon}</span>
    <span className="text-xs font-bold tracking-wider uppercase font-display">{label}</span>
  </div>
);

export default Sidebar;
