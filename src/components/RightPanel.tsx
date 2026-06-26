import React from 'react';
import { usePlayer } from '../PlayerContext';
import { getSafeArtworkUrl, SoundCloudTrack } from '../services/soundcloud';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Heart, Volume2, Disc, Music, Layers, Trash2 } from 'lucide-react';

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
    <div className="hidden xl:flex w-80 shrink-0 h-screen bg-[#060609]/60 backdrop-blur-3xl border-l border-white/5 flex-col overflow-hidden relative z-20">
      
      {/* Scrollable container */}
      <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col p-6 pb-28 gap-6">
        
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Layers className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 font-mono">Аудиоцентр</h3>
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
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-4 animate-pulse">
                <Music className="w-6 h-6 text-white/30" />
              </div>
              <h4 className="text-sm font-semibold text-white/80">Очередь пуста</h4>
              <p className="text-xs text-white/40 mt-1 max-w-[200px] leading-relaxed">Выберите любой трек или плейлист на главной, чтобы начать прослушивание</p>
            </motion.div>
          ) : (
            <motion.div 
              key="active-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {/* Rotating Cover / Vinyl Disc */}
              <div className="relative flex flex-col items-center py-4">
                <div className="relative w-48 h-48 group">
                  {/* Outer glowing halo */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Rotating cover container */}
                  <div className="w-full h-full rounded-full bg-[#111116] border-2 border-white/10 p-1 shadow-2xl relative overflow-hidden flex items-center justify-center">
                    <motion.div 
                      animate={isPlaying && !isLoading ? { rotate: 360 } : {}}
                      transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                      className="w-full h-full rounded-full relative overflow-hidden flex items-center justify-center"
                    >
                      {/* Vinyl Grooves texture background */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:6px_6px] rounded-full opacity-30" />
                      
                      {/* Real artwork */}
                      <img 
                        src={artwork || ''} 
                        className="w-[85%] h-[85%] rounded-full object-cover border border-black/80" 
                        referrerPolicy="no-referrer" 
                        alt={currentTrack.title}
                      />
                      
                      {/* Center spindle hole */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#060609] border border-white/10 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Playback overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={togglePlay}
                      className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center text-white"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Title & Creator details */}
              <div className="text-center space-y-1 px-2">
                <div className="flex items-center justify-center gap-2">
                  <h4 className="text-white text-base font-bold truncate tracking-tight max-w-[200px]" title={currentTrack.title}>
                    {currentTrack.title}
                  </h4>
                  <button 
                    onClick={() => toggleLike(currentTrack)}
                    className={`focus:outline-none transition-colors ${isLiked(currentTrack.id) ? 'text-red-500 hover:scale-110' : 'text-white/40 hover:text-white'}`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked(currentTrack.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <p className="text-white/40 text-xs font-mono uppercase tracking-wider">{currentTrack.user?.username || 'Unknown Creator'}</p>
              </div>

              {/* Volume Slider Block */}
              <div className="glass-panel rounded-xl p-3 flex items-center gap-3 border border-white/5 bg-white/[0.01]">
                <Volume2 className="w-4 h-4 text-white/30 shrink-0" />
                <div className="relative flex-1 h-1 bg-white/10 rounded-full group cursor-pointer">
                  <div 
                    className="absolute top-0 left-0 h-full bg-violet-400 rounded-full"
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
                <span className="text-[10px] font-mono text-white/30 w-7 text-right">{Math.round(volume * 100)}%</span>
              </div>

              {/* Dynamic equalizing sound wave */}
              {isPlaying && (
                <div className="h-6 flex items-end justify-center gap-[2.5px] py-1 opacity-75">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const delay = (i * 0.08) % 0.8;
                    return (
                      <span 
                        key={i} 
                        style={{ animationDelay: `${delay}s` }}
                        className="w-[3px] h-full rounded-full bg-violet-400/80 animate-soundwave origin-bottom"
                      />
                    );
                  })}
                </div>
              )}

              {/* Up Next List */}
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-white/40 font-mono">
                  <span>В очереди ({upNext.length})</span>
                </div>

                <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-hide pr-1">
                  {upNext.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-[11px] text-white/30">
                      Это был последний трек в очереди
                    </div>
                  ) : (
                    upNext.map((track, i) => {
                      const trackArt = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 'large');
                      return (
                        <div 
                          key={track.id + '-' + i}
                          onClick={() => playTrack(track)}
                          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 relative bg-white/5 border border-white/5">
                            <img src={trackArt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                            </div>
                          </div>
                          <div className="truncate flex-1">
                            <h5 className="text-[11px] font-semibold text-white/80 group-hover:text-violet-300 transition-colors truncate leading-tight">
                              {track.title}
                            </h5>
                            <p className="text-[9px] text-white/30 truncate mt-0.5">
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
