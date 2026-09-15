import { Router } from "express";
import { getSamplesList } from "../controllers/samples/controller";

const samplesRouter = Router();

samplesRouter.get('/', getSamplesList);

export default samplesRouter;
