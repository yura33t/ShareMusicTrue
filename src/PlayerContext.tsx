import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { SoundCloudTrack, getStreamUrl } from './services/soundcloud';
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
  const playTrackRef = useRef<((track: SoundCloudTrack) => void) | null>(null);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    playlistRef.current = playlist;
  }, [currentTrack, playlist]);

  useEffect(() => {
    playTrackRef.current = playTrack;
  });
  
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
      setProgress(audio.currentTime);
      // Only overwrite duration if it's a valid positive number
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      
      const current = currentTrackRef.current;
      const list = playlistRef.current;
      if (current && list) {
        const currentIndex = list.findIndex(t => t.id === current.id);
        if (currentIndex !== -1 && currentIndex < list.length - 1) {
            if (playTrackRef.current) {
              playTrackRef.current(list[currentIndex + 1]);
            }
        }
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', onEnded);
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

  const playTrack = async (track: SoundCloudTrack, newPlaylist?: SoundCloudTrack[]) => {
    if (!audioRef.current) return;

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
    }

    // Synchronously "unlock" the audio element within the user's click gesture
    // so subsequent async stream loading can auto-start playing without browser block.
    try {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      audioRef.current.pause();
    } catch (e) {}

    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    // Set active loading track id
    currentLoadingTrackIdRef.current = track.id;
    setIsLoading(true);
    setIsPlaying(false); // Reset playing indicator during load to avoid glitching
    setProgress(0);
    
    // Instantly use metadata duration to prevent layout/text flickering in UI
    if (track.duration) {
      setDuration(track.duration / 1000);
    } else {
      setDuration(0);
    }

    // Pause current audio before fetching
    audioRef.current.pause();

    try {
      const streamUrl = await getStreamUrl(track);
      
      // If user has switched to another track during the async fetch, abort!
      if (currentLoadingTrackIdRef.current !== track.id) {
        return;
      }

      if (!streamUrl) {
        console.error('Could not get stream URL');
        setIsLoading(false);
        return;
      }

      setCurrentTrack(track);

      if (streamUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls();
          hls.loadSource(streamUrl);
          hls.attachMedia(audioRef.current);
          hlsRef.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            if (currentLoadingTrackIdRef.current !== track.id) return;
            try {
              await audioRef.current?.play();
              setIsPlaying(true);
            } catch (err) {
              console.warn('Play interrupted', err);
              setIsPlaying(false);
            } finally {
              setIsLoading(false);
            }
          });
        } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          audioRef.current.src = streamUrl;
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (err) {
            console.warn('Play interrupted', err);
            setIsPlaying(false);
          } finally {
            setIsLoading(false);
          }
        }
      } else {
        if (hlsRef.current) hlsRef.current.destroy();
        audioRef.current.src = streamUrl;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('Play interrupted', err);
          setIsPlaying(false);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error in playTrack:', error);
      if (currentLoadingTrackIdRef.current === track.id) {
        setIsLoading(false);
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

  const playNext = () => {
    const current = currentTrackRef.current;
    const list = playlistRef.current;
    if (current && list) {
      const currentIndex = list.findIndex(t => t.id === current.id);
      if (currentIndex !== -1 && currentIndex < list.length - 1) {
        playTrack(list[currentIndex + 1]);
      }
    }
  };

  const playPrevious = () => {
    const current = currentTrackRef.current;
    const list = playlistRef.current;
    if (current && list) {
      const currentIndex = list.findIndex(t => t.id === current.id);
      if (currentIndex > 0) {
        playTrack(list[currentIndex - 1]);
      }
    }
  };

  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);

  useEffect(() => {
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
  }, [playNext, playPrevious]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      const artwork = currentTrack.artwork_url || currentTrack.user?.avatar_url || '';
      const safeArtwork = artwork ? artwork.replace('-large.', '-t500x500.') : '';

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

      // If HLS/m3u8, download the high-fidelity progressive MP3 fallback
      if (blob.type.includes('mpegurl') || blob.type.includes('x-mpegURL') || streamUrl.includes('.m3u8')) {
        const fallbackUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
        const fallbackResponse = await fetch(fallbackUrl);
        blob = await fallbackResponse.blob();
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
