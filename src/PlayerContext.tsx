import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { SoundCloudTrack, getStreamUrl } from './services/soundcloud';
import Hls from 'hls.js';

interface PlayerContextType {
  currentTrack: SoundCloudTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  playTrack: (track: SoundCloudTrack) => void;
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

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', updateProgress);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', updateProgress);
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

  const playTrack = async (track: SoundCloudTrack) => {
    if (!audioRef.current) return;

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
