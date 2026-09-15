import type { NextFunction, Request, Response } from 'express';
import { appConfig } from '../config';

export default function validateImageFile(
    request: Request,
    response: Response,
    next: NextFunction
): void {
    if (!request.files || !request.files.image) {
        response.status(400).json({ message: 'An image file is required (form field name: image)' });
        return;
    }

    const image = request.files.image;
    if (Array.isArray(image)) {
        response.status(400).json({ message: 'Upload one image at a time' });
        return;
    }

    // express-fileupload marks files over the configured limit as truncated
    if (image.truncated) {
        response.status(413).json({
            message: `Image is larger than the ${appConfig.upload.maxFileSizeMb}MB limit`
        });
        return;
    }

    if (!image.mimetype.startsWith('image/')) {
        response.status(400).json({ message: 'Only image files are supported' });
        return;
    }

    next();
}
