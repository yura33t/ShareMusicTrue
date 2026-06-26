import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { SoundCloudTrack, getSafeArtworkUrl } from '../services/soundcloud';
import { usePlayer } from '../PlayerContext';
import { motion } from 'motion/react';

interface TrackCardProps {
  track: SoundCloudTrack;
}

const TrackCard: React.FC<TrackCardProps> = ({ track }) => {
  const { currentTrack, isPlaying, playTrack, isLiked, toggleLike } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const isActive = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  const artwork = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 't500x500');

  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`group relative glass-card p-3.5 rounded-2xl cursor-pointer select-none transition-shadow ${
        isCurrent ? 'glass-card-active border-violet-500/30 text-white shadow-[0_12px_32px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/20' : 'hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]'
      }`}
      onClick={() => playTrack(track)}
    >
      <div className="relative aspect-square mb-3.5 overflow-hidden rounded-xl border border-white/5 shadow-inner">
        <img 
          src={artwork} 
          alt={track.title}
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110 ease-[cubic-bezier(0.16,1,0.3,1)]"
          referrerPolicy="no-referrer"
        />
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[3px] flex items-center justify-center transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all">
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </div>
        </div>

        {/* Animated mini soundwave overlay on bottom right */}
        {isActive && (
          <div className="absolute bottom-2 right-2 flex items-end gap-[2px] bg-black/75 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/10 h-6">
            <span className="w-[1.5px] h-3.5 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0s' }}></span>
            <span className="w-[1.5px] h-3.5 bg-indigo-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.15s' }}></span>
            <span className="w-[1.5px] h-3.5 bg-violet-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.3s' }}></span>
          </div>
        )}
      </div>
      <div className="flex justify-between items-start gap-1">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm truncate transition-colors tracking-tight ${isCurrent ? 'text-violet-300' : 'text-white/90 group-hover:text-white'}`}>{track.title}</h3>
          <p className="text-xs text-white/40 truncate tracking-wide mt-0.5">{track.user?.username || 'Unknown Author'}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
          className={`p-1.5 rounded-full transition-all hover:bg-white/5 shrink-0 ${liked ? 'text-red-500 hover:scale-110' : 'text-white/30 hover:text-white/70'}`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </motion.div>
  );
};

export default TrackCard;
