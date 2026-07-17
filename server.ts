import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "https://dhukbnkjwairghjdewjh.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);


const FALLBACK_CLIENT_IDS = [
  'pKk38t8ErXEMPwcTI3sjY3kmQ3nyfbRl', // Fresh verified working key (July 2026)
  'OelGkhXfXWOqCdtdJyDkt5rBWc2GF4xR',
  'iZIs9m2g34Y0NlXMo76m2n6m6D8o6t0a',
  'YUK76bZfWbM7L6YVfXhLpD7gZ8GjS2z3',
  'b45b1aa10f1ac2941910a7f0d10f8e28'
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
        },
        timeout: 4000 // 4 seconds limit to prevent hanging the server
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
            },
            timeout: 3000 // 3 seconds limit per script
        });
        const match = scriptData.match(/client_id[:=]\s*["']([a-zA-Z0-9]{32})["']/);
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

const apiCache = new Map<string, { data: any, expiresAt: number }>();

function getCache(key: string): any | null {
  const item = apiCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    apiCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key: string, data: any, ttlMs: number = 300000) {
  apiCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const fetchWithRetry = async (url: string, params: any, headers: any, retries = 2): Promise<any> => {
    let clientId = await getValidClientId();
    
    try {
      return await axios.get(url, { 
        params: { ...params, client_id: clientId }, 
        headers,
        timeout: 6000 // 6 seconds timeout limit per request
      });
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isAuthError = error.response?.status === 401 || error.response?.status === 403;

      if ((isAuthError || isTimeout) && retries > 0) {
        console.log(`SoundCloud request failed (status: ${error.response?.status}, timeout: ${isTimeout}), rotating fallback ID...`);
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
    "мияги": ["miyagi", "miyagi & эндшпиль", "miyagi and endshpil"],
    "miyagi": ["мияги", "miyagi & эндшпиль"],
    "эндшпиль": ["miyagi & эндшпиль", "endshpil"],
    "скриптонит": ["scriptonite", "скрип"],
    "scriptonite": ["скриптонит"],
    "баста": ["basta"],
    "киш": ["король и шут", "kish"],
    "король и шут": ["киш", "король и шут"],
    "кизару": ["kizaru"],
    "макан": ["macan"],
    "тейп": ["big baby tape", "tape"],
    "три дня": ["три дня дождя"],
    "фараон": ["pharaoh"],
    "лсп": ["lsp"],
  };

  function transliterate(text: string): string {
    const rus = "абвгдеёжзийклмнопрстуфхцчшщыэюя";
    const eng = ["a","b","v","g","d","e","e","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","kh","ts","ch","sh","shch","y","e","yu","ya"];
    return text.toLowerCase().split('').map(char => {
      const idx = rus.indexOf(char);
      return idx !== -1 ? eng[idx] : char;
    }).join('');
  }

  function convertKeyboardLayout(text: string): string {
    const rusLayout = "йцукенгшщзхъфывапролджэячсмитьбю.ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,";
    const engLayout = "qwertyuiop[]asdfghjkl;'zxcvbnm,.QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>?";
    let rusToEngResult = "";
    let engToRusResult = "";
    
    for (const char of text) {
      const rIdx = rusLayout.indexOf(char);
      rusToEngResult += rIdx !== -1 ? engLayout[rIdx] : char;
      
      const eIdx = engLayout.indexOf(char);
      engToRusResult += eIdx !== -1 ? rusLayout[eIdx] : char;
    }
    
    // If the input has Cyrillic, rusToEng is a meaningful layout-alternative
    // If input is purely English/symbols, engToRus is a meaningful layout-alternative
    const hasCyrillic = /[а-яё]/i.test(text);
    return hasCyrillic ? rusToEngResult : engToRusResult;
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

    // 3. Convert layout in case of typos (e.g. "cthtub gbhfn" -> "серега пират")
    const layoutAlt = convertKeyboardLayout(queryLower);
    if (layoutAlt && layoutAlt !== queryLower) {
      queries.add(layoutAlt);
      for (const [key, synonyms] of Object.entries(searchSynonyms)) {
        if (layoutAlt.includes(key) || key.includes(layoutAlt)) {
          synonyms.forEach(syn => {
            queries.add(syn);
            queries.add(layoutAlt.replace(key, syn));
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

      const cacheKey = `search:${type}:${qStr}:${parsedLimit}:${parsedOffset}`;
      const cached = getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

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

      const resultPayload = {
        collection: mergedCollection.slice(0, parsedLimit)
      };
      setCache(cacheKey, resultPayload, 300000); // Cache for 5 minutes

      res.json(resultPayload);
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
    
    // Curated high-fidelity, viral Russian and Western SoundCloud keywords & legends (45+ items)
    const trendingKeywordsPool = [
      // Russian Rap & Hip Hop
      "серега пират",
      "miyagi & эндшпиль",
      "macan",
      "friendly thug 52 ngg",
      "pepel nahudi",
      "pharaoh",
      "lizer",
      "lida",
      "unki",
      "scally milano",
      "morgenshtern",
      "og buda",
      "basta",
      "scriptonite",
      "kizaru",
      "obladaet",
      "saluki",
      "big baby tape",
      "pyrokinesis",
      "три дня дождя",
      "mukka",
      "король и шут",
      
      // Dota/Gaming & Phonk
      "shadowraze",
      "zxcursed",
      "reiki",
      "phonk gaming",
      "drift phonk",
      "memphis rap",
      "madkid",
      "sadsvit",
      "plenka",
      "sudno",
      "molchat doma",

      // Pop & Viral
      "zivert",
      "instasamka",
      "jony",
      "the limba",
      "hamali & navai",
      "niletto",
      "gayazovs brothers",
      
      // Electronic / DnB / Club / Synthwave / House
      "drum and bass",
      "the prodigy",
      "skrillex",
      "fred again",
      "electronic workout",
      "synthwave hits",
      "hardstyle gaming",
      "techno house",
      "lofi hip hop chill",
      "chillhop beats",
      "deep house vocal"
    ];
    
    // Select 6 random keywords from the pool to guarantee high diversity and freshness on each request
    const selectedKeywords: string[] = [];
    const poolCopy = [...trendingKeywordsPool];
    for (let i = 0; i < 6; i++) {
      if (poolCopy.length === 0) break;
      const idx = Math.floor(Math.random() * poolCopy.length);
      selectedKeywords.push(poolCopy.splice(idx, 1)[0]);
    }
    
    try {
      // Fetch results for 6 randomly picked keywords in parallel
      const searchPromises = selectedKeywords.map(async (kw) => {
        try {
          const response = await fetchWithRetry(`${BASE_URL}/search/tracks`, {
            q: kw,
            limit: 20,
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
      
      // Fully shuffle the merged collection to ensure maximum randomness and variety on page reload
      const randomizedTracks = mergedTracks.sort(() => Math.random() - 0.5);
      
      console.log(`[Charts] Successfully compiled ${randomizedTracks.length} trending tracks.`);
      return res.json({ collection: randomizedTracks.slice(0, parsedLimit) });
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

  app.get("/api/soundcloud/stream-url", async (req, res) => {
    try {
      const { trackId, transcodingUrl, forceFresh } = req.query;
      if (!trackId) {
        return res.status(400).json({ error: "trackId is required" });
      }

      const cacheKey = `stream:${trackId}`;
      if (forceFresh === 'true') {
        apiCache.delete(cacheKey);
      } else {
        const cached = getCache(cacheKey);
        if (cached) {
          return res.json({ url: cached });
        }
      }

      let rawUrl: string | null = null;

      if (transcodingUrl) {
        try {
          const resp = await fetchWithRetry(transcodingUrl as string, {}, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://soundcloud.com/',
            'Origin': 'https://soundcloud.com'
          });
          rawUrl = resp.data?.url;
        } catch (e) {
          // Fallback to track details
        }
      }

      if (!rawUrl) {
        try {
          const trackResp = await fetchWithRetry(`${BASE_URL}/tracks/${trackId}`, {}, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://soundcloud.com/',
            'Origin': 'https://soundcloud.com'
          });
          const trackData = trackResp.data;
          if (trackData && trackData.media && Array.isArray(trackData.media.transcodings)) {
            const transcodings = trackData.media.transcodings;
            const transcoding = transcodings.find((t: any) => t.format?.protocol === 'progressive') || transcodings[0];
            if (transcoding && transcoding.url) {
              const resp = await fetchWithRetry(transcoding.url, {}, {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://soundcloud.com/',
                'Origin': 'https://soundcloud.com'
              });
              rawUrl = resp.data?.url;
            }
          }
        } catch (trackErr: any) {
          console.error(`Failed to fetch track details for trackId ${trackId}:`, trackErr.message);
        }
      }

      if (rawUrl) {
        const proxiedUrl = `/api/stream-proxy?url=${encodeURIComponent(rawUrl)}`;
        setCache(cacheKey, proxiedUrl, 8 * 60 * 1000); // 8 minutes TTL (shorter than frontend's 10 minutes to ensure fresh rotation)
        return res.json({ url: proxiedUrl });
      }

      return res.status(404).json({ error: "Stream URL not found" });
    } catch (error: any) {
      console.error("Stream URL Resolution Error:", error.message);
      return res.status(500).json({ error: "Internal server error resolving stream" });
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
      res.status(502).json({ error: "Audio stream unavailable" });
    }
  });

  // ==========================================
  // USER AUTHENTICATION ENDPOINTS (SUPABASE)
  // ==========================================

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, avatar_url } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
      }

      // Check username validity: English only, no special chars, 4+ chars, does not start with digit
      if (!isValidUsername(username)) {
        return res.status(400).json({ 
          error: "Имя пользователя должно быть на английском (буквы и цифры), длиной от 4 символов и не начинаться с цифры." 
        });
      }

      if (password.length < 4) {
        return res.status(400).json({ error: "Пароль должен содержать не менее 4 символов" });
      }

      const pHash = hashPassword(password);

      // Check if user already exists in Supabase
      const { data: existingUser, error: checkError } = await supabase
        .from("app_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

      if (checkError) {
        console.error("Supabase user check error:", checkError.message);
        return res.status(500).json({ error: "Ошибка базы данных при проверке пользователя" });
      }

      if (existingUser) {
        return res.status(400).json({ error: "Это имя пользователя уже занято" });
      }

      // Insert new user
      const { data: newUser, error: insertError } = await supabase
        .from("app_users")
        .insert({
          username,
          password_hash: pHash,
          avatar_url: avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`
        })
        .select("id, username, avatar_url")
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError.message);
        return res.status(500).json({ error: "Ошибка базы данных при создании пользователя" });
      }

      return res.json({ success: true, user: newUser });
    } catch (err: any) {
      console.error("Register error:", err.message);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Имя пользователя и пароль обязательны" });
      }

      const pHash = hashPassword(password);

      const { data: user, error: selectError } = await supabase
        .from("app_users")
        .select("id, username, avatar_url, password_hash")
        .eq("username", username)
        .maybeSingle();

      if (selectError) {
        console.error("Supabase login select error:", selectError.message);
        return res.status(500).json({ error: "Ошибка базы данных при поиске пользователя" });
      }

      if (!user || user.password_hash !== pHash) {
        return res.status(401).json({ error: "Неверное имя пользователя или пароль" });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url
        }
      });
    } catch (err: any) {
      console.error("Login error:", err.message);
      return res.status(500).json({ error: "Внутренняя ошибка сервера" });
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

// ==========================================
// DB AUTH & CO-LISTENING ROOM HELPERS & WS
// ==========================================

function isValidUsername(username: string): boolean {
  const englishLettersAndNumbers = /^[a-zA-Z0-9]{4,20}$/;
  const startsWithDigit = /^\d/;
  return englishLettersAndNumbers.test(username) && !startsWithDigit.test(username);
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function setupWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname } = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch (e) {
      socket.destroy();
    }
  });

  interface ConnectionInfo {
    ws: WebSocket;
    roomId: string;
    username: string;
  }
  const activeConnections = new Set<ConnectionInfo>();

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let currentUsername: string | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        const { type, payload } = data;

        if (type === 'join_room') {
          const { roomId, username, avatarUrl, isCreating } = payload;
          if (!roomId || !username) return;

          currentRoomId = roomId.trim().toLowerCase();
          currentUsername = username;

          // Check if room exists in rooms table
          const { data: existingRoom, error: checkError } = await supabase
            .from("rooms")
            .select("id, owner_username")
            .eq("id", currentRoomId)
            .maybeSingle();

          if (checkError) {
            console.error("Error checking room presence:", checkError.message);
          }

          if (!isCreating && !existingRoom) {
            // Room does not exist. Return error and disconnect.
            ws.send(JSON.stringify({
              type: 'room_error',
              payload: { message: `Лобби "${roomId.toUpperCase()}" не найдено. Проверьте код комнаты или создайте новое лобби!` }
            }));
            ws.close();
            return;
          }

          // Add to current active WS connections
          activeConnections.add({ ws, roomId: currentRoomId, username });

          // 1. Ensure room state structure exists in rooms table
          if (isCreating && !existingRoom) {
            await supabase.from("rooms").insert({
              id: currentRoomId,
              owner_username: currentUsername,
              is_playing: false,
              progress: 0
            });
          } else if (existingRoom && !existingRoom.owner_username) {
            // Backfill owner if null
            await supabase.from("rooms").update({
              owner_username: currentUsername
            }).eq("id", currentRoomId);
          }

          // 2. Add or update user presence in room_members table
          await supabase.from("room_members").upsert({
            room_id: currentRoomId,
            username: currentUsername,
            avatar_url: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
            last_seen: new Date().toISOString()
          }, { onConflict: "room_id,username" });

          // 3. Add system message to database
          const joinMsg = {
            id: `sys-${Date.now()}`,
            username: 'System',
            message: `${username} joined the room`,
            timestamp: Date.now()
          };
          
          await supabase.from("room_chat").insert({
            room_id: currentRoomId,
            username: 'System',
            message: `${username} joined the room`
          });

          // 4. Load full room state, members list, and chat logs from Supabase
          const [roomResult, membersResult, chatResult] = await Promise.all([
            supabase.from("rooms").select("*").eq("id", currentRoomId).maybeSingle(),
            supabase.from("room_members").select("username, avatar_url").eq("room_id", currentRoomId),
            supabase.from("room_chat").select("id, username, message, timestamp").eq("room_id", currentRoomId).order("timestamp", { ascending: true }).limit(50)
          ]);

          const room = roomResult.data;
          const membersList = (membersResult.data || []).map(m => ({
            id: m.username,
            username: m.username,
            avatarUrl: m.avatar_url
          }));
          const chatList = (chatResult.data || []).map(c => ({
            id: c.id,
            username: c.username,
            message: c.message,
            timestamp: new Date(c.timestamp).getTime()
          }));

          // Send initial synchronized room payload to joining member with ownerUsername
          ws.send(JSON.stringify({
            type: 'room_sync',
            payload: {
              roomId: currentRoomId,
              ownerUsername: room?.owner_username || currentUsername,
              currentTrack: room?.current_track || null,
              isPlaying: room?.is_playing || false,
              progress: room?.is_playing && room?.last_updated ? room.progress + (Date.now() - new Date(room.last_updated).getTime()) / 1000 : (room?.progress || 0),
              members: membersList,
              playlist: room?.playlist || [],
              chat: chatList,
              myMemberId: currentUsername
            }
          }));

          // Broadcast updated member roster and system message to others
          activeConnections.forEach(conn => {
            if (conn.roomId === currentRoomId && conn.username !== currentUsername && conn.ws.readyState === WebSocket.OPEN) {
              conn.ws.send(JSON.stringify({
                type: 'members_updated',
                payload: { members: membersList }
              }));
              conn.ws.send(JSON.stringify({
                type: 'chat_message_received',
                payload: joinMsg
              }));
            }
          });
        }

        else if (type === 'track_change') {
          if (!currentRoomId || !currentUsername) return;
          const { track, playlist } = payload;

          await supabase.from("rooms").update({
            current_track: track,
            playlist: playlist || [],
            is_playing: true,
            progress: 0,
            last_updated: new Date().toISOString()
            // Do NOT update owner_username here so the room creator remains the owner!
          }).eq("id", currentRoomId);

          activeConnections.forEach(conn => {
            if (conn.roomId === currentRoomId && conn.username !== currentUsername && conn.ws.readyState === WebSocket.OPEN) {
              conn.ws.send(JSON.stringify({
                type: 'track_changed',
                payload: { track, playlist: playlist || [], senderId: currentUsername }
              }));
            }
          });
        }

        else if (type === 'play_state') {
          if (!currentRoomId || !currentUsername) return;
          const { isPlaying, progress } = payload;

          await supabase.from("rooms").update({
            is_playing: isPlaying,
            progress: progress,
            last_updated: new Date().toISOString()
          }).eq("id", currentRoomId);

          activeConnections.forEach(conn => {
            if (conn.roomId === currentRoomId && conn.username !== currentUsername && conn.ws.readyState === WebSocket.OPEN) {
              conn.ws.send(JSON.stringify({
                type: 'play_state_changed',
                payload: { isPlaying, progress, senderId: currentUsername }
              }));
            }
          });
        }

        else if (type === 'chat_message') {
          if (!currentRoomId || !currentUsername) return;
          const { message: text } = payload;

          const { data: newMsg, error } = await supabase.from("room_chat").insert({
            room_id: currentRoomId,
            username: currentUsername,
            message: text
          }).select("id, username, message, timestamp").single();

          if (error) {
            console.error("Failed to insert message to Supabase:", error.message);
            return;
          }

          const chatObj = {
            id: newMsg.id,
            username: newMsg.username,
            message: newMsg.message,
            timestamp: new Date(newMsg.timestamp).getTime()
          };

          activeConnections.forEach(conn => {
            if (conn.roomId === currentRoomId && conn.ws.readyState === WebSocket.OPEN) {
              conn.ws.send(JSON.stringify({
                type: 'chat_message_received',
                payload: chatObj
              }));
            }
          });
        }

        else if (type === 'request_sync') {
          if (!currentRoomId) return;

          const [roomResult, membersResult, chatResult] = await Promise.all([
            supabase.from("rooms").select("*").eq("id", currentRoomId).maybeSingle(),
            supabase.from("room_members").select("username, avatar_url").eq("room_id", currentRoomId),
            supabase.from("room_chat").select("id, username, message, timestamp").eq("room_id", currentRoomId).order("timestamp", { ascending: true }).limit(50)
          ]);

          const room = roomResult.data;
          const membersList = (membersResult.data || []).map(m => ({
            id: m.username,
            username: m.username,
            avatarUrl: m.avatar_url
          }));
          const chatList = (chatResult.data || []).map(c => ({
            id: c.id,
            username: c.username,
            message: c.message,
            timestamp: new Date(c.timestamp).getTime()
          }));

          ws.send(JSON.stringify({
            type: 'room_sync',
            payload: {
              roomId: currentRoomId,
              currentTrack: room?.current_track || null,
              isPlaying: room?.is_playing || false,
              progress: room?.is_playing && room?.last_updated ? room.progress + (Date.now() - new Date(room.last_updated).getTime()) / 1000 : (room?.progress || 0),
              members: membersList,
              playlist: room?.playlist || [],
              chat: chatList,
              myMemberId: currentUsername
            }
          }));
        }

      } catch (err) {
        console.error("WS message processing error:", err);
      }
    });

    ws.on('close', async () => {
      let foundConn: ConnectionInfo | null = null;
      activeConnections.forEach(conn => {
        if (conn.ws === ws) {
          foundConn = conn;
        }
      });

      if (foundConn) {
        const { roomId, username } = foundConn;
        activeConnections.delete(foundConn);

        // Delete from presence table
        await supabase.from("room_members").delete().eq("room_id", roomId).eq("username", username);

        const leaveMsg = {
          id: `sys-${Date.now()}`,
          username: 'System',
          message: `${username} left the room`,
          timestamp: Date.now()
        };

        await supabase.from("room_chat").insert({
          room_id: roomId,
          username: 'System',
          message: `${username} left the room`
        });

        const { data: remMembers } = await supabase.from("room_members").select("username, avatar_url").eq("room_id", roomId);
        const membersList = (remMembers || []).map(m => ({
          id: m.username,
          username: m.username,
          avatarUrl: m.avatar_url
        }));

        activeConnections.forEach(conn => {
          if (conn.roomId === roomId && conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.send(JSON.stringify({
              type: 'members_updated',
              payload: { members: membersList }
            }));
            conn.ws.send(JSON.stringify({
              type: 'chat_message_received',
              payload: leaveMsg
            }));
          }
        });

        // Delete room if empty
        if (membersList.length === 0) {
          await supabase.from("rooms").delete().eq("id", roomId);
        }
      }
    });
  });
}

startServer().then((app) => {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = http.createServer(app);
  
  setupWebSocketServer(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
});

