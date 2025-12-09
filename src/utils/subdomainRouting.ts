/**
 * Subdomain routing utilities for affiliate replicated sites
 * Handles detection and parsing of subdomains like john.tryeverlaunch.com
 */

const REPLICATED_DOMAIN = 'tryeverlaunch.com';

/**
 * Check if current hostname is a subdomain of the replicated domain
 */
export function isReplicatedSubdomain(): boolean {
  const hostname = window.location.hostname;
  
  // Check if it's a subdomain of tryeverlaunch.com (but not www or the root)
  if (hostname.endsWith(`.${REPLICATED_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${REPLICATED_DOMAIN}`, '');
    // Exclude www and empty subdomains
    return subdomain !== '' && subdomain !== 'www';
  }
  
  return false;
}

/**
 * Extract affiliate username from subdomain
 * e.g., john.tryeverlaunch.com -> "john"
 */
export function getAffiliateUsernameFromSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  if (hostname.endsWith(`.${REPLICATED_DOMAIN}`)) {
    const subdomain = hostname.replace(`.${REPLICATED_DOMAIN}`, '');
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
  }
  
  return null;
}

/**
 * Get the replicated URL for an affiliate
 */
export function getReplicatedUrl(username: string): string {
  return `https://${username}.${REPLICATED_DOMAIN}`;
}

/**
 * Get the replicated domain constant
 */
export function getReplicatedDomain(): string {
  return REPLICATED_DOMAIN;
}
