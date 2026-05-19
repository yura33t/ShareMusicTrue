import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Repeat, Shuffle, Heart } from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const Player: React.FC = () => {
  const { currentTrack, isPlaying, togglePlay, progress, duration, seek, isLiked, toggleLike } = usePlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const date = new Date(seconds * 1000);
    return format(date, 'm:ss');
  };

  const artwork = currentTrack.artwork_url?.replace('large', 't500x500') || 
                  currentTrack.user.avatar_url?.replace('large', 't500x500') ||
                  'https://picsum.photos/seed/music/500/500';

  const PlayerControls = () => (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-1">
        <div className="relative w-full h-1 bg-white/20 rounded-full cursor-pointer">
          <div 
            className="absolute top-0 left-0 h-full bg-white rounded-full"
            style={{ width: `${(progress / duration) * 100}%` }}
          />
          <input 
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-xs text-white/50 font-mono">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-white">
        <Shuffle className="w-6 h-6 text-white/50" />
        <SkipBack className="w-10 h-10 fill-current" />
        <button 
          onClick={togglePlay}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black"
        >
          {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-2" />}
        </button>
        <SkipForward className="w-10 h-10 fill-current" />
        <Repeat className="w-6 h-6 text-white/50" />
      </div>
    </div>
  );

  return (
    <>
      {/* Mini Player */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 px-4 py-3 flex items-center justify-between z-40"
      >
        <div 
            className="flex items-center gap-3 w-3/4 cursor-pointer"
            onClick={() => setIsExpanded(true)}
        >
          <img src={artwork} className="w-10 h-10 rounded shadow-lg" referrerPolicy="no-referrer" />
          <div className="truncate">
            <h4 className="text-white text-sm font-semibold truncate">{currentTrack.title}</h4>
            <p className="text-white/50 text-xs truncate">{currentTrack.user.username}</p>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }} 
          className="text-white"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
      </div>

      {/* Full Screen Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-0 bg-[#050505] z-50 flex flex-col p-6 pb-12"
          >
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setIsExpanded(false)}><ChevronDown className="w-8 h-8" /></button>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Playing Now</h3>
              <div className="w-8" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <img src={artwork} className="w-full aspect-square rounded-2xl shadow-2xl" referrerPolicy="no-referrer" />
              <div className="w-full flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold mb-1">{currentTrack.title}</h1>
                    <p className="text-lg text-white/50">{currentTrack.user.username}</p>
                </div>
                <button 
                    onClick={() => toggleLike(currentTrack)}
                    className={`p-2 rounded-full ${isLiked(currentTrack.id) ? 'text-red-500' : 'text-white/50'}`}
                >
                    <Heart className={`w-8 h-8 ${isLiked(currentTrack.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
              <PlayerControls />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Player;
