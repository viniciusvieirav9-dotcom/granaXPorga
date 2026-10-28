import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { apiRouter } from './server/api.ts';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Parse JSON bodies
  app.use(express.json());

  // Mount API endpoints
  app.use('/api', apiRouter);

  // In development, attach Vite dev server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static built files from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GranaXP] Servidor online em http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GranaXP] Falha ao iniciar servidor:', err);
  process.exit(1);
});
