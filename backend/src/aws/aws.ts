import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import config from 'config';
import { logger } from '../logger';

// config.get returns an immutable object -- deep clone before handing it
// to the sdk
const s3Config = JSON.parse(JSON.stringify(config.get('aws.connection')));
const s3Client = new S3Client(s3Config);

export async function createAppBucketIfNotExist(): Promise<void> {
    try {
        await s3Client.send(new CreateBucketCommand({
            Bucket: config.get<string>('aws.bucket')
        }));
        logger.info(`Created S3 bucket: ${config.get('aws.bucket')}`);
    } catch {
        // bucket already exists
    }
}

export default s3Client;
