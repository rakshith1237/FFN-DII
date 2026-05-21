import { createAllWorkers, closeAllWorkers } from './workers/index';
import { startHealthServer } from './health';

(async function main(): Promise<void> {
  const workers = await createAllWorkers();
  const server = startHealthServer();

  console.log('[FFN Worker Service] Started — 15 queues active');

  const shutdown = async (): Promise<void> => {
    console.log('[FFN Worker Service] Shutting down gracefully...');
    await closeAllWorkers(workers);
    server.close();
    console.log('[FFN Worker Service] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('uncaughtException', (err: Error) => {
    console.error(err);
    process.exit(1);
  });
})();
