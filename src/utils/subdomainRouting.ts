/**
 * Path-based routing utilities for affiliate replicated sites
 * Handles detection and parsing of paths like tryeverlaunch.com/john
 */

const REPLICATED_DOMAIN = 'tryeverlaunch.com';

// Reserved paths that should not be treated as affiliate usernames
const RESERVED_PATHS = [
  'auth', 'affiliate', 'affiliate-signup', 'admin', 'customer', 
  'buy', 'demo-request', 'checkout', 'product', 'biz', 'sales',
  'demo', 'demos', 'api', 'reset-password', 'unauthorized'
];

/**
 * Check if current hostname is the replicated domain (root or www)
 */
export function isRootReplicatedDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === REPLICATED_DOMAIN || hostname === `www.${REPLICATED_DOMAIN}`;
}

/**
 * Extract affiliate username from path
 * e.g., /john -> "john"
 * e.g., /john/buy -> "john"
 * Returns null if first segment is a reserved path
 */
export function getAffiliateUsernameFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return null;
  }
  
  const firstSegment = segments[0].toLowerCase();
  
  // Don't treat reserved paths as usernames
  if (RESERVED_PATHS.includes(firstSegment)) {
    return null;
  }
  
  return firstSegment;
}

/**
 * Get the replicated URL for an affiliate (path-based)
 */
export function getReplicatedUrl(username: string): string {
  return `https://${REPLICATED_DOMAIN}/${username}`;
}

/**
 * Get the replicated domain constant
 */
export function getReplicatedDomain(): string {
  return REPLICATED_DOMAIN;
}
