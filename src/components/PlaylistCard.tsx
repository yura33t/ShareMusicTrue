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
      className="group relative bg-[#0a0a0a] p-3 border border-white/5 hover:border-white/20 transition-all duration-100 cursor-pointer"
      onClick={() => onClick(playlist)}
    >
      <div className="relative aspect-square mb-3 overflow-hidden border border-white/10">
        <img 
          src={artwork} 
          alt={playlist.title}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center text-black shadow-xl">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
        
        {/* Playlist tag */}
        <div className="absolute top-2 left-2 bg-black px-2 py-0.5 text-[8px] font-mono uppercase border border-white/20 tracking-wider">
          Playlist
        </div>
      </div>
      <div>
        <h3 className="font-mono font-bold text-xs text-white truncate mb-0.5 uppercase tracking-wide">
          {playlist.title}
        </h3>
        <p className="text-[10px] text-white/50 truncate uppercase tracking-wider mb-1">
          by {playlist.user?.username || 'Unknown User'}
        </p>
        <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <FolderHeart className="w-3 h-3" />
          {trackCount} tracks
        </div>
      </div>
    </div>
  );
};

export default PlaylistCard;
