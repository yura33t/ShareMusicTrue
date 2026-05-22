import { startServer } from '../server.js';

let appPromise: any = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    appPromise = startServer();
  }
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Handler Error:", err);
    res.status(500).json({ error: "Failed to handle request", message: err.message });
  }
}
