import { appConfig } from '../config';
import Job from '../models/Job';

export function toJobResponse(job: Job) {
  return {
    jobId: job.id,
    status: job.status,
    label: job.label,
    confidence: job.confidence,
    probabilities: job.probabilities,
    // the stored error is a full traceback -- the browser gets a friendly
    // message, the details stay in the database
    error: job.status === 'failed' ? 'The image could not be processed' : null,
    // derived at response time from config -- never persisted, so a
    // publicUrl change never invalidates existing rows
    imageUrl: `${appConfig.aws.publicUrl}/${appConfig.aws.bucket}/${job.imageKey}`,
  };
}
