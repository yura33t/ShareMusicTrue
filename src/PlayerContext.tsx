import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { SoundCloudTrack, getStreamUrl, getCachedStreamUrl, getSafeArtworkUrl } from './services/soundcloud';
import Hls from 'hls.js';

interface PlayerContextType {
  currentTrack: SoundCloudTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  playTrack: (track: SoundCloudTrack, newPlaylist?: SoundCloudTrack[]) => void;
  togglePlay: () => void;
  progress: number;
  duration: number;
  volume: number;
  setVolume: (v: number) => void;
  seek: (p: number) => void;
  likedTracks: SoundCloudTrack[];
  toggleLike: (track: SoundCloudTrack) => void;
  isLiked: (trackId: number) => boolean;
  playlist: SoundCloudTrack[];
  setPlaylist: (tracks: SoundCloudTrack[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  // PREMIUM & DOWNLOAD CAPABILITIES
  isPremium: boolean;
  activatePremium: (code: string) => boolean;
  downloadTrack: (track: SoundCloudTrack) => Promise<boolean>;
  downloadingTracks: number[];
  premiumModalOpen: boolean;
  setPremiumModalOpen: (open: boolean) => void;
  pendingDownloadTrack: SoundCloudTrack | null;
  setPendingDownloadTrack: (track: SoundCloudTrack | null) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<SoundCloudTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playlist, setPlaylist] = useState<SoundCloudTrack[]>([]);
  const [likedTracks, setLikedTracks] = useState<SoundCloudTrack[]>(() => {
    const saved = localStorage.getItem('likedTracks');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Premium and Download states
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    return localStorage.getItem('premiumActivated') === 'true';
  });
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [pendingDownloadTrack, setPendingDownloadTrack] = useState<SoundCloudTrack | null>(null);
  const [downloadingTracks, setDownloadingTracks] = useState<number[]>([]);
  
  const currentTrackRef = useRef(currentTrack);
  const playlistRef = useRef(playlist);
  const currentLoadingTrackIdRef = useRef<number | null>(null);
  const playNextRef = useRef<() => void>(() => {});
  const playPreviousRef = useRef<() => void>(() => {});

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    playlistRef.current = playlist;
  }, [currentTrack, playlist]);
  
  useEffect(() => {
    localStorage.setItem('likedTracks', JSON.stringify(likedTracks));
  }, [likedTracks]);
  
  const toggleLike = (track: SoundCloudTrack) => {
    setLikedTracks(prev => {
        const isAlreadyLiked = prev.some(t => t.id === track.id);
        if (isAlreadyLiked) {
            return prev.filter(t => t.id !== track.id);
        }
        return [...prev, track];
    });
  };

  const isLiked = (trackId: number) => likedTracks.some(t => t.id === trackId);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const updateProgress = () => {
      const currentTime = audio.currentTime;
      setProgress(currentTime);
      let dur = audio.duration;
      if (dur && isFinite(dur)) {
        setDuration(dur);
      } else {
        dur = 0;
      }

      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          if (dur > 0 && isFinite(currentTime) && isFinite(dur) && currentTime <= dur) {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: audio.playbackRate || 1.0,
              position: currentTime
            });
          }
        } catch (e) {
          console.warn("Error setting mediaSession position state:", e);
        }
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      if (playNextRef.current) {
        playNextRef.current();
      }
    };

    const onError = (e: Event) => {
      console.warn("Audio element error during playback, auto-skipping:", e);
      setIsPlaying(false);
      setIsLoading(false);
      setTimeout(() => {
        if (playNextRef.current) {
          playNextRef.current();
        }
      }, 1000);
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadedmetadata', updateProgress);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playNext = () => {
    const current = currentTrackRef.current;
    const list = playlistRef.current;
    if (list && list.length > 0) {
      if (!current) {
        playTrack(list[0]);
        return;
      }
      const currentIndex = list.findIndex(t => t.id === current.id);
      const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % list.length : 0;
      playTrack(list[nextIndex]);
    }
  };

  const playPrevious = () => {
    const current = currentTrackRef.current;
    const list = playlistRef.current;
    if (list && list.length > 0) {
      if (!current) {
        playTrack(list[0]);
        return;
      }
      const currentIndex = list.findIndex(t => t.id === current.id);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
      playTrack(list[prevIndex]);
    }
  };

  useEffect(() => {
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
  });

  const playTrack = async (track: SoundCloudTrack, newPlaylist?: SoundCloudTrack[]) => {
    if (!audioRef.current) return;

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
      playlistRef.current = newPlaylist;
    }

    if (currentTrackRef.current?.id === track.id && audioRef.current.src) {
      togglePlay();
      return;
    }

    currentLoadingTrackIdRef.current = track.id;
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTrack(track);

    if (track.duration) {
      setDuration(track.duration / 1000);
    } else {
      setDuration(0);
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    audioRef.current.pause();

    const setupAudioSourceAndPlay = (streamUrl: string) => {
      if (!audioRef.current || currentLoadingTrackIdRef.current !== track.id) return;

      const startPlayback = async () => {
        if (!audioRef.current || currentLoadingTrackIdRef.current !== track.id) return;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          // Prefetch stream URL for next track in playlist for instant playback transition
          if (playlistRef.current && playlistRef.current.length > 0) {
            const curIdx = playlistRef.current.findIndex(t => t.id === track.id);
            if (curIdx !== -1 && curIdx < playlistRef.current.length - 1) {
              const nextTrk = playlistRef.current[curIdx + 1];
              getStreamUrl(nextTrk).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Play interrupted or blocked:', err);
          setIsPlaying(false);
        } finally {
          setIsLoading(false);
        }
      };

      if (streamUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;
          hls.loadSource(streamUrl);
          hls.attachMedia(audioRef.current);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (currentLoadingTrackIdRef.current !== track.id) return;
            startPlayback();
          });

          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) {
              console.warn('HLS Fatal error:', data.type);
              if (currentLoadingTrackIdRef.current === track.id) {
                setIsLoading(false);
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                  hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  hls.recoverMediaError();
                } else {
                  hls.destroy();
                  setTimeout(() => {
                    if (playNextRef.current) playNextRef.current();
                  }, 500);
                }
              }
            }
          });
        } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          audioRef.current.src = streamUrl;
          startPlayback();
        } else {
          audioRef.current.src = streamUrl;
          startPlayback();
        }
      } else {
        audioRef.current.src = streamUrl;
        startPlayback();
      }
    };

    const cachedUrl = getCachedStreamUrl(track.id);
    if (cachedUrl) {
      console.log(`[FAST PLAYBACK] Found cached stream for track ${track.id}, starting synchronously!`);
      setupAudioSourceAndPlay(cachedUrl);
    } else {
      try {
        const streamUrl = await getStreamUrl(track);
        if (currentLoadingTrackIdRef.current !== track.id) return;

        if (!streamUrl) {
          console.warn('Could not get stream URL, auto-skipping');
          setIsLoading(false);
          setTimeout(() => playNextRef.current(), 1000);
          return;
        }

        setupAudioSourceAndPlay(streamUrl);
      } catch (error) {
        console.error('Error in playTrack async path:', error);
        if (currentLoadingTrackIdRef.current === track.id) {
          setIsLoading(false);
          setTimeout(() => playNextRef.current(), 1000);
        }
      }
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack || isLoading) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Play interrupted', err);
        setIsPlaying(false);
      }
    }
  };

  const seek = (p: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = p;
      setProgress(p);
    }
  };

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const safeArtwork = getSafeArtworkUrl(currentTrack.artwork_url || currentTrack.user?.avatar_url, 't500x500');

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.user?.username || 'Unknown Artist',
        album: 'Share Music',
        artwork: safeArtwork ? [
          { src: safeArtwork, sizes: '500x500', type: 'image/jpeg' }
        ] : []
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (audioRef.current) {
            audioRef.current.play().catch(() => {});
          }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPreviousRef.current();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNextRef.current();
        });
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          if (audioRef.current) {
            const offset = details.seekOffset || 10;
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
          }
        });
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          if (audioRef.current) {
            const offset = details.seekOffset || 10;
            audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, audioRef.current.duration || 0);
          }
        });
        try {
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (audioRef.current && details.seekTime !== undefined) {
              audioRef.current.currentTime = details.seekTime;
              setProgress(details.seekTime);
            }
          });
        } catch (err) {
          console.warn("Media Session seekto registration not supported on this platform", err);
        }
      } catch (error) {
        console.warn("Media Session Action Handler registration error", error);
      }
    }
    return () => {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
          try {
            navigator.mediaSession.setActionHandler('seekto', null);
          } catch (e) {}
        } catch (e) {}
      }
    };
  }, []);

  const activatePremium = (code: string): boolean => {
    if (code.trim().toLowerCase() === 'tester2026') {
      setIsPremium(true);
      localStorage.setItem('premiumActivated', 'true');
      return true;
    }
    return false;
  };

  const downloadTrack = async (track: SoundCloudTrack): Promise<boolean> => {
    if (!localStorage.getItem('premiumActivated') && !isPremium) {
      setPendingDownloadTrack(track);
      setPremiumModalOpen(true);
      return false;
    }

    setDownloadingTracks(prev => [...prev, track.id]);

    try {
      const streamUrl = await getStreamUrl(track);
      if (!streamUrl) {
        throw new Error("Не удалось получить ссылку на стрим");
      }

      const response = await fetch(streamUrl);
      if (!response.ok) {
        throw new Error("Ошибка сети при скачивании");
      }
      let blob = await response.blob();

      if (blob.type.includes('mpegurl') || blob.type.includes('x-mpegURL') || streamUrl.includes('.m3u8')) {
        throw new Error("Скачивание недоступно для треков в формате HLS. Попробуйте другой трек.");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeTitle = track.title.replace(/[\\/*?:"<>|]/g, "");
      const safeAuthor = (track.user?.username || 'Unknown').replace(/[\\/*?:"<>|]/g, "");
      a.download = `${safeTitle} - ${safeAuthor}.mp3`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error("Download failed:", error);
      alert("Ошибка при скачивании трека. Пожалуйста, попробуйте еще раз.");
      return false;
    } finally {
      setDownloadingTracks(prev => prev.filter(id => id !== track.id));
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isLoading,
        playTrack,
        togglePlay,
        progress,
        duration,
        volume,
        setVolume,
        seek,
        playlist,
        setPlaylist,
        likedTracks,
        toggleLike,
        isLiked,
        playNext,
        playPrevious,
        isPremium,
        activatePremium,
        downloadTrack,
        downloadingTracks,
        premiumModalOpen,
        setPremiumModalOpen,
        pendingDownloadTrack,
        setPendingDownloadTrack,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerProvider;

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
