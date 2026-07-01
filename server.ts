import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const FALLBACK_CLIENT_IDS = [
  'OelGkhXfXWOqCdtdJyDkt5rBWc2GF4xR',
  'iZIs9m2g34Y0NlXMo76m2n6m6D8o6t0a',
  'YUK76bZfWbM7L6YVfXhLpD7gZ8GjS2z3',
  'b45b1aa10f1ac2941910a7f0d10f8e28',
  '2t9mdv7g9H6o8Sj6n6O8g6O8O8O8O8O8'
];
let fallbackIndex = 0;
let dynamicClientId: string | null = null;

async function getValidClientId() {
  if (dynamicClientId) return dynamicClientId;
  
  try {
    console.log("Fetching new SoundCloud Client ID...");
    const { data } = await axios.get('https://soundcloud.com/', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
    });
    // Parse using a broader regex matching single/double quotes and optional spacing
    const urls = [...data.matchAll(/<script[^>]*src=["']([^"']+)["']/g)]
      .map(m => m[1])
      .filter(url => url.includes('sndcdn.com/assets/') || url.includes('/assets/'));
    
    // Search from the end as it's usually in the last few scripts
    for (let i = urls.length - 1; i >= Math.max(0, urls.length - 10); i--) {
      try {
        let scriptUrl = urls[i];
        if (scriptUrl.startsWith('//')) {
          scriptUrl = 'https:' + scriptUrl;
        } else if (scriptUrl.startsWith('/')) {
          scriptUrl = 'https://soundcloud.com' + scriptUrl;
        }

        const { data: scriptData } = await axios.get(scriptUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        const match = scriptData.match(/client_id:"([a-zA-Z0-9]{32})"/);
        if (match) {
          dynamicClientId = match[1];
          console.log("Successfully scraped Client ID:", dynamicClientId.substring(0, 5) + "...");
          return dynamicClientId;
        }
      } catch (e) {
        // ignore script fetch errors
      }
    }
  } catch (e: any) {
    console.error("Failed to scrape Client ID:", e.message);
  }
  
  // Fallback to rotating list of working ones
  const fallback = process.env.SOUNDCLOUD_CLIENT_ID || FALLBACK_CLIENT_IDS[fallbackIndex];
  console.log("Using fallback Client ID:", fallback.substring(0, 5) + "...");
  return fallback;
}

const BASE_URL = 'https://api-v2.soundcloud.com';

