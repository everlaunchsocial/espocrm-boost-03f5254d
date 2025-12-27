/**
 * Normalizes a URL by adding https:// prefix if missing
 * Also converts http:// to https://
 * Handles various input formats like:
 * - "example.com" -> "https://example.com"
 * - "www.example.com" -> "https://www.example.com"
 * - "http://example.com" -> "https://example.com" (converted to https)
 * - "https://example.com" -> "https://example.com" (preserved)
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  let normalized = url.trim().toLowerCase();
  
  if (!normalized) {
    return '';
  }

  // Remove any whitespace
  normalized = normalized.replace(/\s+/g, '');

  // If already has https://, return as-is
  if (normalized.startsWith('https://')) {
    return normalized;
  }

  // Convert http:// to https://
  if (normalized.startsWith('http://')) {
    return normalized.replace('http://', 'https://');
  }

  // Add https:// prefix
  return `https://${normalized}`;
}

/**
 * Validates if a string looks like a valid URL (with or without protocol)
 * Very forgiving - accepts common formats users type
 */
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return true; // Empty is valid (optional field)
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return true; // Empty is valid
  }

  // Normalize first, then validate
  const normalized = normalizeUrl(trimmed);
  
  try {
    const urlObj = new URL(normalized);
    // Must have a valid hostname with at least one dot (e.g., example.com)
    const hostname = urlObj.hostname;
    return hostname.includes('.') && hostname.length > 3;
  } catch {
    return false;
  }
}

/**
 * Gets a user-friendly error message for invalid URLs
 */
export function getUrlValidationError(url: string | undefined | null): string | null {
  if (!url || !url.trim()) {
    return null; // Empty is valid
  }
  if (isValidUrl(url)) {
    return null;
  }
  return 'Please enter a valid website (example: yoursite.com)';
}
