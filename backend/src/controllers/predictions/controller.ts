import type { NextFunction, Request, Response } from 'express';
import Job from '../../models/Job';
import { enqueueInferenceJob } from '../../queues/enqueueInferenceJob';
import { findSample } from '../../services/samples.service';
import { toJobResponse } from '../../utils/jobResponse';

export async function createPrediction(
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> {
    try {
        const job = await Job.create({ imageKey: request.imageKey });
        await enqueueInferenceJob(job.id);

        // 202: the work is accepted, the result arrives later -- through
        // the job:done socket event or GET /api/predictions/:jobId
        response.status(202).json(toJobResponse(job));
    } catch (error) {
        next(error);
    }
}

export async function createSamplePrediction(
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> {
    try {
        const name = request.body?.name;
        const sample = typeof name === 'string' ? findSample(name) : undefined;
        if (!sample) {
            response.status(404).json({ message: 'No such sample image' });
            return;
        }

        // the job points at the already-seeded S3 key -- no bytes travel
        const job = await Job.create({ imageKey: sample.key });
        await enqueueInferenceJob(job.id);

        response.status(202).json(toJobResponse(job));
    } catch (error) {
        next(error);
    }
}

export async function getPrediction(
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> {
    try {
        const job = await Job.findByPk(request.params.jobId);
        if (!job) {
            response.status(404).json({ message: 'No such prediction job' });
            return;
        }

        response.json(toJobResponse(job));
    } catch (error) {
        next(error);
    }
}
