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

export const getRecommendations = async (): Promise<SoundCloudTrack[]> => {
  try {
    // Using a popular Russian music query as a base for recommendations
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
    console.error('Error in getRecommendations:', error);
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

export const getStreamUrl = async (track: SoundCloudTrack): Promise<string | null> => {
  try {
    if (!track.media || !track.media.transcodings) {
      // Return a demo track for dummy tracks
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }

    // Prefer progressive mp3 if available, otherwise HLS
    const transcoding = track.media.transcodings.find(
      (t) => t.format.protocol === 'progressive'
    ) || track.media.transcodings[0];

    if (!transcoding) return null;

    const response = await axios.get(`/api/soundcloud/resolve`, {
      params: {
        url: transcoding.url,
      },
    });

    const rawUrl = response.data.url;
    if (!rawUrl) return null;

    // Proxy the audio stream stream to bypass Russian ISP blockages on SoundCloud's media CDNs
    return `/api/stream-proxy?url=${encodeURIComponent(rawUrl)}`;
  } catch (error) {
    console.error('Error getting stream URL:', error);
    // Fallback to a royalty-free demo track if resolve fails
    return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  }
};
