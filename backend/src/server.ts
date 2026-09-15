import { createServer } from 'http';
import app from './app';
import { createAppBucketIfNotExist } from './aws/aws';
import { appConfig } from './config';
import { ensureAllQueuesExist } from './connectors/sqs.connector';
import sequelize from './db/sequelize';
import { initIo } from './io/io';
import { logError, logger } from './logger';
import { seedSampleImagesIfMissing } from './services/samples.service';
import { createResultsConsumer } from './workers/resultsConsumer';

async function start(): Promise<void> {
  await sequelize.authenticate();
  logger.info('Connected to MySQL');

  await createAppBucketIfNotExist();
  await seedSampleImagesIfMissing();
  await ensureAllQueuesExist();

  const httpServer = createServer(app);
  initIo(httpServer);
  createResultsConsumer().start();

  httpServer.listen(appConfig.port, () => {
    logger.info(`Backend running on port ${appConfig.port}`);
  });
}

start().catch((error) => {
  logError('Failed to start backend', error);
  process.exit(1);
});
