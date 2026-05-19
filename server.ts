import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

let dynamicClientId: string | null = null;

async function getValidClientId() {
  if (dynamicClientId) return dynamicClientId;
  
  try {
    console.log("Fetching new SoundCloud Client ID...");
    const { data } = await axios.get('https://soundcloud.com/');
    const urls = [...data.matchAll(/<script[^>]+src="([^"]+)"/g)]
      .map(m => m[1])
      .filter(url => url.includes('sndcdn.com/assets/'));
    
    // Search from the end as it's usually in the last few scripts
    for (let i = urls.length - 1; i >= Math.max(0, urls.length - 5); i--) {
      try {
        const { data: scriptData } = await axios.get(urls[i]);
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
  
  // Fallback to env or known working ones
  return process.env.SOUNDCLOUD_CLIENT_ID || 'OelGkhXfXWOqCdtdJyDkt5rBWc2GF4xR';
}

const BASE_URL = 'https://api-v2.soundcloud.com';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const fetchWithRetry = async (url: string, params: any, headers: any, retries = 1): Promise<any> => {
    let clientId = await getValidClientId();
    
    try {
      return await axios.get(url, { params: { ...params, client_id: clientId }, headers });
    } catch (error: any) {
      if ((error.response?.status === 401 || error.response?.status === 403) && retries > 0) {
        console.log(`Client ID failed (${error.response.status}), forcing refresh...`);
        dynamicClientId = null; // Force refresh
        return fetchWithRetry(url, params, headers, retries - 1);
      }
      throw error;
    }
  };

  // SoundCloud Proxy Routes
  app.get("/api/soundcloud/search", async (req, res) => {
    try {
      const { q, limit = 50, offset = 0, type = 'tracks' } = req.query;
      console.log(`Searching SoundCloud for: ${q}, type: ${type}, offset: ${offset}`);
      
      const endpoint = type === 'users' ? `${BASE_URL}/search/users` : `${BASE_URL}/search/tracks`;
      
      const response = await fetchWithRetry(endpoint, { q, limit, offset }, {
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
      console.error("Proxy Search Error:", error.response?.status, error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
