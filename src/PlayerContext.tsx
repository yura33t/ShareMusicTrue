import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { SoundCloudTrack, getStreamUrl } from './services/soundcloud';
import Hls from 'hls.js';

interface PlayerContextType {
  currentTrack: SoundCloudTrack | null;
  isPlaying: boolean;
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
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      
      const current = currentTrackRef.current;
      const list = playlistRef.current;
      if (current && list) {
        const currentIndex = list.findIndex(t => t.id === current.id);
        if (currentIndex !== -1 && currentIndex < list.length - 1) {
            playTrack(list[currentIndex + 1]);
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

    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }

    const streamUrl = await getStreamUrl(track);
    if (!streamUrl) {
      console.error('Could not get stream URL');
      return;
    }

    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(audioRef.current);
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          try {
            await audioRef.current?.play();
          } catch (err) {
            console.warn('Play interrupted', err);
            setIsPlaying(false);
          }
        });
      } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        audioRef.current.src = streamUrl;
        try {
          await audioRef.current.play();
        } catch (err) {
          console.warn('Play interrupted', err);
          setIsPlaying(false);
        }
      }
    } else {
      if (hlsRef.current) hlsRef.current.destroy();
      audioRef.current.src = streamUrl;
      try {
        await audioRef.current.play();
      } catch (err) {
        console.warn('Play interrupted', err);
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack) return;
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

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
