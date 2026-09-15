import cors from 'cors';
import express from 'express';
import fileUpload from 'express-fileupload';
import { appConfig } from './config';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import predictionsRouter from './routers/predictions';

const app = express();

app.use(cors({ origin: appConfig.cors.origin }));
app.use(requestLogger);
app.use(fileUpload({
  limits: { fileSize: appConfig.upload.maxFileSizeMb * 1024 * 1024 },
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.use('/api/predictions', predictionsRouter);

app.use(errorHandler);

export default app;
