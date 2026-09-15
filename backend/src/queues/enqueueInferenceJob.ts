import { sendQueueMessage } from '../connectors/sqs.connector';
import { appConfig } from '../config';
import { logger } from '../logger';

export async function enqueueInferenceJob(jobId: string): Promise<void> {
  const queueName = appConfig.sqs.queues.jobs;
  const messageId = await sendQueueMessage(queueName, JSON.stringify({ jobId }));

  logger.info(
    `[queue] Added message to ${queueName} ` +
      `(messageId=${messageId ?? 'unknown'}) for job ${jobId}`
  );
}