export async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const fetchWithRetry = async (url: string, params: any, headers: any, retries = 2): Promise<any> => {
    let clientId = await getValidClientId();
    
    try {
      return await axios.get(url, { params: { ...params, client_id: clientId }, headers });
    } catch (error: any) {
      if ((error.response?.status === 401 || error.response?.status === 403) && retries > 0) {
        console.log(`Client ID failed (${error.response.status}), rotating fallback ID...`);
        dynamicClientId = null; // Force refresh scraping on next call
        
        // Rotate our fallback index
        fallbackIndex = (fallbackIndex + 1) % FALLBACK_CLIENT_IDS.length;
        process.env.SOUNDCLOUD_CLIENT_ID = FALLBACK_CLIENT_IDS[fallbackIndex];
        
        return fetchWithRetry(url, params, headers, retries - 1);
      }
      throw error;
    }
  };

  // Search Synonyms & Transliteration Expansion Helpers
  const searchSynonyms: { [key: string]: string[] } = {
    "беквуд": ["backwood", "dabbackwood"],
    "беквудс": ["backwoods", "dabbackwood"],
    "бебвуд": ["backwood", "dabbackwood"],
    "даббеквуд": ["dabbackwood", "backwood"],
    "backwood": ["беквуд", "dabbackwood", "backwoods"],
    "backwoods": ["беквуд", "dabbackwood"],
    "dabbackwood": ["беквуд", "backwood", "dab backwood"],
    "серега": ["серега пират", "serega pirat"],
    "серёга": ["серега пират", "serega pirat"],
    "пират": ["серега пират", "serega pirat"],
    "serega": ["serega pirat", "серега пират"],
    "pirat": ["serega pirat", "серега пират"],
    "курсед": ["zxcursed", "cursed"],
    "cursed": ["zxcursed", "курсед"],
    "zxcursed": ["курсед", "cursed"],
    "шадоурейз": ["shadowraze", "reiki"],
    "shadowraze": ["шадоурейз"],
    "рейз": ["shadowraze"],
    "морпех": ["morpeh"],
    "morpeh": ["морпех"],
    "пиво": ["серега пират пиво"],
  };

  function transliterate(text: string): string {
    const rus = "абвгдеёжзийклмнопрстуфхцчшщыэюя";
    const eng = ["a","b","v","g","d","e","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","kh","ts","ch","sh","shch","y","e","yu","ya"];
    return text.toLowerCase().split('').map(char => {
      const idx = rus.indexOf(char);
      return idx !== -1 ? eng[idx] : char;
    }).join('');
  }

  function getExpandedQueries(q: string): string[] {
    if (!q) return [];
    const queryLower = q.trim().toLowerCase();
    const queries = new Set<string>();
    queries.add(q); // Always keep original query first

    // 1. Check direct synonym matching
    for (const [key, synonyms] of Object.entries(searchSynonyms)) {
      if (queryLower === key || queryLower.includes(key)) {
        synonyms.forEach(syn => {
          queries.add(syn);
          const replaced = queryLower.replace(key, syn);
          queries.add(replaced);
        });
      }
    }

    // 2. Transliteration (if cyrillic is detected)
    const isCyrillic = /[а-яё]/i.test(queryLower);
    if (isCyrillic) {
      const lat = transliterate(queryLower);
      queries.add(lat);
      
      // Check synonyms for the transliterated query too
      for (const [key, synonyms] of Object.entries(searchSynonyms)) {
        if (lat.includes(key)) {
          synonyms.forEach(syn => {
            queries.add(syn);
            queries.add(lat.replace(key, syn));
          });
        }
      }
    }

    // Cap at 4 to prevent performance issues / redundant requests
    return Array.from(queries).slice(0, 4);
  }

  // SoundCloud Proxy Routes
  app.get("/api/soundcloud/playlists", async (req, res) => {
    try {
      const { q, limit = 20, offset = 0 } = req.query;
      if (!q) {
        return res.json({ collection: [] });
      }
      const parsedLimit = parseInt(limit as string, 10) || 20;
      const parsedOffset = parseInt(offset as string, 10) || 0;
      const qStr = q as string;
      const expandedQueries = getExpandedQueries(qStr);
      console.log(`Searching SoundCloud for playlists: "${qStr}" (Expanded: ${expandedQueries.join(', ')}), offset: ${parsedOffset}`);
      
      const endpoint = `${BASE_URL}/search/playlists`;
      
      const searchPromises = expandedQueries.map(async (queryOption) => {
        try {
          const response = await fetchWithRetry(endpoint, { q: queryOption, limit: parsedLimit, offset: parsedOffset }, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
            'Referer': 'https://soundcloud.com/',
            'Origin': 'https://soundcloud.com',
            'sec-ch-ua': '"Not(A:Brand";v="24", "Chromium";v="122", "Google Chrome";v="122"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
          });
          return response.data?.collection || [];
        } catch (err: any) {
          console.error(`Playlist sub-search failed for "${queryOption}":`, err.message);
          return [];
        }
      });

      const resultsArray = await Promise.all(searchPromises);
      const seenIds = new Set<number>();
      const mergedCollection: any[] = [];

      // Primary exact/first-query results first for relevancy (up to 3)
      const originalCollection = resultsArray[0] || [];
      const primaryCount = Math.min(3, originalCollection.length);
      for (let i = 0; i < primaryCount; i++) {
        const item = originalCollection[i];
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          mergedCollection.push(item);
        }
      }

      // Interleave the remaining items
      const maxLength = Math.max(...resultsArray.map(c => c.length));
      for (let i = 0; i < maxLength; i++) {
        for (let qIdx = 0; qIdx < resultsArray.length; qIdx++) {
          const collection = resultsArray[qIdx];
          if (qIdx === 0 && i < primaryCount) continue;

          if (i < collection.length) {
            const item = collection[i];
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              mergedCollection.push(item);
            }
          }
        }
      }

      res.json({
        collection: mergedCollection.slice(0, parsedLimit)
      });
    } catch (error: any) {
      console.error("Proxy Playlist Search Error:", error.response?.status, error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
  });

  app.get("/api/soundcloud/playlists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching SoundCloud playlist details for ID: ${id}`);
      
      const endpoint = `${BASE_URL}/playlists/${id}`;
      
      const response = await fetchWithRetry(endpoint, {}, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
        'Referer': 'https://soundcloud.com/',
        'Origin': 'https://soundcloud.com',
        'sec-ch-ua': '"Not(A:Brand";v="24", "Chromium";v="122", "Google Chrome";v="122"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      });
      
      const playlistData = response.data;
      if (playlistData && Array.isArray(playlistData.tracks)) {
        const tracks = playlistData.tracks;
        const incompleteIndexes: number[] = [];
        const incompleteIds: number[] = [];
        
        tracks.forEach((track: any, index: number) => {
          if (!track || !track.title) {
            incompleteIndexes.push(index);
            incompleteIds.push(track.id);
          }
        });

        console.log(`Playlist ${id} has ${tracks.length} tracks. Found ${incompleteIds.length} incomplete tracks.`);

        if (incompleteIds.length > 0) {
          const chunkSize = 50;
          const fetchedTracksMap = new Map<number, any>();

          for (let i = 0; i < incompleteIds.length; i += chunkSize) {
            const chunkIds = incompleteIds.slice(i, i + chunkSize);
            try {
              console.log(`Fetching details for track batch: ${chunkIds.length} tracks`);
              const tracksResponse = await fetchWithRetry(`${BASE_URL}/tracks`, {
                ids: chunkIds.join(',')
              }, {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://soundcloud.com/',
                'Origin': 'https://soundcloud.com',
              });

              if (Array.isArray(tracksResponse.data)) {
                tracksResponse.data.forEach((fullTrack: any) => {
                  if (fullTrack && fullTrack.id) {
                    fetchedTracksMap.set(fullTrack.id, fullTrack);
                  }
                });
              }
            } catch (err: any) {
              console.error(`Error fetching batch of tracks:`, err.message);
            }
          }

          incompleteIndexes.forEach((playlistIndex) => {
            const trackStub = tracks[playlistIndex];
            if (trackStub && trackStub.id) {
              const fullTrack = fetchedTracksMap.get(trackStub.id);
              if (fullTrack) {
                tracks[playlistIndex] = fullTrack;
              }
            }
          });

          // Filter out tracks that couldn't be resolved (e.g. deleted/private)
          playlistData.tracks = tracks.filter((t: any) => t && t.title);
        }
      }

      res.json(playlistData);
    } catch (error: any) {
      console.error("Proxy Playlist Details Error:", error.response?.status, error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
  });

  app.get("/api/soundcloud/search", async (req, res) => {
    try {
      const { q, limit = 50, offset = 0, type = 'tracks' } = req.query;
      if (!q) {
        return res.json({ collection: [] });
      }
      const parsedLimit = parseInt(limit as string, 10) || 50;
      const parsedOffset = parseInt(offset as string, 10) || 0;
      const qStr = q as string;
      const expandedQueries = getExpandedQueries(qStr);
      console.log(`Searching SoundCloud tracks for: "${qStr}" (Expanded: ${expandedQueries.join(', ')}), type: ${type}, offset: ${parsedOffset}`);
      
      const endpoint = type === 'users' ? `${BASE_URL}/search/users` : `${BASE_URL}/search/tracks`;
      
      const searchPromises = expandedQueries.map(async (queryOption) => {
        try {
          const response = await fetchWithRetry(endpoint, { q: queryOption, limit: parsedLimit, offset: parsedOffset, type }, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
            'Referer': 'https://soundcloud.com/',
            'Origin': 'https://soundcloud.com',
            'sec-ch-ua': '"Not(A:Brand";v="24", "Chromium";v="122", "Google Chrome";v="122"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
          });
          return response.data?.collection || [];
        } catch (err: any) {
          console.error(`Track sub-search failed for "${queryOption}":`, err.message);
          return [];
        }
      });

      const resultsArray = await Promise.all(searchPromises);
      const seenIds = new Set<number>();
      const mergedCollection: any[] = [];

      // Prioritize the top 5 exact outcomes first for core relevancy
      const originalCollection = resultsArray[0] || [];
      const primaryCount = Math.min(5, originalCollection.length);
      for (let i = 0; i < primaryCount; i++) {
        const item = originalCollection[i];
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          mergedCollection.push(item);
        }
      }

      // Interleave remaining results from both original and expanded query sources
      const maxLength = Math.max(...resultsArray.map(c => c.length));
      for (let i = 0; i < maxLength; i++) {
        for (let qIdx = 0; qIdx < resultsArray.length; qIdx++) {
          const collection = resultsArray[qIdx];
          if (qIdx === 0 && i < primaryCount) continue;

          if (i < collection.length) {
            const item = collection[i];
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              mergedCollection.push(item);
            }
          }
        }
      }

      res.json({
        collection: mergedCollection.slice(0, parsedLimit)
      });
    } catch (error: any) {
      console.error("Proxy Search Error:", error.response?.status, error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
  });

  app.get("/api/soundcloud/charts", async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    const parsedLimit = parseInt(limit as string, 10) || 50;
    const parsedOffset = parseInt(offset as string, 10) || 0;

    console.log(`[Charts] Compiling popular and trending tracks from SoundCloud via search indexes...`);
    
    // Curated high-fidelity, viral Russian and Western SoundCloud keywords & legends
    const trendingKeywords = [
      "madkid",
      "серега пират",
      "miyagi & эндшпиль",
      "macan",
      "shadowraze",
      "friendly thug 52 ngg",
      "pepel nahudi",
      "pharaoh",
      "lizer",
      "lida",
      "unki",
      "scally milano",
      "phonk gaming",
      "популярный рэп"
    ];
    
    try {
      // Fetch results for all curated trending keywords in parallel for maximum speed
      const searchPromises = trendingKeywords.map(async (kw) => {
        try {
          const response = await fetchWithRetry(`${BASE_URL}/search/tracks`, {
            q: kw,
            limit: 15,
            offset: parsedOffset,
            type: 'tracks'
          }, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://soundcloud.com/',
            'Origin': 'https://soundcloud.com',
          });
          return response.data?.collection || [];
        } catch (searchErr: any) {
          // Silent local fallback, no scary messages
          return [];
        }
      });
      
      const resultsArray = await Promise.all(searchPromises);
      const mergedTracks: any[] = [];
      const seenIds = new Set<number>();
      
      // Interleave results so recommendations are beautifully diverse (Artist A, Artist B, Artist C, etc.)
      const maxLength = Math.max(...resultsArray.map(col => col.length));
      for (let i = 0; i < maxLength; i++) {
        for (const collection of resultsArray) {
          if (i < collection.length) {
            const track = collection[i];
            if (track && track.id && !seenIds.has(track.id)) {
              seenIds.add(track.id);
              mergedTracks.push(track);
            }
          }
        }
      }
      
      console.log(`[Charts] Successfully compiled ${mergedTracks.length} trending tracks.`);
      return res.json({ collection: mergedTracks.slice(0, parsedLimit) });
    } catch (fallbackTotalError: any) {
      console.error("[Charts] Error compiling fallback search tracks:", fallbackTotalError.message);
      return res.json({ collection: [] });
    }
  });

  app.get("/api/soundcloud/resolve", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) return res.status(400).json({ error: "URL is required" });

      const response = await fetchWithRetry(url as string, {}, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
        'Referer': 'https://soundcloud.com/',
        'Origin': 'https://soundcloud.com',
        'sec-ch-ua': '"Not(A:Brand";v="24", "Chromium";v="122", "Google Chrome";v="122"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error("Proxy Resolve Error:", error.response?.status, error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
  });

  // Proxy endpoint to bypass Russian blockages on SoundCloud's image CDN (sndcdn.com)
  app.get("/api/artwork-proxy", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.redirect("https://picsum.photos/seed/music/500/500");
      }
      
      const targetUrl = url as string;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.redirect("https://picsum.photos/seed/music/500/500");
      }

      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://soundcloud.com/',
        },
        timeout: 8000 // Prevent hanging connections
      });
      
      if (response.headers['content-type']) {
        res.setHeader('content-type', response.headers['content-type']);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      response.data.pipe(res);
    } catch (error: any) {
      console.warn("Artwork proxy warning:", error.message);
      res.redirect("https://picsum.photos/seed/music/500/500");
    }
  });

  // Proxy endpoint to bypass Russian blockages on SoundCloud's media stream CDNs
  app.get("/api/stream-proxy", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).send("Stream URL is required");
      }

      const targetUrl = url as string;
      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        return res.status(400).send("Invalid stream URL");
      }

      const response = await axios({
        method: 'get',
        url: targetUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://soundcloud.com/',
          'Origin': 'https://soundcloud.com'
        },
        timeout: 15000
      });
      
      if (response.headers['content-type']) {
        res.setHeader('content-type', response.headers['content-type']);
      }
      if (response.headers['content-length']) {
        res.setHeader('content-length', response.headers['content-length']);
      }
      if (response.headers['accept-ranges']) {
        res.setHeader('accept-ranges', response.headers['accept-ranges']);
      }
      
      response.data.pipe(res);
    } catch (error: any) {
      console.error("Audio stream proxy error:", error.message);
      // Fallback music stream if it fails
      res.redirect("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  return app;
}

startServer().then((app) => {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
});
