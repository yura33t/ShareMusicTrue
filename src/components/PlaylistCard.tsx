import React from 'react';
import { Play, FolderHeart } from 'lucide-react';
import { SoundCloudPlaylist, getSafeArtworkUrl } from '../services/soundcloud';

interface PlaylistCardProps {
  playlist: SoundCloudPlaylist;
  onClick: (playlist: SoundCloudPlaylist) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onClick }) => {
  const artwork = getSafeArtworkUrl(playlist.artwork_url || playlist.user?.avatar_url, 't500x500');

  const trackCount = playlist.track_count || (playlist.tracks ? playlist.tracks.length : 0);

  return (
    <div 
      className="group relative glass-card p-3.5 rounded-2xl cursor-pointer"
      onClick={() => onClick(playlist)}
    >
      <div className="relative aspect-square mb-3.5 overflow-hidden rounded-xl border border-white/5 shadow-inner">
        <img 
          src={artwork} 
          alt={playlist.title}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110 ease-[cubic-bezier(0.16,1,0.3,1)]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white shadow-lg rotate-0 group-hover:rotate-6 transition-all duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
        
        {/* Playlist tag */}
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md px-2 py-0.5 text-[9px] font-medium text-white/90 uppercase rounded-md border border-white/10 tracking-wider">
          Плейлист
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm text-white/90 truncate group-hover:text-white transition-colors tracking-tight">
          {playlist.title}
        </h3>
        <p className="text-xs text-white/40 truncate tracking-wide mt-0.5">
          {playlist.user?.username || 'Unknown User'}
        </p>
        <div className="text-[10px] font-mono text-white/35 mt-2 flex items-center gap-1.5 uppercase tracking-wide">
          <FolderHeart className="w-3.5 h-3.5 text-white/40" />
          <span>{trackCount} треков</span>
        </div>
      </div>
    </div>
  );
};

export default PlaylistCard;
