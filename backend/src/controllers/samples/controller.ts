import type { NextFunction, Request, Response } from 'express';
import { getSamples } from '../../services/samples.service';
import { buildImageUrl } from '../../utils/jobResponse';

export async function getSamplesList(
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> {
    try {
        response.json(getSamples().map((sample) => ({
            name: sample.name,
            imageUrl: buildImageUrl(sample.key),
        })));
    } catch (error) {
        next(error);
    }
}
