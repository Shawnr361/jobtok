// Profile photo: pick or take one, crop it square, upload with real progress. The server
// re-encodes it (and strips location data), so what shows here is exactly what others see.
import type { MyCreatorProfile } from '@jobtok/types';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useReducedMotion } from 'react-native-reanimated';
import { PressScale } from '../../../components/animations/PressScale';
import { Icon } from '../../../components/primitives';
import { ErrorText } from '../../../components/ui';
import { errorMessage, useAuth } from '../../../lib/auth/AuthProvider';
import { API_URL } from '../../../lib/config';
import { profileApi } from '../../../lib/profile/profileApi';
import { putFile } from '../../../lib/upload';
import { mediaUrl } from '../../../lib/video/videoApi';
import { c, CSS_EASE_OUT, radii, type } from '../../../theme';

const SIZE = 96;
// Each new photo settles into place (CSS animation; restarts because the view is keyed).
const PHOTO_IN = {
  animationName: {
    from: { opacity: 0, transform: [{ scale: 0.92 }] },
    to: { opacity: 1, transform: [{ scale: 1 }] },
  },
  animationDuration: '260ms',
  animationTimingFunction: CSS_EASE_OUT,
} as const;
const MAX_MB = 10;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoEditor({
  profile,
  initials,
  onChange,
}: {
  profile: MyCreatorProfile | null;
  initials: string;
  onChange: (p: MyCreatorProfile) => void;
}) {
  const { getAccessToken } = useAuth();
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shows the picked photo straight away while it uploads.
  const [preview, setPreview] = useState<string | null>(null);

  const url = preview ?? mediaUrl(profile?.avatarUrl ?? null);

  async function pick(fromCamera: boolean) {
    setError(null);
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError(
          'JobTok needs your camera to take a photo. You can allow it in your phone’s settings.',
        );
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    // Friendly early checks; the server checks the real file either way.
    if (a.mimeType && !ACCEPTED.includes(a.mimeType)) {
      setError('Please choose a JPG, PNG or WebP photo.');
      return;
    }
    if (a.fileSize && a.fileSize > MAX_MB * 1024 * 1024) {
      setError(`That photo is too big. Photos can be up to ${MAX_MB} MB.`);
      return;
    }
    await upload(a.uri);
  }

  async function upload(uri: string) {
    setBusy(true);
    setPreview(uri);
    setProgress(0);
    try {
      const token = await getAccessToken();
      const { profile: next } = await putFile<{ profile: MyCreatorProfile }>(
        `${API_URL.replace(/\/$/, '')}/api/v1/profiles/me/avatar`,
        uri,
        token,
        setProgress,
      ).done;
      onChange(next);
      setPreview(null);
    } catch (err) {
      setPreview(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const { profile: next } = await profileApi.removeAvatar(await getAccessToken());
      onChange(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const hasPhoto = Boolean(profile?.avatarUrl);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          {url ? (
            // Keyed on the URL: each new photo settles into place.
            <Reanimated.View key={url} style={reduced ? null : PHOTO_IN}>
              <Image source={{ uri: url }} style={styles.image} accessibilityLabel="Your photo" />
            </Reanimated.View>
          ) : (
            <Text style={[type.headlineSm, { color: c.onSurfaceVariant }]}>{initials}</Text>
          )}
          {progress !== null && (
            <View style={styles.overlay} accessibilityLiveRegion="polite">
              <ActivityIndicator color={c.white} />
              <Text style={[type.labelSm, { color: c.white }]}>
                {progress < 1 ? `${Math.round(progress * 100)}%` : 'Checking'}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <PressScale
            onPress={() => void pick(false)}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.action, busy && { opacity: 0.5 }]}
          >
            <Icon name="photo-library" size={18} color={c.onSurface} />
            <Text style={[type.labelLg, { color: c.onSurface }]}>
              {hasPhoto ? 'Change photo' : 'Choose a photo'}
            </Text>
          </PressScale>
          {Platform.OS !== 'web' && (
            <PressScale
              onPress={() => void pick(true)}
              disabled={busy}
              accessibilityRole="button"
              style={[styles.action, busy && { opacity: 0.5 }]}
            >
              <Icon name="photo-camera" size={18} color={c.onSurface} />
              <Text style={[type.labelLg, { color: c.onSurface }]}>Take a photo</Text>
            </PressScale>
          )}
          {hasPhoto && !busy && (
            <PressScale
              onPress={() => void remove()}
              accessibilityRole="button"
              style={styles.remove}
            >
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>Remove photo</Text>
            </PressScale>
          )}
        </View>
      </View>
      <Text style={[type.bodySm, { color: c.outline }]}>
        JPG, PNG or WebP, up to {MAX_MB} MB. We crop it square and remove location data.
      </Text>
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceContainerHighest,
  },
  image: { width: SIZE, height: SIZE },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainerHigh,
  },
  remove: { paddingHorizontal: 14, paddingVertical: 4 },
});
