'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Executes a force-fetch of the user's score on every client-side app mount (refresh).
 * It attempts to extract the username from the current URL path.
 */
export default function AppInitializer() {
  const pathname = usePathname();
  
  // Helper to extract a potential username from the path
  const extractUserName = (path: string) => {
    // Assuming the username is the first segment (e.g., /username/c or /username)
    // You may need to adjust this regex based on your exact route structure.
    const parts = path.split('/').filter(p => p.length > 0);
    // Returns the first segment, or undefined if the path is just '/'
    return parts[0]; 
  };
  
  const userName = extractUserName(pathname);

  useEffect(() => {
    // 1. Check for a valid userName derived from the URL
    if (userName) {
      console.log(`[INIT] Force-fetching score for user: ${userName} on path: ${pathname}`);
      
      // 2. Perform the API call
      fetch(`/api/query/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, forceFetch: true })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText);
        }
        return res.json();
      })
      .then(() => {
        console.log("[SUCCESS] Force-fetch completed.");
      })
      .catch((err) => {
        console.error("[ERROR] Force-fetch failed:", String(err));
      });
    } else {
       console.log("[INFO] Skipping force-fetch, no username found in path.");
    }
  }, [userName, pathname]); 
  // NOTE: Dependency array includes userName and pathname to run if the username changes 
  // during client-side navigation (though a full refresh is the primary trigger here).

  return null; // This component is only for side-effects, it renders nothing.
}