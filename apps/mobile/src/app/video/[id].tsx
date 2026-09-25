import type { MyVideo, VideoPost } from '@jobtok/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../../components/ScreenHeader';
import { Icon } from '../../components/primitives';
import { Button } from '../../components/ui';
import { RealVideoCard } from '../../features/feed/RealVideoCard';
import { errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { videoApi } from '../../lib/video/videoApi';
import { c, type } from '../../theme';

const isMine = (v: VideoPost | MyVideo): v is MyVideo => 'status' in v;

/** One video: from My Work, a shared link, or right after posting. */
export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [video, setVideo] = useState<VideoPost | MyVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  // Browsers block autoplay with sound until the viewer interacts, so web starts muted.
  const [muted, setMuted] = useState(Platform.OS === 'web');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await videoApi.get(String(id), await getAccessToken());
        if (alive) setVideo(res.video);
      } catch (err) {
        if (alive) setError(errorMessage(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, getAccessToken]);

  function confirmDelete(v: MyVideo) {
    const remove = async () => {
      setBusy(true);
      try {
        await videoApi.remove(await getAccessToken(), v.id);
        router.back();
      } catch (err) {
        Alert.alert('Couldn’t delete it', errorMessage(err));
      } finally {
        setBusy(false);
      }
    };
    Alert.alert('Delete this video?', 'It will be removed from JobTok for good.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove() },
    ]);
  }

  const mine = video && isMine(video) ? video : null;
  const playable = video?.playbackUrl && (!mine || (mine.status === 'ready' && mine.isPublished));

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.body,
          { paddingTop: SCREEN_HEADER_HEIGHT + insets.top, paddingBottom: insets.bottom + 8 },
        ]}
      >
        {error ? (
          <View style={styles.center}>
            <Icon name="videocam-off" size={32} color={c.outline} />
            <Text style={[type.bodyMd, styles.text]}>{error}</Text>
            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : !video ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : playable ? (
          <View
            style={{ flex: 1 }}
            onLayout={(e) => setHeight(Math.floor(e.nativeEvent.layout.height))}
          >
            {height > 0 && (
              <RealVideoCard
                video={video}
                height={height}
                active
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
              />
            )}
          </View>
        ) : (
          <View style={styles.center}>
            <Icon
              name={mine?.status === 'failed' ? 'error-outline' : 'hourglass-empty'}
              size={32}
              color={c.outline}
            />
            <Text style={[type.headlineSm, styles.text]}>
              {mine?.status === 'failed'
                ? 'This video didn’t upload properly'
                : mine?.status === 'ready'
                  ? 'Not posted yet'
                  : 'This video isn’t ready yet'}
            </Text>
            {mine?.processingError && (
              <Text style={[type.bodyMd, styles.text]}>{mine.processingError}</Text>
            )}
          </View>
        )}
        {mine && (
          <View style={styles.owner}>
            {mine.visibility === 'private' && (
              <Text style={[type.bodySm, styles.text]}>Only you can see this video.</Text>
            )}
            <Button
              label="Delete video"
              variant="ghost"
              loading={busy}
              onPress={() => confirmDelete(mine)}
            />
          </View>
        )}
      </View>
      <ScreenHeader title={video?.caption ? 'Video' : 'Video'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  body: { flex: 1, paddingHorizontal: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  text: { color: c.onSurfaceVariant, textAlign: 'center' },
  owner: { paddingTop: 8, gap: 4 },
});
