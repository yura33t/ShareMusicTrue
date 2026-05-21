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
      className="group relative bg-[#0a0a0a] p-3 border border-white/5 hover:border-white/20 transition-all duration-100 cursor-pointer"
      onClick={() => playTrack(track)}
    >
      <div className="relative aspect-square mb-3 overflow-hidden border border-white/10">
        <img 
          src={artwork} 
          alt={track.title}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center text-black shadow-xl">
            {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-start">
        <div className="w-4/5">
            <h3 className="font-mono font-bold text-xs text-white truncate mb-0.5 uppercase tracking-wide">{track.title}</h3>
            <p className="text-[10px] text-white/50 truncate uppercase tracking-wider">{track.user?.username || 'Unknown Author'}</p>
        </div>
        <button 
            onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
            className={`p-1 ${liked ? 'text-red-500' : 'text-white/30 hover:text-white'}`}
        >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
};


export default TrackCard;
