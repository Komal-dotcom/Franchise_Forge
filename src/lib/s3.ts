import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'franchise-forge-submissions';

/**
 * Returns an S3Client instance if AWS credentials are configured, or null for mock mode.
 */
function getS3Client(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return null;
}

export type S3AssetCategory = 'round1' | 'round2/hero' | 'round2/villain' | 'round2/supporting' | 'round3';

/**
 * Sanitizes a string for safe inclusion in S3 path
 */
function sanitizePathComponent(str: string): string {
  return str.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Builds standard S3 object path for competition submissions
 */
export function buildS3Path(teamId: string, category: S3AssetCategory, filename: string): string {
  const sanitizedTeamId = sanitizePathComponent(teamId);
  const sanitizedFilename = sanitizePathComponent(filename);
  return `submissions/${sanitizedTeamId}/${category}/${Date.now()}_${sanitizedFilename}`;
}

/**
 * Validates that an S3 path adheres strictly to competition submission conventions
 */
export function isValidS3Path(s3Path: string): boolean {
  if (!s3Path || typeof s3Path !== 'string') return false;
  const s3PathRegex = /^submissions\/[a-zA-Z0-9._-]+\/(round1|round2\/hero|round2\/villain|round2\/supporting|round3)\/[a-zA-Z0-9._-]+$/;
  return s3PathRegex.test(s3Path);
}

/**
 * Generates a presigned PUT URL for direct secure client upload to a PRIVATE S3 bucket.
 * Does NOT return a public URL.
 * Falls back to local mock URL if AWS credentials are not configured.
 */
export async function getPresignedUploadUrl(
  s3Path: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<{ uploadUrl: string; s3Path: string; isMock: boolean }> {
  const client = getS3Client();

  if (client) {
    try {
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: s3Path,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      return { uploadUrl, s3Path, isMock: false };
    } catch (err: any) {
      console.warn('S3 client upload URL generation failed, falling back to mock mode:', err?.message || err);
    }
  }

  // Local fallback mock upload URL for offline development environment
  return {
    uploadUrl: `/api/mock-upload?path=${encodeURIComponent(s3Path)}`,
    s3Path,
    isMock: true,
  };
}

/**
 * Generates a temporary presigned GET URL for reading an object from a PRIVATE S3 bucket.
 * Never returns permanent public S3 URLs.
 * Falls back to local asset download route if AWS credentials are not configured.
 */
export async function getPresignedDownloadUrl(
  s3Path: string,
  expiresInSeconds: number = 3600
): Promise<{ downloadUrl: string; s3Path: string; isMock: boolean }> {
  if (!s3Path || s3Path.trim() === '') {
    throw new Error('s3Path is required to generate presigned download URL.');
  }

  const client = getS3Client();

  if (client) {
    try {
      const command = new GetObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: s3Path,
      });

      const downloadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
      return { downloadUrl, s3Path, isMock: false };
    } catch (err: any) {
      console.warn('S3 client download URL generation failed, falling back to mock mode:', err?.message || err);
    }
  }

  // Local fallback mock download URL for offline development environment
  return {
    downloadUrl: `/api/assets/download?path=${encodeURIComponent(s3Path)}&mock=true`,
    s3Path,
    isMock: true,
  };
}

/**
 * Validates uploaded file mime types and size boundaries (Max 10MB limit)
 */
export function validateUploadFile(file: { name: string; type: string; size: number }): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB limit

  if (!file || typeof file.size !== 'number' || typeof file.type !== 'string') {
    return { valid: false, error: 'Invalid file parameter provided.' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed formats: JPEG, PNG, WEBP, GIF, PDF.' };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File size exceeds maximum 10MB limit.' };
  }

  return { valid: true };
}
