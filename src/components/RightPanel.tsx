import React from 'react';
import { usePlayer } from '../PlayerContext';
import { getSafeArtworkUrl, SoundCloudTrack } from '../services/soundcloud';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Heart, Volume2, Music, Layers } from 'lucide-react';

const RightPanel: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    isLoading, 
    togglePlay, 
    isLiked, 
    toggleLike, 
    playlist, 
    playTrack,
    volume,
    setVolume
  } = usePlayer();

  // Find index of current track in active queue
  const currentIndex = currentTrack && playlist ? playlist.findIndex(t => t.id === currentTrack.id) : -1;
  
  // Slice queue to show tracks that come next
  const upNext = currentIndex !== -1 && playlist ? playlist.slice(currentIndex + 1, currentIndex + 12) : [];

  const artwork = currentTrack 
    ? getSafeArtworkUrl(currentTrack.artwork_url || currentTrack.user?.avatar_url, 't500x500')
    : null;

  return (
    <div className="hidden xl:flex w-80 shrink-0 h-screen bg-[#08080a] border-l border-white/[0.04] flex-col overflow-hidden relative z-20 select-none">
      
      {/* Scrollable container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col p-6 pb-28 gap-6">
        
        <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
          <Layers className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-display">Аудиоцентр</h3>
        </div>

        <AnimatePresence mode="wait">
          {!currentTrack ? (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-4 py-12"
            >
              <div className="w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5 mb-4">
                <Music className="w-5 h-5 text-zinc-600" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Очередь пуста</h4>
              <p className="text-[11px] text-zinc-600 mt-2 max-w-[200px] leading-relaxed">Выберите трек или плейлист, чтобы начать прослушивание</p>
            </motion.div>
          ) : (
            <motion.div 
              key="active-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {/* Minimal Cover */}
              <div className="relative flex flex-col items-center py-2">
                <div className="relative w-44 h-44 group rounded-xl overflow-hidden border border-white/[0.05] bg-zinc-900 shadow-xl">
                  <img 
                    src={artwork || ''} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                    alt={currentTrack.title}
                  />
                  {/* Playback overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={togglePlay}
                      className="w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/25 rounded-full flex items-center justify-center text-white"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Title & Creator details */}
              <div className="text-center space-y-1.5 px-2">
                <div className="flex items-center justify-center gap-2">
                  <h4 className="text-zinc-100 text-sm font-bold uppercase tracking-tight truncate max-w-[180px]" title={currentTrack.title}>
                    {currentTrack.title}
                  </h4>
                  <button 
                    onClick={() => toggleLike(currentTrack)}
                    className={`focus:outline-none transition-colors ${isLiked(currentTrack.id) ? 'text-red-500' : 'text-zinc-600 hover:text-zinc-300'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked(currentTrack.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">{currentTrack.user?.username || 'Unknown Creator'}</p>
              </div>

              {/* Volume Slider Block */}
              <div className="bg-[#121215] rounded-xl p-3.5 flex items-center gap-3 border border-white/[0.02]">
                <Volume2 className="w-4 h-4 text-zinc-500 shrink-0" />
                <div className="relative flex-1 h-1 bg-zinc-800 rounded-full group cursor-pointer">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#3b82f6] rounded-full"
                    style={{ width: `${volume * 100}%` }}
                  />
                  <input 
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-semibold w-7 text-right">{Math.round(volume * 100)}%</span>
              </div>

              {/* Up Next List */}
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500 font-display">
                  <span>В очереди ({upNext.length})</span>
                </div>

                <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-hide pr-1">
                  {upNext.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-[10px] uppercase text-zinc-600 tracking-wider">
                      Очередь завершена
                    </div>
                  ) : (
                    upNext.map((track, i) => {
                      const trackArt = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 'large');
                      return (
                        <div 
                          key={track.id + '-' + i}
                          onClick={() => playTrack(track)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.02] cursor-pointer transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 relative bg-zinc-900 border border-white/5">
                            <img src={trackArt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                            </div>
                          </div>
                          <div className="truncate flex-1">
                            <h5 className="text-[11px] font-bold text-zinc-300 uppercase tracking-tight group-hover:text-[#3b82f6] transition-colors truncate leading-tight">
                              {track.title}
                            </h5>
                            <p className="text-[9px] text-zinc-500 truncate mt-0.5">
                              {track.user?.username || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default RightPanel;
