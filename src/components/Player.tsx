import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Heart, Loader2, Download } from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { getSafeArtworkUrl } from '../services/soundcloud';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerControlsProps {
  formatTime: (seconds: number) => string;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({ formatTime }) => {
  const { isPlaying, isLoading, togglePlay, progress, duration, seek, playNext, playPrevious } = usePlayer();
  
  const percent = duration && isFinite(duration) ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg">
      <div className="flex flex-col gap-2">
        <div className="relative w-full h-1 bg-zinc-800 rounded-full cursor-pointer transition-colors group">
          <div 
            className="absolute top-0 left-0 h-full bg-[#3b82f6] rounded-full"
            style={{ 
              width: `${percent}%`,
              transition: isPlaying ? 'width 0.25s linear' : 'none'
            }}
          />
          <input 
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer animate-none"
          />
          {/* Subtle seek thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border border-zinc-700 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            style={{ 
              left: `calc(${percent}% - 6px)`,
              transition: isPlaying ? 'left 0.25s linear' : 'none'
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-10 text-white">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={playPrevious}
          className="focus:outline-none p-2 hover:bg-white/[0.02] rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <SkipBack className="w-7 h-7 fill-current" />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className="w-16 h-16 bg-white hover:bg-zinc-200 text-black rounded-full flex items-center justify-center shadow-lg transition-colors animate-none"
        >
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-1" />
          )}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={playNext}
          className="focus:outline-none p-2 hover:bg-white/[0.02] rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <SkipForward className="w-7 h-7 fill-current" />
        </motion.button>
      </div>
    </div>
  );
};

const Player: React.FC = () => {
  const { currentTrack, isPlaying, isLoading, togglePlay, progress, isLiked, toggleLike, downloadTrack, downloadingTracks, playNext, playPrevious } = usePlayer();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const date = new Date(seconds * 1000);
    return format(date, 'm:ss');
  };

  const artwork = getSafeArtworkUrl(currentTrack.artwork_url || currentTrack.user?.avatar_url, 't500x500');

  return (
    <>
      {/* Floating Mini Player Capsule */}
      <div 
        className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 lg:left-72 md:bottom-6 bg-[#121215] border border-white/[0.04] rounded-2xl py-3 px-4 flex items-center justify-between z-40 shadow-2xl animate-fade-in select-none"
      >
        <div 
            className="flex items-center gap-3.5 w-[75%] cursor-pointer"
            onClick={() => setIsExpanded(true)}
        >
          <div className="relative group shrink-0 w-11 h-11">
            <img src={artwork} className="w-full h-full rounded-lg shadow-md border border-white/5 object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <ChevronDown className="w-4 h-4 rotate-180 text-white/80" />
            </div>
          </div>
          <div className="truncate flex-1">
            <div className="flex items-center gap-2 max-w-full">
              <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-tight truncate hover:text-[#3b82f6] transition-colors">{currentTrack.title}</h4>
              {isPlaying && !isLoading && (
                <span className="flex items-end gap-[1.5px] h-3 shrink-0 pb-[1px]">
                  <span className="w-[1.5px] h-full bg-[#3b82f6] rounded-full animate-soundwave-mini" style={{ animationDelay: '0s' }}></span>
                  <span className="w-[1.5px] h-full bg-zinc-400 rounded-full animate-soundwave-mini" style={{ animationDelay: '0.15s' }}></span>
                  <span className="w-[1.5px] h-full bg-[#3b82f6] rounded-full animate-soundwave-mini" style={{ animationDelay: '0.3s' }}></span>
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-wide mt-0.5">{currentTrack.user?.username || 'Unknown Author'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              playPrevious();
            }} 
            className="w-8 h-8 hover:bg-white/[0.05] rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Предыдущий трек"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }} 
            className="w-10 h-10 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-full flex items-center justify-center text-white transition-colors shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              playNext();
            }} 
            className="w-8 h-8 hover:bg-white/[0.05] rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Следующий трек"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </motion.button>
        </div>
      </div>

      {/* Full Screen Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#08080a] z-50 flex flex-col p-6 pb-12 overflow-y-auto select-none"
          >
            <div className="flex justify-between items-center mb-8 relative z-10 max-w-md mx-auto w-full">
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/5 rounded-full active:scale-90 transition-all text-zinc-400 hover:text-white"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-display">Сейчас играет</h3>
              <div className="w-10" />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-md mx-auto w-full relative z-10">
              <div className="w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.05] group relative">
                <img src={artwork} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              
              {/* Dynamic Sound Equalizer Visualizer */}
              <div className="h-8 flex items-end justify-center gap-[3px] w-full max-w-[240px] my-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  const delay = (i * 0.08) % 0.8;
                  
                  return (
                    <span 
                      key={i} 
                      style={{
                        animationDelay: isPlaying && !isLoading ? `${delay}s` : '0s',
                        animationPlayState: isPlaying && !isLoading ? 'running' : 'paused'
                      }}
                      className="w-[3px] h-8 rounded-full bg-[#3b82f6] animate-soundwave opacity-80"
                    />
                  );
                })}
              </div>

              <div className="w-full flex justify-between items-center max-w-[340px] mt-2">
                <div className="truncate flex-1 pr-4">
                    <h1 className="text-base font-bold text-white uppercase tracking-tight leading-tight truncate">{currentTrack.title}</h1>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">{currentTrack.user?.username || 'Unknown Author'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                      onClick={() => downloadTrack(currentTrack)}
                      className="p-2.5 rounded-full hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-300"
                      title="Скачать трек"
                  >
                      {downloadingTracks.includes(currentTrack.id) ? (
                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                  </button>
                  <button 
                      onClick={() => toggleLike(currentTrack)}
                      className={`p-2.5 rounded-full hover:bg-white/5 transition-colors shrink-0 ${isLiked(currentTrack.id) ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                      <Heart className={`w-5 h-5 ${isLiked(currentTrack.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
              <PlayerControls formatTime={formatTime} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Player;
