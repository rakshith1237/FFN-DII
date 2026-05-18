import express, { Request, Response, Application } from 'express';
import type { Server } from 'http';

export function startHealthServer(): Server {
  const app: Application = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'ffn-worker',
      queues: 15,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  const PORT = process.env['PORT'] ?? '8080';

  const server = app.listen(parseInt(PORT, 10), () => {
    console.log(`[FFN Worker] Health server listening on port ${PORT}`);
  });

  return server;
}
