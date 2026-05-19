import { Worker, Job } from 'bullmq';
import connection from '../redis';
import { QUEUES, QueueName } from '../queues';

type WorkerResult = { processed: boolean } | { parsed: boolean; inboxId: string };
type WorkerInstance = Worker<unknown, WorkerResult>;

export function createAllWorkers(): WorkerInstance[] {
  const workers: WorkerInstance[] = [];

  for (const [, queueName] of Object.entries(QUEUES) as Array<[string, QueueName]>) {
    let processor: (job: Job<unknown, WorkerResult>) => Promise<WorkerResult>;

    if (queueName === QUEUES.SCORE_COMPUTE) {
      processor = async (job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        if (job.name === 'parse_vms') {
          const { inboxId, tenantId } = job.data as { inboxId: string; tenantId: string };
          const { parseVmsEmail } = await import('../../../../src/lib/ai/vms-parser');
          await parseVmsEmail(inboxId, tenantId);
          return { parsed: true, inboxId };
        }
        console.log(`[FFN Worker] Processing ${queueName}: ${job.id}`);
        return { processed: true };
      };
    } else {
      processor = async (job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        console.log(`[FFN Worker] Processing ${queueName}: ${job.id}`);
        return { processed: true };
      };
    }

    const worker = new Worker<unknown, WorkerResult>(
      queueName,
      processor,
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
