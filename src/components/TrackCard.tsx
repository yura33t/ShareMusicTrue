import React from 'react';
import { Play, Pause, Heart, Download, Loader2 } from 'lucide-react';
import { SoundCloudTrack, getSafeArtworkUrl } from '../services/soundcloud';
import { usePlayer } from '../PlayerContext';
import { motion } from 'motion/react';

interface TrackCardProps {
  track: SoundCloudTrack;
  contextPlaylist?: SoundCloudTrack[];
}

const TrackCard: React.FC<TrackCardProps> = ({ track, contextPlaylist }) => {
  const { currentTrack, isPlaying, playTrack, isLiked, toggleLike, downloadTrack, downloadingTracks } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const isActive = isCurrent && isPlaying;
  const liked = isLiked(track.id);
  const isDownloading = downloadingTracks.includes(track.id);

  const artwork = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 't500x500');

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative p-3 rounded-2xl cursor-pointer select-none transition-all duration-200 ${
        isCurrent ? 'bg-[#151b2c] border border-blue-500/25' : 'bg-[#121215] hover:bg-[#16161d] border border-white/[0.02]'
      }`}
      onClick={() => playTrack(track, contextPlaylist)}
    >
      <div className="relative aspect-square mb-3 overflow-hidden rounded-xl bg-zinc-900 border border-white/[0.04]">
        <img 
          src={artwork} 
          alt={track.title}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-10 h-10 bg-white/15 hover:bg-white/25 border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95">
            {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </div>
        </div>

        {/* Animated mini soundwave overlay on bottom right */}
        {isActive && (
          <div className="absolute bottom-2 right-2 flex items-end gap-[1.5px] bg-black/80 px-2 py-1 rounded-md border border-white/5 h-4.5">
            <span className="w-[1px] h-2.5 bg-blue-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0s' }}></span>
            <span className="w-[1px] h-2.5 bg-sky-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.15s' }}></span>
            <span className="w-[1px] h-2.5 bg-blue-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.3s' }}></span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start gap-1">
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm uppercase tracking-tight truncate leading-tight ${isCurrent ? 'text-blue-400' : 'text-zinc-100 group-hover:text-white'}`}>{track.title}</h3>
          <p className="text-xs text-zinc-500 truncate tracking-wide mt-1">{track.user?.username || 'Unknown Author'}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button 
            onClick={(e) => { e.stopPropagation(); downloadTrack(track); }}
            className={`p-1.5 rounded-full transition-colors hover:bg-white/5 text-zinc-500 hover:text-zinc-200 shrink-0`}
            title="Скачать трек"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
            className={`p-1.5 rounded-full transition-colors hover:bg-white/5 shrink-0 ${liked ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-200'}`}
            title="В любимые"
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TrackCard;
