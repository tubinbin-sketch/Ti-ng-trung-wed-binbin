import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT_DIR } from './server/services/storeAndGradingService';
import {
  apiRateLimiter,
  logProductionAppCheckReadinessWarning,
} from './server/middleware/authAndRateLimitMiddleware';
import { registerClassroomRoutes } from './server/routes/classroomRoutes';
import {
  registerAiRoutes,
  registerHanziStaticAndHealthRoutes,
} from './server/routes/hanziAndAiRoutes';

export * from './server/services/storeAndGradingService';
export * from './server/services/geminiAiService';
export * from './server/middleware/authAndRateLimitMiddleware';

const __filename = fileURLToPath(import.meta.url);

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)'
  );
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(express.json({ limit: '1mb' }));

// 1. Health check & self-hosted Hanzi stroke order static/API routes
registerHanziStaticAndHealthRoutes(app);

// 2. General /api rate-limiting middleware
app.use('/api', apiRateLimiter);

// 3. Classroom, teacher bootstrap, slot claim, and server-side grading routes
registerClassroomRoutes(app);

// 4. Gemini AI vocabulary enrichment, suggestions, and BinBin pedagogical assistant routes
registerAiRoutes(app);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logProductionAppCheckReadinessWarning();
  }
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(ROOT_DIR, 'dist');
    // Hashed build files never change, so browsers may keep them for a year.
    // index.html must always be revalidated so a new deploy is picked up.
    const HASHED_ASSET = /-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?)$/;
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders(res, filePath) {
          if (HASHED_ASSET.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      // A missing build file (e.g. an old chunk after a redeploy) must 404,
      // not fall back to index.html, so the client can detect it and reload.
      if (req.path.startsWith('/assets/') || /\.[a-z0-9]{2,5}$/i.test(req.path)) {
        res.status(404).end();
        return;
      }
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Last-resort error handler: malformed JSON or an unexpected throw returns a
  // short JSON error instead of an HTML stack trace.
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status =
      (err as { type?: string })?.type === 'entity.parse.failed'
        ? 400
        : (err as { type?: string })?.type === 'entity.too.large'
        ? 413
        : 500;
    if (status === 500) console.error('[server] unhandled error on', req.method, req.path, err);
    res.status(status).json({
      error:
        status === 400
          ? 'Dữ liệu gửi lên không hợp lệ.'
          : status === 413
          ? 'Dữ liệu gửi lên quá lớn.'
          : 'Máy chủ gặp lỗi, vui lòng thử lại.',
    });
  });

  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`HANU × 阮文受 server listening on http://0.0.0.0:${port}`);
  });

  // Cloud Run sends SIGTERM before stopping an instance: finish in-flight
  // requests instead of cutting them off.
  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, closing`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled promise rejection', reason);
});

if (
  process.argv[1] &&
  (path.resolve(process.argv[1]) === __filename ||
    path.basename(process.argv[1]) === 'server.ts' ||
    path.basename(process.argv[1]) === 'server.js')
) {
  startServer();
}
