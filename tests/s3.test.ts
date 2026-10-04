import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildS3Path,
  isValidS3Path,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  validateUploadFile,
  S3AssetCategory,
} from '../src/lib/s3';

describe('S3 Private Storage Engine & Security Audit', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'franchise-forge-submissions';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should generate standard S3 paths and sanitize filenames properly', () => {
    const teamId = 'team-123';
    const category: S3AssetCategory = 'round2/hero';
    const rawFilename = 'my hero picture!@#$%^&*().png';

    const path = buildS3Path(teamId, category, rawFilename);

    expect(path).toMatch(/^submissions\/team-123\/round2\/hero\/\d+_my_hero_picture_+\.png$/);
    expect(isValidS3Path(path)).toBe(true);
  });

  it('should validate all supported S3 submission category paths', () => {
    const categories: S3AssetCategory[] = [
      'round1',
      'round2/hero',
      'round2/villain',
      'round2/supporting',
      'round3',
    ];

    categories.forEach((cat) => {
      const path = buildS3Path('team-abc', cat, 'asset.png');
      expect(isValidS3Path(path)).toBe(true);
    });
  });

  it('should reject invalid or malicious S3 paths', () => {
    expect(isValidS3Path('')).toBe(false);
    expect(isValidS3Path('submissions/team1/invalid_cat/file.png')).toBe(false);
    expect(isValidS3Path('../../../etc/passwd')).toBe(false);
    expect(isValidS3Path('public/bucket/image.png')).toBe(false);
  });

  it('should handle mock mode gracefully when AWS credentials are not configured', async () => {
    const s3Path = 'submissions/team-123/round1/123456_deck.pdf';

    const uploadRes = await getPresignedUploadUrl(s3Path, 'application/pdf');
    expect(uploadRes.isMock).toBe(true);
    expect(uploadRes.s3Path).toBe(s3Path);
    expect(uploadRes.uploadUrl).toContain('/api/mock-upload');

    const downloadRes = await getPresignedDownloadUrl(s3Path);
    expect(downloadRes.isMock).toBe(true);
    expect(downloadRes.s3Path).toBe(s3Path);
    expect(downloadRes.downloadUrl).toContain('/api/assets/download');
  });

  it('should generate real presigned S3 URLs when AWS credentials are provided', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
    process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

    const s3Path = 'submissions/team-999/round2/hero/123456_hero.png';

    const uploadRes = await getPresignedUploadUrl(s3Path, 'image/png');
    expect(uploadRes.isMock).toBe(false);
    expect(uploadRes.s3Path).toBe(s3Path);
    expect(uploadRes.uploadUrl).toContain('franchise-forge-submissions.s3.us-east-1.amazonaws.com');
    expect(uploadRes.uploadUrl).toContain('X-Amz-Algorithm');

    const downloadRes = await getPresignedDownloadUrl(s3Path);
    expect(downloadRes.isMock).toBe(false);
    expect(downloadRes.s3Path).toBe(s3Path);
    expect(downloadRes.downloadUrl).toContain('franchise-forge-submissions.s3.us-east-1.amazonaws.com');
    expect(downloadRes.downloadUrl).toContain('X-Amz-Algorithm');
  });

  it('should validate allowed file types strictly', () => {
    const validJpeg = validateUploadFile({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 1024 });
    expect(validJpeg.valid).toBe(true);

    const validPng = validateUploadFile({ name: 'photo.png', type: 'image/png', size: 2 * 1024 * 1024 });
    expect(validPng.valid).toBe(true);

    const validPdf = validateUploadFile({ name: 'pitch.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 });
    expect(validPdf.valid).toBe(true);

    const invalidExe = validateUploadFile({ name: 'malware.exe', type: 'application/x-msdownload', size: 1024 });
    expect(invalidExe.valid).toBe(false);
    expect(invalidExe.error).toContain('Invalid file type');
  });

  it('should enforce maximum file size boundary (10MB limit)', () => {
    const under10MB = validateUploadFile({ name: 'large.png', type: 'image/png', size: 10 * 1024 * 1024 });
    expect(under10MB.valid).toBe(true);

    const over10MB = validateUploadFile({ name: 'huge.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 });
    expect(over10MB.valid).toBe(false);
    expect(over10MB.error).toContain('exceeds maximum 10MB limit');
  });
});
