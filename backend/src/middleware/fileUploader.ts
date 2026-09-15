import { Upload } from "@aws-sdk/lib-storage";
import config from 'config';
import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { UploadedFile } from "express-fileupload";
import s3Client from "../aws/aws";

declare global {
    namespace Express {
        interface Request {
            imageKey: string
        }
    }
}

export default async function fileUploader(request: Request, response: Response, next: NextFunction) {
    // validateImageFile already guaranteed a single image file is present
    // and sniffed its real format from the bytes
    const image = request.files!.image as UploadedFile;

    // upload to the cloud under a random key -- extension and content type
    // come from the SNIFFED format, not the client's filename or claim
    const key = `${randomUUID()}${request.imageType.extension}`;
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: config.get<string>('aws.bucket'),
                Key: key,
                Body: image.data,
                ContentType: request.imageType.mimetype
            }
        });
        await upload.done();
    } catch (error) {
        return next(error);
    }

    // the KEY is stored, not awsResponse.Location -- inside compose that
    // hostname is unreachable from the browser; public urls are derived
    // from aws.publicUrl at response time
    request.imageKey = key;

    next();
}
