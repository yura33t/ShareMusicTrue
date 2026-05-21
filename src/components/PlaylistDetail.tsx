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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6 lg:space-y-8"
    >
      {/* Back button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-mono font-bold text-white/50 hover:text-white uppercase tracking-widest border border-white/5 bg-white/5 py-2 px-4 transition-all hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4" /> BACK
      </button>

      {/* Playlist Header Block */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 lg:gap-8 pb-6 border-b border-white/10">
        <div className="w-48 h-48 lg:w-56 lg:h-56 shrink-0 aspect-square overflow-hidden border border-white/10 bg-[#0a0a0a]">
          <img 
            src={artworkUrl} 
            alt={playlist.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="flex-1 text-center md:text-left space-y-3">
          <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 border border-white/10 px-2.1 py-1">
            CLONE PLAYLIST
          </span>
          <h1 className="text-3xl lg:text-5xl font-mono font-extrabold tracking-tight text-white uppercase break-words leading-none">
            {playlist.title}
          </h1>
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-x-3 gap-y-1 text-xs text-white/60 font-mono uppercase tracking-wider">
            <span>By <span className="text-white hover:underline cursor-pointer">{playlist.user?.username || 'Unknown Author'}</span></span>
            <span className="text-white/20">•</span>
            <span>{tracks.length} tracks</span>
          </div>

          <div className="pt-2 flex justify-center md:justify-start">
            {tracks.length > 0 && (
              <button 
                onClick={handlePlayPlaylist}
                className="flex items-center gap-2 bg-white text-black font-mono font-bold text-xs uppercase tracking-widest py-3 px-6 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaylistPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" /> PLAYING
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current ml-0.5" /> PLAY ALL
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
          <Loader2 className="w-8 h-8 animate-spin text-white/30" />
          <span className="text-xs font-mono uppercase text-white/40 tracking-widest">Fetching playlist tracks...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 font-mono text-xs uppercase tracking-wider">
          {error}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-white/30 font-mono text-xs uppercase tracking-wider">
          This playlist is empty or could not be loaded.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase text-white/40 tracking-wider">
                <th className="py-3 px-4 w-12 text-center md:table-cell hidden">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 md:table-cell hidden">Publisher</th>
                <th className="py-3 px-4 text-right w-16">
                  <Clock className="w-4 h-4 ml-auto" />
                </th>
                <th className="py-3 px-2 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => {
                const trackIsCurrent = currentTrack?.id === track.id;
                const trackIsActive = trackIsCurrent && isPlaying;
                const fav = isLiked(track.id);
                const trackArtwork = getSafeArtworkUrl(track.artwork_url || track.user?.avatar_url, 't300x300');

                return (
                  <tr 
                    key={track.id}
                    onClick={() => handleTrackClick(track)}
                    className={`group border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer text-xs ${trackIsCurrent ? 'bg-white/5' : ''}`}
                  >
                    <td className="py-3 px-4 text-center md:table-cell hidden text-white/40">
                      {trackIsCurrent ? (
                        <div className="flex items-center justify-center">
                          {trackIsActive ? (
                            <div className="flex items-end gap-[2px] w-3 h-3">
                              <span className="w-[2px] h-full bg-white animate-[bounce_1s_infinite]"></span>
                              <span className="w-[2px] h-[60%] bg-white animate-[bounce_1s_infinite_200ms]"></span>
                              <span className="w-[2px] h-[80%] bg-white animate-[bounce_1s_infinite_400ms]"></span>
                            </div>
                          ) : (
                            <Play className="w-3 h-3 fill-current text-white" />
                          )}
                        </div>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-10 h-10 shrink-0 border border-white/10 bg-[#0d0d0d]">
                        <img 
                          src={trackArtwork} 
                          alt={track.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                        <p className={`font-bold uppercase tracking-wide truncate ${trackIsCurrent ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-[10px] text-white/40 truncate md:hidden">
                          {track.user?.username || 'Unknown Author'}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 md:table-cell hidden text-white/60 uppercase text-[10px] tracking-wide truncate max-w-[150px]">
                      {track.user?.username || 'Unknown Author'}
                    </td>
                    <td className="py-3 px-4 text-right text-white/40 font-mono">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => toggleLike(track)}
                        className={`p-1 transition-colors ${fav ? 'text-red-500' : 'text-white/20 hover:text-white'}`}
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
