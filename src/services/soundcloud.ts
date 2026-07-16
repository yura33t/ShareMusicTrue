import axios from 'axios';

export const getSafeArtworkUrl = (
  url: string | null | undefined, 
  size: 't500x500' | 't300x300' | 'large' = 't300x300'
): string => {
  if (!url) return 'https://picsum.photos/seed/music/500/500';
  let safeUrl = url.replace(/^http:/, 'https:');
  
  if (safeUrl.includes('-large.')) {
     safeUrl = safeUrl.replace('-large.', `-${size}.`);
  }
  
  // Bypass CDN blockages for Russian users by proxying sndcdn.com images
  if (safeUrl.includes('sndcdn.com')) {
    return `/api/artwork-proxy?url=${encodeURIComponent(safeUrl)}`;
  }
  
  return safeUrl;
};

export interface SoundCloudTrack {
  id: number;
  title: string;
  user: {
    username: string;
    avatar_url: string;
  };
  artwork_url: string;
  duration: number;
  permalink_url: string;
  stream_url?: string;
  media?: {
    transcodings: Array<{
      url: string;
      preset: string;
      format: {
        protocol: string;
        mime_type: string;
      };
    }>;
  };
}

export interface SoundCloudPlaylist {
  id: number;
  title: string;
  artwork_url?: string;
  track_count?: number;
  user: {
    username: string;
    avatar_url: string;
  };
  tracks?: SoundCloudTrack[];
}

export const searchPlaylists = async (query: string, offset: number = 0): Promise<SoundCloudPlaylist[]> => {
  try {
    const response = await axios.get(`/api/soundcloud/playlists`, {
      params: {
        q: query,
        limit: 20,
        offset,
      },
    });
    return response.data.collection || [];
  } catch (error) {
    console.error('Error searching playlists:', error);
    return [];
  }
};

export const getPlaylistDetails = async (playlistId: number): Promise<SoundCloudPlaylist | null> => {
  try {
    const response = await axios.get(`/api/soundcloud/playlists/${playlistId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching playlist ${playlistId} details:`, error);
    return null;
  }
};

export const searchTracks = async (query: string, offset: number = 0, type: 'tracks' | 'users' = 'tracks'): Promise<SoundCloudTrack[]> => {
  try {
    const response = await axios.get(`/api/soundcloud/search`, {
      params: {
        q: query,
        limit: 50,
        offset,
        type,
      },
    });
    return response.data.collection || [];
  } catch (error) {
    console.error('Error searching tracks:', error);
    // Return empty but could return dummy if needed
    return [];
  }
};

export const getRecommendations = async (offset: number = 0): Promise<SoundCloudTrack[]> => {
  try {
    // 1. Try fetching real SoundCloud Top Charts for All Music first!
    const response = await axios.get('/api/soundcloud/charts', {
      params: { limit: 50, offset }
    });
    const tracks = response.data.collection || [];
    if (tracks.length > 0) {
      console.log('Successfully fetched SoundCloud charts for recommendations.');
      return tracks;
    }
  } catch (err) {
    console.warn('Could not fetch SoundCloud charts, falling back to popular search queries:', err);
  }

  try {
    // 2. Fallback to searching popular artist/hits queries in SoundCloud if charts fail
    const queries = ['Russian Hits', 'Miyagi', 'Scriptonite', 'Zivert', 'Pharaoh', 'Instasamka', 'Macan'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    const results = await searchTracks(randomQuery);
    
    if (results.length === 0) {
      // Try one more time with a different query if the first one failed
      const fallbackQuery = queries.find(q => q !== randomQuery) || 'Music';
      const fallbackResults = await searchTracks(fallbackQuery);
      if (fallbackResults.length > 0) return fallbackResults;
      
      // If still no results, return dummy data for demo purposes
      return getDummyTracks();
    }
    
    return results;
  } catch (error) {
    console.error('Error in getRecommendations (fallback):', error);
    return getDummyTracks();
  }
};

const getDummyTracks = (): SoundCloudTrack[] => [
  {
    id: 1,
    title: "Demo Track 1 (API Blocked)",
    user: { username: "shareMusic Demo", avatar_url: "https://picsum.photos/seed/user1/100/100" },
    artwork_url: "https://picsum.photos/seed/track1/500/500",
    duration: 180000,
    permalink_url: "#",
  },
  {
    id: 2,
    title: "Demo Track 2 (API Blocked)",
    user: { username: "shareMusic Demo", avatar_url: "https://picsum.photos/seed/user2/100/100" },
    artwork_url: "https://picsum.photos/seed/track2/500/500",
    duration: 210000,
    permalink_url: "#",
  },
  {
    id: 3,
    title: "Demo Track 3 (API Blocked)",
    user: { username: "shareMusic Demo", avatar_url: "https://picsum.photos/seed/user3/100/100" },
    artwork_url: "https://picsum.photos/seed/track3/500/500",
    duration: 150000,
    permalink_url: "#",
  }
];

interface CachedStream {
  url: string;
  timestamp: number;
}

const streamCache = new Map<number, CachedStream>();

export const getCachedStreamUrl = (trackId: number): string | null => {
  const cached = streamCache.get(trackId);
  if (!cached) return null;
  // If the cached stream URL is older than 10 minutes, expire it
  if (Date.now() - cached.timestamp > 10 * 60 * 1000) {
    streamCache.delete(trackId);
    return null;
  }
  return cached.url;
};

export const invalidateCachedStream = (trackId: number): void => {
  streamCache.delete(trackId);
};

export const getStreamUrl = async (track: SoundCloudTrack, forceFresh = false): Promise<string | null> => {
  if (!track || !track.id) return null;

  if (!forceFresh) {
    const cachedUrl = getCachedStreamUrl(track.id);
    if (cachedUrl) return cachedUrl;
  } else {
    streamCache.delete(track.id);
  }

  try {
    let transcodingUrl: string | undefined;
    if (track.media?.transcodings?.length) {
      const transcoding = track.media.transcodings.find(
        (t) => t.format?.protocol === 'progressive'
      ) || track.media.transcodings[0];
      transcodingUrl = transcoding?.url;
    }

    const response = await axios.get('/api/soundcloud/stream-url', {
      params: {
        trackId: track.id,
        transcodingUrl,
      },
      timeout: 10000,
    });

    const streamUrl = response.data?.url;
    if (streamUrl) {
      streamCache.set(track.id, { url: streamUrl, timestamp: Date.now() });
      return streamUrl;
    }
    return null;
  } catch (error) {
    console.error(`Error getting stream URL for track ${track.id}:`, error);
    return null;
  }
};
