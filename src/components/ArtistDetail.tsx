import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Pause, Heart, Clock, Loader2, Music, Download } from 'lucide-react';
import { SoundCloudTrack, searchTracks, getSafeArtworkUrl } from '../services/soundcloud';
import { usePlayer } from '../PlayerContext';
import { motion } from 'motion/react';

interface ArtistDetailProps {
  artist: {
    id: number;
    username: string;
    avatar_url: string;
  };
  onBack: () => void;
}

const ArtistDetail: React.FC<ArtistDetailProps> = ({ artist, onBack }) => {
  const { currentTrack, isPlaying, playTrack, setPlaylist, isLiked, toggleLike, downloadTrack, downloadingTracks } = usePlayer();
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query the SoundCloud API using search with the artist's specific username
        const results = await searchTracks(artist.username);
        setTracks(results);
      } catch (err) {
        console.error("Error fetching artist tracks:", err);
        setError("Не удалось загрузить треки исполнителя.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtistTracks();
  }, [artist]);

  const handlePlayArtistTracks = () => {
    if (tracks.length > 0) {
      setPlaylist(tracks);
      playTrack(tracks[0]);
    }
  };

  const handleTrackClick = (track: SoundCloudTrack) => {
    setPlaylist(tracks);
    playTrack(track);
  };

  const isArtistPlaying = isPlaying && tracks.some(t => t.id === currentTrack?.id);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const avatarUrl = getSafeArtworkUrl(artist.avatar_url, 't500x500');

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
        className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider bg-[#121215] border border-white/[0.03] hover:bg-[#16161c] py-2 px-4 rounded-xl transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      {/* Artist Profile Header Block */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 lg:gap-8 pb-6 border-b border-white/[0.04]">
        <div className="w-40 h-40 lg:w-44 lg:h-44 shrink-0 aspect-square overflow-hidden rounded-full border-2 border-white/10 bg-zinc-950 shadow-2xl">
          <img 
            src={avatarUrl} 
            alt={artist.username}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-3.5">
          <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 border border-blue-900/40 bg-blue-950/20 px-2.5 py-1 rounded-md">
            Исполнитель
          </span>
          <h1 className="text-xl lg:text-3xl font-black tracking-tight text-white uppercase break-words leading-none font-display">
            {artist.username}
          </h1>
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-1 text-xs text-zinc-500 tracking-wide font-medium">
            <span>Популярные релизы</span>
            <span className="text-zinc-800">•</span>
            <span>{tracks.length} треков доступно</span>
          </div>

          <div className="pt-2 flex justify-center md:justify-start">
            {tracks.length > 0 && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePlayArtistTracks}
                className="flex items-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-colors shadow-lg shadow-[#3b82f6]/10"
              >
                {isArtistPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current text-white animate-pulse" /> СЛУШАЕМ
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-white ml-0.5" /> СЛУШАТЬ ТРЕКИ
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Tracks list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
          <span className="text-xs text-zinc-500 tracking-wider font-semibold uppercase">Загрузка популярных треков...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs tracking-wide font-medium">
          {error}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-zinc-600 text-xs uppercase tracking-wider">
          У исполнителя пока нет доступных треков
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-sans">
            <thead>
              <tr className="border-b border-white/[0.04] text-[10px] uppercase text-zinc-500 tracking-widest font-bold">
                <th className="py-4 px-4 w-12 text-center md:table-cell hidden">#</th>
                <th className="py-4 px-4">Название</th>
                <th className="py-4 px-4 md:table-cell hidden">Исполнитель</th>
                <th className="py-4 px-4 text-right w-16">
                  <Clock className="w-4 h-4 ml-auto text-zinc-500" />
                </th>
                <th className="py-4 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {tracks.map((track, idx) => {
                const trackIsCurrent = currentTrack?.id === track.id;
                const trackIsActive = trackIsCurrent && isPlaying;
                const fav = isLiked(track.id);
                const trackArtwork = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 't300x300');

                return (
                  <tr 
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className={`group hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer text-sm ${trackIsCurrent ? 'bg-white/[0.03]' : ''}`}
                  >
                    <td className="py-3 px-4 text-center md:table-cell hidden text-zinc-500">
                      {trackIsCurrent ? (
                        <div className="flex items-center justify-center">
                          {trackIsActive ? (
                            <div className="flex items-end gap-[2px] w-3 h-3 pb-0.5">
                              <span className="w-[1.5px] h-[70%] bg-[#3b82f6] rounded-full animate-[bounce_0.8s_infinite]"></span>
                              <span className="w-[1.5px] h-full bg-[#60a5fa] rounded-full animate-[bounce_0.8s_infinite_150ms]"></span>
                              <span className="w-[1.5px] h-[40%] bg-[#3b82f6] rounded-full animate-[bounce_0.8s_infinite_300ms]"></span>
                            </div>
                          ) : (
                            <Play className="w-3 h-3 fill-current text-white/80" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600 font-bold group-hover:text-zinc-400 transition-colors">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-white/5 bg-zinc-950 shadow-sm">
                        <img 
                          src={trackArtwork} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                        <p className={`font-bold uppercase text-sm truncate transition-colors ${trackIsCurrent ? 'text-[#3b82f6]' : 'text-zinc-200 group-hover:text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-zinc-500 truncate md:hidden mt-0.5">
                          {track.user?.username || 'Unknown Author'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 md:table-cell hidden text-zinc-400 text-xs font-semibold truncate max-w-[150px]">
                      {track.user?.username || 'Unknown Author'}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500 font-semibold text-xs">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => downloadTrack(track)}
                          className="p-1.5 rounded-full hover:bg-white/5 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                          title="Скачать трек"
                        >
                          {downloadingTracks.includes(track.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button 
                          onClick={() => toggleLike(track)}
                          className={`p-1.5 rounded-full hover:bg-white/5 transition-colors ${fav ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-200'}`}
                          title="В любимые"
                        >
                          <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
                        </button>
                      </div>
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

export default ArtistDetail;
