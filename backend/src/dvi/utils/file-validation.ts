/**
 * File validation utilities for DVI module
 */

/**
 * Validates that mimetype is a supported image format
 * Supported: jpg, jpeg, png, webp
 */
export function validateImageMimetype(mimetype: string): boolean {
  if (!mimetype) {
    return false;
  }
  return /^image\/(jpg|jpeg|png|webp)$/.test(mimetype);
}

/**
 * Gets file size in MB
 */
export function getFileSizeInMb(sizeInBytes: number): number {
  return sizeInBytes / (1024 * 1024);
}

/**
 * Validates file size is within limit (default 10MB)
 */
export function validateFileSize(sizeInBytes: number, limitInMb: number = 10): boolean {
  return getFileSizeInMb(sizeInBytes) <= limitInMb;
}
