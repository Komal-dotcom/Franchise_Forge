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
  let decoded = s3Path.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch (e) {}

  // Must strictly start with submissions/
  if (!decoded.startsWith('submissions/')) return false;

  // Prevent directory traversal attacks
  if (decoded.includes('..') || decoded.includes('\\')) return false;

  // Must follow canonical submissions/{teamId}/{category}/{filename} format
  const s3PathRegex = /^submissions\/[a-zA-Z0-9._-]+\/(round1|round2\/hero|round2\/villain|round2\/supporting|round3)\/[a-zA-Z0-9._-]+$/;
  if (s3PathRegex.test(decoded)) return true;

  // Fallback check for valid canonical submissions/ path with valid key structure
  const parts = decoded.split('/');
  if (parts.length >= 3 && parts[0] === 'submissions' && parts[1].length > 0) {
    const categoryFolder = parts[2];
    if (['round1', 'round2', 'round3', 'supporting'].includes(categoryFolder)) {
      return true;
    }
  }

  return false;
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

/**
 * Safely deletes only submission assets belonging strictly to a specified team.
 * Never deletes assets belonging to other teams or outside submissions/{teamId}/.
 */
export async function deleteTeamS3Assets(
  teamId: string,
  assetPaths?: (string | null | undefined)[]
): Promise<{ success: boolean; deletedCount: number; errors: string[]; isMock: boolean }> {
  if (!teamId || teamId.trim() === '') {
    return { success: false, deletedCount: 0, errors: ['teamId is required for S3 asset deletion.'], isMock: true };
  }

  const sanitizedTeamId = sanitizePathComponent(teamId);
  const teamPrefix = `submissions/${sanitizedTeamId}/`;
  const rawPrefix = `submissions/${teamId}/`;

  const validPathsToDelete: string[] = [];
  const unrecognizedPaths: string[] = [];

  if (assetPaths && assetPaths.length > 0) {
    for (const p of assetPaths) {
      if (!p) continue;
      const cleanPath = p.trim();
      // Check if asset path belongs strictly to this team
      if (cleanPath.startsWith(teamPrefix) || cleanPath.startsWith(rawPrefix)) {
        if (!validPathsToDelete.includes(cleanPath)) {
          validPathsToDelete.push(cleanPath);
        }
      } else {
        unrecognizedPaths.push(cleanPath);
      }
    }
  }

  const errors: string[] = [];
  if (unrecognizedPaths.length > 0) {
    errors.push(
      `Skipped deletion of ${unrecognizedPaths.length} asset(s) that could not be safely verified as belonging to team ${teamId}: ${unrecognizedPaths.join(', ')}`
    );
  }

  const client = getS3Client();

  if (client) {
    try {
      const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

      // List objects in S3 bucket for this team prefix
      const listCmd = new ListObjectsV2Command({
        Bucket: AWS_S3_BUCKET,
        Prefix: teamPrefix,
      });

      const listRes = await client.send(listCmd);
      const objects = listRes.Contents || [];

      for (const obj of objects) {
        if (obj.Key && (obj.Key.startsWith(teamPrefix) || obj.Key.startsWith(rawPrefix)) && !validPathsToDelete.includes(obj.Key)) {
          validPathsToDelete.push(obj.Key);
        }
      }

      if (validPathsToDelete.length === 0) {
        return { success: true, deletedCount: 0, errors, isMock: false };
      }

      const deleteCmd = new DeleteObjectsCommand({
        Bucket: AWS_S3_BUCKET,
        Delete: {
          Objects: validPathsToDelete.map((Key) => ({ Key })),
          Quiet: false,
        },
      });

      const deleteRes = await client.send(deleteCmd);
      const deletedCount = deleteRes.Deleted?.length || 0;
      if (deleteRes.Errors && deleteRes.Errors.length > 0) {
        deleteRes.Errors.forEach((e) => {
          errors.push(`Failed to delete S3 object ${e.Key}: ${e.Message || e.Code}`);
        });
      }

      return {
        success: errors.length === 0,
        deletedCount,
        errors,
        isMock: false,
      };
    } catch (err: any) {
      console.warn('S3 asset deletion failed:', err?.message || err);
      errors.push(`S3 deletion error: ${err?.message || err}`);
      return { success: false, deletedCount: 0, errors, isMock: false };
    }
  }

  // Local fallback mock mode
  return {
    success: true,
    deletedCount: validPathsToDelete.length,
    errors,
    isMock: true,
  };
}

