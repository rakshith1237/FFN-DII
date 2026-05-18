import { Worker, Job } from 'bullmq';
import connection from '../redis';
import { QUEUES, QueueName } from '../queues';

type WorkerResult = { processed: boolean };
type WorkerInstance = Worker<unknown, WorkerResult>;

export function createAllWorkers(): WorkerInstance[] {
  const workers: WorkerInstance[] = [];

  for (const [, queueName] of Object.entries(QUEUES) as Array<[string, QueueName]>) {
    const worker = new Worker<unknown, WorkerResult>(
      queueName,
      async (job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        console.log(`[FFN Worker] Processing ${queueName}: ${job.id}`);
        return { processed: true };
      },
      { connection, concurrency: 5 },
    );

    worker.on('error', (err: Error) => {
      console.error(`[FFN Worker] Error in ${queueName}: ${err.message}`);
    });

    workers.push(worker);
  }

  console.log(`[FFN Worker] ${workers.length} workers started`);
  return workers;
}

export async function closeAllWorkers(workers: WorkerInstance[]): Promise<void> {
  for (const worker of workers) {
    await worker.close();
  }
  console.log('[FFN Worker] All workers closed');
}
