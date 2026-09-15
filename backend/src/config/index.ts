import config from 'config';

// config returns env-var overrides as strings -- Number() keeps the
// numeric fields numeric no matter where the value came from.
export const appConfig = {
  port: Number(config.get('app.port')),
  cors: {
    origin: config.get<string>('cors.origin'),
  },
  db: {
    host: config.get<string>('db.host'),
    port: Number(config.get('db.port')),
    username: config.get<string>('db.username'),
    password: config.get<string>('db.password'),
    database: config.get<string>('db.database'),
  },
  aws: {
    bucket: config.get<string>('aws.bucket'),
    publicUrl: config.get<string>('aws.publicUrl'),
  },
  sqs: {
    region: config.get<string>('sqs.region'),
    endpoint: config.get<string>('sqs.endpoint'),
    accessKeyId: config.get<string>('sqs.accessKeyId'),
    secretAccessKey: config.get<string>('sqs.secretAccessKey'),
    queues: {
      jobs: config.get<string>('sqs.queues.jobs'),
      results: config.get<string>('sqs.queues.results'),
    },
    visibilityTimeoutSeconds: Number(config.get('sqs.visibilityTimeoutSeconds')),
    waitTimeSeconds: Number(config.get('sqs.waitTimeSeconds')),
    pollIntervalMs: Number(config.get('sqs.pollIntervalMs')),
    maxReceiveCount: Number(config.get('sqs.maxReceiveCount')),
  },
  upload: {
    maxFileSizeMb: Number(config.get('upload.maxFileSizeMb')),
  },
};
