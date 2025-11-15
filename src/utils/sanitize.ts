/**
 * Input sanitization utilities
 */

/**
 * Sanitize string input - remove dangerous characters and trim
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string | null {
  if (!input) return null;
  
  let sanitized = input.trim();
  
  // Remove potentially dangerous characters (XSS prevention)
  sanitized = sanitized.replace(/[<>]/g, '');
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized || null;
}

/**
 * Sanitize URL - validate and sanitize URL input
 */
export function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // Check if it's a valid URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      // Only allow http and https protocols
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
    } catch {
      return null;
    }
  }
  
  // If not a URL, return as-is (might be emoji or other valid input)
  return trimmed || null;
}

/**
 * Sanitize emoji - validate emoji input
 */
export function sanitizeEmoji(input: string | null | undefined): string | null {
  if (!input) return null;
  
  const trimmed = input.trim();
  
  // Check if it's a valid emoji (Unicode emoji pattern)
  if (/^[\p{Emoji}\p{Symbol}]+$/u.test(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Sanitize group name - alphanumeric, spaces, hyphens, underscores
 */
export function sanitizeGroupName(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '');
}




