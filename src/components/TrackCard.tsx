import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { SoundCloudTrack, getSafeArtworkUrl } from '../services/soundcloud';
import { usePlayer } from '../PlayerContext';

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
    <div 
      className={`group relative glass-card p-3.5 rounded-2xl cursor-pointer ${isCurrent ? 'glass-card-active border-white/30 text-white shadow-lg' : ''}`}
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
      </div>
      <div className="flex justify-between items-start gap-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-white/90 truncate group-hover:text-white transition-colors tracking-tight">{track.title}</h3>
          <p className="text-xs text-white/40 truncate tracking-wide mt-0.5">{track.user?.username || 'Unknown Author'}</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
          className={`p-1.5 rounded-full transition-all hover:bg-white/5 shrink-0 ${liked ? 'text-red-500' : 'text-white/30 hover:text-white/70'}`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
};


export default TrackCard;
