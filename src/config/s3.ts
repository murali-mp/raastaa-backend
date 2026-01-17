import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';
import { v4 as uuidv4 } from 'uuid';

export const s3Client = new S3Client({
  endpoint: `https://${env.DO_SPACES_ENDPOINT}`,
  region: 'us-east-1', // DO Spaces uses this regardless of actual region
  credentials: {
    accessKeyId: env.DO_SPACES_KEY,
    secretAccessKey: env.DO_SPACES_SECRET,
  },
  forcePathStyle: false,
});

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  cdnUrl: string;
}

export async function getUploadUrl(
  folder: string,
  contentType: string,
  fileExtension: string
): Promise<UploadUrlResult> {
  const fileKey = `${folder}/${uuidv4()}.${fileExtension}`;
  
  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: fileKey,
    ContentType: contentType,
    ACL: 'public-read',
  });
  
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  
  return {
    uploadUrl,
    fileKey,
    cdnUrl: getCDNUrl(fileKey),
  };
}

export function getCDNUrl(key: string): string {
  if (env.DO_SPACES_CDN_ENDPOINT) {
    return `https://${env.DO_SPACES_CDN_ENDPOINT}/${key}`;
  }
  return `https://${env.DO_SPACES_BUCKET}.${env.DO_SPACES_ENDPOINT}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: key,
  });
  
  await s3Client.send(command);
}

export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}

// Validate file type
export function isValidImageType(contentType: string): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(contentType);
}

export function isValidVideoType(contentType: string): boolean {
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  return validTypes.includes(contentType);
}

export function getFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  };
  return extensions[contentType] || 'bin';
}

// Upload buffer directly to S3
export async function uploadToSpaces(key: string, body: Buffer, contentType: string, isPublic = true): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: env.DO_SPACES_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: isPublic ? 'public-read' : 'private',
  });
  
  await s3Client.send(command);
}

// Alias for deleteFile
export async function deleteFromSpaces(key: string): Promise<void> {
  return deleteFile(key);
}

// Get public URL for a file
export function getPublicUrl(key: string): string {
  return getCDNUrl(key);
}
