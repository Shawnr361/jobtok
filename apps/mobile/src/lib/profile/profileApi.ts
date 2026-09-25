import { createProfileApi } from '@jobtok/api-client';
import type { MyCreatorProfile } from '@jobtok/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { errorMessage, useAuth } from '../auth/AuthProvider';
import { API_URL } from '../config';

/** Creator profiles and the skill taxonomy. Real data only (never the sample creators). */
export const profileApi = createProfileApi({ baseUrl: API_URL, client: 'mobile' });

/**
 * The signed-in user's own profile, reloaded whenever the screen comes into focus (e.g. after
 * editing). `profile` is null until their first save.
 */
export function useMyProfile() {
  const { getAccessToken, status } = useAuth();
  const [profile, setProfile] = useState<MyCreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const reload = useCallback(async () => {
    if (status !== 'signedIn') return;
    setError(null);
    try {
      const res = await profileApi.getMine(await getAccessToken());
      if (alive.current) setProfile(res.profile);
    } catch (err) {
      if (alive.current) setError(errorMessage(err));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [getAccessToken, status]);

  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      void reload();
      return () => {
        alive.current = false;
      };
    }, [reload]),
  );

  return { profile, setProfile, loading, error, reload };
}
