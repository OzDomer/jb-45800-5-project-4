import { Router } from "express";
import { createPrediction, getPrediction } from "../controllers/predictions/controller";
import fileUploader from "../middleware/fileUploader";
import validateImageFile from "../middleware/validateImageFile";

const predictionsRouter = Router();

predictionsRouter.post('/', validateImageFile, fileUploader, createPrediction);
predictionsRouter.get('/:jobId', getPrediction);

export default predictionsRouter;
