import React from 'react';
import { Home, Search, Library, Heart, PlusSquare, Music2 } from 'lucide-react';

const Sidebar: React.FC<{ onClose?: () => void, onNavigate?: (view: string) => void }> = ({ onClose, onNavigate }) => {
  const navigate = (view: string) => {
    onNavigate?.(view);
    onClose?.();
  };

  return (
    <div className="w-64 bg-black text-white h-screen flex flex-col border-r border-white/10 relative">
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-6 right-4 p-2 text-white/50 hover:text-white"
      >
        <PlusSquare className="w-6 h-6 rotate-45" />
      </button>

      <div className="p-6 flex items-center gap-2">
        <Music2 className="w-8 h-8 text-white" />
        <h1 className="text-2xl font-bold tracking-tighter">shareMusic</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
        <div onClick={() => navigate('home')}><NavItem icon={<Home className="w-5 h-5" />} label="Home" /></div>
        <div onClick={() => navigate('search')}><NavItem icon={<Search className="w-5 h-5" />} label="Search" /></div>
        <div onClick={() => navigate('liked')}><NavItem icon={<Heart className="w-5 h-5" />} label="Liked Songs" /></div>
      </nav>

      <div className="p-6 border-t border-white/10">
        <div className="text-xs text-white/30 hover:text-white/60 cursor-pointer transition-colors">
          Legal • Privacy • Cookies
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <div className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${active ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/5'}`}>
    {icon}
    <span className="font-medium">{label}</span>
  </div>
);

export default Sidebar;
