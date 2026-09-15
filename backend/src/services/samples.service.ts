import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import config from 'config';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import s3Client from '../aws/aws';
import { logger } from '../logger';

// bundled demo images, seeded into S3 at startup under a samples/ prefix
// so they are distinguishable from user uploads
const SEED_DIR = 'seed-images';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export interface SampleImage {
  name: string;
  key: string;
}

let samples: SampleImage[] = [];

export function getSamples(): SampleImage[] {
  return samples;
}

export function findSample(name: string): SampleImage | undefined {
  return samples.find((sample) => sample.name === name);
}

export async function seedSampleImagesIfMissing(): Promise<void> {
  const bucket = config.get<string>('aws.bucket');
  const files = readdirSync(SEED_DIR)
    .filter((file) => CONTENT_TYPES[path.extname(file).toLowerCase()]);

  samples = files.map((file) => ({
    name: path.parse(file).name,
    key: `samples/${file}`,
  }));

  for (const file of files) {
    const key = `samples/${file}`;

    try {
      await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      continue; // already seeded on a previous startup
    } catch {
      // missing -- upload it below
    }

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(path.join(SEED_DIR, file)),
      ContentType: CONTENT_TYPES[path.extname(file).toLowerCase()],
    }));
    logger.info(`Seeded sample image: ${key}`);
  }
}
