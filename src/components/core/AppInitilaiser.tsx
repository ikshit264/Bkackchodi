'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { GetUserByUserId } from '../actions/user';

/**
 * Waits for Clerk's user to load and force-fetches user score from backend.
 */
export default function AppInitializer() {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    let isCancelled = false;

    const fetchUserAndInit = async (attempt = 1) => {
      if (isCancelled) return;

      // Clerk user may not be ready yet
      if (!isLoaded || !user) {
        if (attempt <= 5) {
          console.log(`[INIT] User not loaded yet, retrying in 500ms... (attempt ${attempt})`);
          setTimeout(() => fetchUserAndInit(attempt + 1), 500);
        } else {
          console.warn('[INIT] User not found after retries — skipping initialization.');
        }
        return;
      }

      try {
        // 1. Fetch DB user
        const dbUser = await GetUserByUserId(user.id);
        console.log('[INIT] DB User:', dbUser);

        if (!dbUser || !dbUser.userName) {
          console.error('[INIT] No username found for this user in the database.');
          return;
        }

        // 2. Force fetch score
        console.log(`[INIT] Force-fetching score for user: ${dbUser.userName} (path: ${pathname})`);

        const res = await fetch('/api/query/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userName: dbUser.userName, forceFetch: true }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || 'Failed to fetch score');
        }

        console.log('[SUCCESS] Force-fetch completed.');
      } catch (err) {
        console.error('[ERROR] App initialization failed:', err);
      }
    };

    fetchUserAndInit();

    return () => {
      isCancelled = true;
    };
  }, [user, isLoaded, pathname]);

  return null;
}
