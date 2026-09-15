import { deleteQueueMessage, receiveQueueMessages } from '../connectors/sqs.connector';
import { appConfig } from '../config';
import { getIo } from '../io/io';
import { logError, logger } from '../logger';
import Job from '../models/Job';
import { toJobResponse } from '../utils/jobResponse';

export function createResultsConsumer(): { start: () => void; stop: () => void } {
  let running = false;
  const queueName = appConfig.sqs.queues.results;

  async function pollOnce(): Promise<void> {
    const messages = await receiveQueueMessages(queueName, 1);

    for (const message of messages) {
      if (!message.Body || !message.ReceiptHandle) {
        continue;
      }

      let jobId: string;
      try {
        jobId = JSON.parse(message.Body).jobId;
        if (!jobId) {
          throw new Error('message has no jobId');
        }
      } catch (error) {
        // no jobId means there is nothing to emit and retrying can never
        // help -- drop the poison message
        logError(`[results] Malformed message body: ${message.Body}`, error);
        await deleteQueueMessage(queueName, message.ReceiptHandle);
        continue;
      }

      try {
        // the message is a POINTER -- the single source of truth for the
        // result is the jobs row
        const job = await Job.findByPk(jobId);
        if (!job) {
          logger.info(`[results] No jobs row for ${jobId}, dropping message`);
        } else {
          getIo().to(job.id).emit('job:done', toJobResponse(job));
          logger.info(`[results] Emitted job:done for ${jobId} (status: ${job.status})`);
        }
        await deleteQueueMessage(queueName, message.ReceiptHandle);
      } catch (error) {
        // transient (db unreachable): leave the message -- redelivered
        // after the visibility timeout
        logError(`[results] Failed to handle result for ${jobId}, will retry`, error);
      }
    }
  }

  async function pollLoop(): Promise<void> {
    while (running) {
      try {
        await pollOnce();
      } catch (error) {
        logError('[results] Failed to fetch message from queue', error);
      }

      await new Promise((resolve) => setTimeout(resolve, appConfig.sqs.pollIntervalMs));
    }
  }

  return {
    start(): void {
      if (running) {
        return;
      }
      running = true;
      logger.info(`[results] Consumer started (queue: ${queueName})`);
      void pollLoop();
    },
    stop(): void {
      running = false;
    },
  };
}
