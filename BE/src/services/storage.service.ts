import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

// Configure S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto', // R2 requires 'auto' or a specific region
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a file to Cloudflare R2 and returns its public URL
 * @param file The file object from Multer (memoryStorage)
 * @param folder The folder prefix in the bucket (e.g., 'pages', 'tasks')
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(file: Express.Multer.File, folder: string): Promise<string> {
  if (!env.R2_BUCKET_NAME || !env.R2_ENDPOINT || !env.R2_PUBLIC_URL) {
    throw new Error('Cloudflare R2 is not fully configured in environment variables.');
  }

  // Generate unique filename
  const extension = file.originalname.split('.').pop() || 'png';
  const filename = `${folder}/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: filename,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  // Return the public URL
  // Remove trailing slash from public URL if present
  const baseUrl = env.R2_PUBLIC_URL.replace(/\/$/, '');
  return `${baseUrl}/${filename}`;
}
