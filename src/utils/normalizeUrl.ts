/**
 * Normalizes a URL by adding https:// prefix if missing
 * Handles various input formats like:
 * - "example.com" -> "https://example.com"
 * - "www.example.com" -> "https://www.example.com"
 * - "http://example.com" -> "http://example.com" (preserved)
 * - "https://example.com" -> "https://example.com" (preserved)
 */
export function normalizeUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  
  if (!trimmed) {
    return '';
  }

  // If already has a protocol, return as-is
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Add https:// prefix
  return `https://${trimmed}`;
}

/**
 * Validates if a string looks like a valid URL (with or without protocol)
 */
export function isValidUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  // Normalize first, then validate
  const normalized = normalizeUrl(trimmed);
  
  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}
