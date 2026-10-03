import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'franchise-forge-submissions';

let s3Client: S3Client | null = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

export type S3AssetCategory = 'round1' | 'round2/hero' | 'round2/villain' | 'round2/supporting' | 'round3';

/**
 * Builds standard S3 object path for competition submissions
 */
export function buildS3Path(teamId: string, category: S3AssetCategory, filename: string): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `submissions/${teamId}/${category}/${Date.now()}_${sanitizedFilename}`;
}

/**
 * Generates a presigned URL for direct secure client upload to S3.
 * Falls back to local data URL path if AWS credentials are not configured.
 */
export async function getPresignedUploadUrl(
  s3Path: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; isMock: boolean }> {
  if (s3Client && process.env.AWS_ACCESS_KEY_ID) {
    try {
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: s3Path,
        ContentType: contentType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${s3Path}`;

      return { uploadUrl, publicUrl, isMock: false };
    } catch (err) {
      console.warn('S3 client error, using mock fallback URL:', err);
    }
  }

  // Local fallback mock URL for offline test environment
  return {
    uploadUrl: `/api/mock-upload?path=${encodeURIComponent(s3Path)}`,
    publicUrl: `https://storage.franchiseforge.local/${s3Path}`,
    isMock: true,
  };
}

/**
 * Validates uploaded file mime types and size boundaries (Max 10MB)
 */
export function validateUploadFile(file: { name: string; type: string; size: number }): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const maxSizeBytes = 10 * 1024 * 1024; // 10 MB limit

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Allowed formats: JPEG, PNG, WEBP, GIF, PDF.' };
  }

  if (file.size > maxSizeBytes) {
    return { valid: false, error: 'File size exceeds maximum 10MB limit.' };
  }

  return { valid: true };
}
