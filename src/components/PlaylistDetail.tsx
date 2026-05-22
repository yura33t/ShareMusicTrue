import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Pause, Heart, Clock, Loader2, Music } from 'lucide-react';
import { SoundCloudPlaylist, SoundCloudTrack, getPlaylistDetails, getSafeArtworkUrl } from '../services/soundcloud';
import { usePlayer } from '../PlayerContext';
import { motion } from 'motion/react';

interface PlaylistDetailProps {
  playlist: SoundCloudPlaylist;
  onBack: () => void;
}

const PlaylistDetail: React.FC<PlaylistDetailProps> = ({ playlist: initialPlaylist, onBack }) => {
  const { currentTrack, isPlaying, playTrack, setPlaylist, isLiked, toggleLike } = usePlayer();
  const [playlist, setPlaylistData] = useState<SoundCloudPlaylist>(initialPlaylist);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFullDetails = async () => {
      // If we don't have tracks, or any of the tracks is just a skeleton stub (missing title)
      const needsFetch = !initialPlaylist.tracks || 
                         initialPlaylist.tracks.length === 0 || 
                         initialPlaylist.tracks.some(t => !t || !t.title);
      
      if (needsFetch) {
        setLoading(true);
        setError(null);
        try {
          const detailed = await getPlaylistDetails(initialPlaylist.id);
          if (detailed) {
            setPlaylistData(detailed);
          } else {
            setError("Unable to load full playlist tracks.");
          }
        } catch (err) {
          setError("Failed to fetch playlist tracks.");
        } finally {
          setLoading(false);
        }
      } else {
        setPlaylistData(initialPlaylist);
      }
    };
    
    fetchFullDetails();
  }, [initialPlaylist]);

  const tracks = playlist.tracks || [];

  const handlePlayPlaylist = () => {
    if (tracks.length > 0) {
      setPlaylist(tracks);
      playTrack(tracks[0]);
    }
  };

  const handleTrackClick = (track: SoundCloudTrack) => {
    setPlaylist(tracks);
    playTrack(track);
  };

  const isPlaylistPlaying = isPlaying && tracks.some(t => t.id === currentTrack?.id);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const artworkUrl = getSafeArtworkUrl(playlist.artwork_url || playlist.user?.avatar_url, 't500x500');

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ type: "spring", stiffness: 100, damping: 18 }}
      className="space-y-6 lg:space-y-8"
    >
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white uppercase tracking-wider glass-btn py-2.5 px-4 rounded-xl transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      {/* Playlist Header Block */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 lg:gap-8 pb-6 border-b border-white/5">
        <div className="w-48 h-48 lg:w-52 lg:h-52 shrink-0 aspect-square overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c10] shadow-xl">
          <img 
            src={artworkUrl} 
            alt={playlist.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-3.5">
          <span className="text-[10px] font-mono tracking-widest uppercase text-violet-400 font-bold border border-violet-500/20 bg-violet-500/5 px-2.5 py-1 rounded-full">
            Плейлист
          </span>
          <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-white uppercase break-words leading-tight">
            {playlist.title}
          </h1>
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-1 text-xs text-white/50 tracking-wide">
            <span>By <span className="text-white hover:underline cursor-pointer">{playlist.user?.username || 'Unknown Author'}</span></span>
            <span className="text-white/20">•</span>
            <span>{tracks.length} треков</span>
          </div>

          <div className="pt-2 flex justify-center md:justify-start">
            {tracks.length > 0 && (
              <button 
                onClick={handlePlayPlaylist}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                {isPlaylistPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current text-white animate-pulse" /> ИГРАЕТ
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-white ml-0.5" /> СЛУШАТЬ ВСЕ
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tracks list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <span className="text-xs text-white/40 tracking-wider">Загрузка треков...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/10 text-red-400/90 p-4 rounded-xl text-xs tracking-wide">
          {error}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-xs tracking-wider">
          Этот плейлист пока пуст или не может быть загружен.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase text-white/35 tracking-wider">
                <th className="py-4 px-4 w-12 text-center md:table-cell hidden">#</th>
                <th className="py-4 px-4">Название</th>
                <th className="py-4 px-4 md:table-cell hidden">Автор</th>
                <th className="py-4 px-4 text-right w-16">
                  <Clock className="w-4 h-4 ml-auto text-white/35" />
                </th>
                <th className="py-4 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tracks.map((track, idx) => {
                const trackIsCurrent = currentTrack?.id === track.id;
                const trackIsActive = trackIsCurrent && isPlaying;
                const fav = isLiked(track.id);
                const trackArtwork = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 't300x300');

                return (
                  <tr 
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className={`group hover:bg-white/5 transition-all duration-200 cursor-pointer text-sm ${trackIsCurrent ? 'bg-white/5' : ''}`}
                  >
                    <td className="py-3 px-4 text-center md:table-cell hidden text-white/40">
                      {trackIsCurrent ? (
                        <div className="flex items-center justify-center">
                          {trackIsActive ? (
                            <div className="flex items-end gap-[3px] w-3 h-3.5 pb-0.5">
                              <span className="w-[2.5px] h-[70%] bg-violet-400 rounded-full animate-[bounce_0.8s_infinite]"></span>
                              <span className="w-[2.5px] h-full bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite_150ms]"></span>
                              <span className="w-[2.5px] h-[40%] bg-violet-400 rounded-full animate-[bounce_0.8s_infinite_300ms]"></span>
                            </div>
                          ) : (
                            <Play className="w-3 h-3 fill-current text-white/80" />
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-white/30 group-hover:text-white/60 transition-colors">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-white/5 bg-[#0d0d10] shadow-sm">
                        <img 
                          src={trackArtwork} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                        <p className={`font-semibold truncate transition-colors ${trackIsCurrent ? 'text-violet-400' : 'text-white/90 group-hover:text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-white/40 truncate md:hidden mt-0.5">
                          {track.user?.username || 'Unknown Author'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 md:table-cell hidden text-white/50 text-xs tracking-wide truncate max-w-[150px]">
                      {track.user?.username || 'Unknown Author'}
                    </td>
                    <td className="py-3 px-4 text-right text-white/40 font-mono text-xs">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleLike(track)}
                        className={`p-1.5 rounded-full hover:bg-white/5 transition-all ${fav ? 'text-red-500' : 'text-white/30 hover:text-white/80'}`}
                      >
                        <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default PlaylistDetail;
