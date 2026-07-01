import React from 'react';
import { Play, FolderHeart } from 'lucide-react';
import { SoundCloudPlaylist, getSafeArtworkUrl } from '../services/soundcloud';
import { motion } from 'motion/react';

interface PlaylistCardProps {
  playlist: SoundCloudPlaylist;
  onClick: (playlist: SoundCloudPlaylist) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onClick }) => {
  const artwork = getSafeArtworkUrl(playlist.artwork_url || playlist.user?.avatar_url, 't500x500');
  const trackCount = playlist.track_count || (playlist.tracks ? playlist.tracks.length : 0);

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="group relative p-3 rounded-2xl cursor-pointer select-none bg-[#121215] hover:bg-[#16161d] border border-white/[0.02] transition-colors duration-200"
      onClick={() => onClick(playlist)}
    >
      <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-zinc-900 border border-white/[0.04]">
        <img 
          src={artwork} 
          alt={playlist.title}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 bg-white/15 hover:bg-white/25 border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 hover:scale-105">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>
        
        {/* Playlist tag */}
        <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white/90 uppercase rounded-md border border-white/5 tracking-wider">
          Плейлист
        </div>
      </div>
      <div>
        <h3 className="font-bold text-xs uppercase tracking-tight truncate leading-tight text-zinc-100 group-hover:text-white transition-colors">
          {playlist.title}
        </h3>
        <p className="text-[11px] text-zinc-500 truncate tracking-wide mt-1">
          {playlist.user?.username || 'Unknown User'}
        </p>
        <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
          <FolderHeart className="w-3.5 h-3.5 text-zinc-500" />
          <span>{trackCount} треков</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PlaylistCard;
