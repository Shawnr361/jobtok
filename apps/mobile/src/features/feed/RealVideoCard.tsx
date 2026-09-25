// A real video in the feed: plays only while it's the active card, loops, and reports genuine
// watch signals. Likes, saves and follows go through the API and show the server's answer.
import type { VideoPost } from '@jobtok/types';
import { useEvent, useEventListener } from 'expo';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { HeartBurst } from '../../components/animations/HeartBurst';
import {
  FollowBadge,
  ICON_SHADOW,
  tapHaptic,
  ToggleIcon,
} from '../../components/animations/ToggleMotion';
import { Glass, Gradient, Icon, Scrim } from '../../components/primitives';
import { errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { profileApi } from '../../lib/profile/profileApi';
import { setPlayerMuted } from '../../lib/video/player';
import { mediaUrl, videoApi } from '../../lib/video/videoApi';
import { brand, alpha, c, glow, gradients, radii, shadow, type } from '../../theme';
import { FEED_TABS_HEIGHT, LearnPanel } from './FeedCard';

function compact(n: number): string {
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
}

function RailButton({
  icon,
  activeIcon,
  count,
  label,
  active,
  activeColor,
  busy,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  /** Set for on/off buttons (like, save): the icon when on. Swaps with motion. */
  activeIcon?: React.ComponentProps<typeof Icon>['name'];
  count?: string;
  label: string;
  active?: boolean;
  activeColor?: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active), busy: Boolean(busy) }}
      style={({ pressed }) => [styles.railItem, { transform: [{ scale: pressed ? 1.12 : 1 }] }]}
    >
      <View style={styles.railOrb}>
        {activeIcon ? (
          <ToggleIcon
            on={Boolean(active)}
            onIcon={activeIcon}
            offIcon={icon}
            size={30}
            color={c.white}
            activeColor={activeColor}
            shadow
          />
        ) : (
          <Icon name={icon} size={30} color={c.white} style={ICON_SHADOW} />
        )}
      </View>
      {count !== undefined && <Text style={[type.labelSm, styles.railCount]}>{count}</Text>}
    </Pressable>
  );
}

export function RealVideoCard({
  video: initial,
  height,
  active,
  muted,
  onToggleMute,
}: {
  video: VideoPost;
  height: number;
  /** Only the active card plays. */
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [video, setVideo] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const sent = useRef({ impression: false, play: false, complete: false });

  const source = useMemo(
    () => (video.playbackUrl ? { uri: mediaUrl(video.playbackUrl)! } : null),
    [video.playbackUrl],
  );
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = muted;
    p.timeUpdateEventInterval = 0.25;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  // Play only the visible card; pause the moment it leaves.
  useEffect(() => {
    if (active && !pausedByUser) player.play();
    else player.pause();
  }, [active, pausedByUser, player]);

  useEffect(() => {
    setPlayerMuted(player, muted);
  }, [muted, player]);

  const signal = (kind: 'impression' | 'play' | 'complete' | 'share', watchMs?: number) =>
    void getAccessToken()
      .then((t) => videoApi.record(t, video.id, kind, watchMs))
      .catch(() => {});

  useEffect(() => {
    if (active && !sent.current.impression) {
      sent.current.impression = true;
      signal('impression');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (isPlaying && !sent.current.play) {
      sent.current.play = true;
      signal('play');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEventListener(player, 'playToEnd', () => {
    if (!sent.current.complete) {
      sent.current.complete = true;
      signal('complete', Math.round((player.duration || 0) * 1000));
    }
  });

  /**
   * Optimistic toggle: the icon flips (and animates, with a haptic when it turns on) the
   * instant you tap; the server's answer then settles the count. If the request fails, the
   * previous state comes back and you're told.
   */
  async function toggle(
    key: 'liked' | 'saved' | 'followingCreator',
    request: (token: string, on: boolean) => Promise<Partial<VideoPost['stats']> & { on: boolean }>,
  ) {
    if (!video.viewer || busy === key) return;
    const before = video;
    const on = !video.viewer[key];
    if (on) tapHaptic();
    setBusy(key);
    setVideo((v) => ({ ...v, viewer: v.viewer && { ...v.viewer, [key]: on } }));
    try {
      const r = await request(await getAccessToken(), on);
      setVideo((v) => ({
        ...v,
        stats: { ...v.stats, ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'on')) },
        viewer: v.viewer && { ...v.viewer, [key]: r.on },
      }));
    } catch (err) {
      setVideo(before);
      Alert.alert('That didn’t work', errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const like = () =>
    toggle('liked', async (t, on) => {
      const r = await videoApi.like(t, video.id, on);
      return { likes: r.likes, on: r.liked };
    });
  const save = () =>
    toggle('saved', async (t, on) => {
      const r = await videoApi.save(t, video.id, on);
      return { saves: r.saves, on: r.saved };
    });
  const follow = () =>
    toggle('followingCreator', async (t, on) => {
      const handle = video.creator!.username;
      const r = on ? await profileApi.follow(t, handle) : await profileApi.unfollow(t, handle);
      return { on: r.following };
    });

  async function share() {
    const link = Linking.createURL(`/video/${video.id}`);
    const who = video.creator ? ` by @${video.creator.username}` : '';
    try {
      const result = await Share.share({
        message: `Watch “${video.caption}”${who} on JobTok: ${link}`,
      });
      // Count it only when the system says something was actually shared.
      if (result.action === Share.sharedAction) signal('share');
    } catch {
      Alert.alert('Sharing isn’t available here', 'Try again from your phone.');
    }
  }

  const togglePause = () => {
    if (!active) return;
    setPausedByUser((p) => !p);
  };

  // One tap pauses; two quick taps like the video (and never unlike it) with a heart burst.
  const lastTap = useRef<{ at: number; timer: ReturnType<typeof setTimeout> | null }>({
    at: 0,
    timer: null,
  });
  const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    const taps = lastTap.current;
    return () => {
      if (taps.timer) clearTimeout(taps.timer);
    };
  }, []);
  const onSurfaceTap = (x: number, y: number) => {
    const now = Date.now();
    const taps = lastTap.current;
    if (now - taps.at < 280) {
      if (taps.timer) clearTimeout(taps.timer);
      taps.timer = null;
      taps.at = 0;
      setBursts((b) => [...b.slice(-3), { id: now, x, y }]);
      if (!video.viewer?.liked && busy !== 'liked') void like();
      return;
    }
    taps.at = now;
    taps.timer = setTimeout(() => {
      taps.timer = null;
      togglePause();
    }, 280);
  };
  const replay = () => {
    setPausedByUser(false);
    player.replay();
  };

  const loading = active && (status === 'loading' || status === 'idle') && !isPlaying;
  const failed = status === 'error' || !source;
  const progress = player.duration > 0 ? Math.min(1, currentTime / player.duration) : 0;
  const creator = video.creator;
  const name = creator?.displayName ?? (creator ? `@${creator.username}` : 'JobTok creator');
  const thumb = mediaUrl(video.thumbnailUrl);
  const hasLearn =
    video.learn.tools.length + video.learn.materials.length + video.learn.tips.length > 0;

  return (
    <View style={[styles.page, { height }]}>
      <View style={[styles.card, shadow('xl')]}>
        {thumb && (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        {source && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        )}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => onSurfaceTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          accessibilityRole="button"
          accessibilityLabel={pausedByUser ? 'Play' : 'Pause'}
          accessibilityHint="Double-tap quickly to like"
        />
        {bursts.map((b) => (
          <HeartBurst
            key={b.id}
            x={b.x}
            y={b.y}
            onDone={() => setBursts((all) => all.filter((x) => x.id !== b.id))}
          />
        ))}
        <Scrim
          position="top"
          from={c.surfaceContainerLowest}
          height={140}
          stops={[alpha(c.surfaceContainerLowest, 0.85), 'transparent']}
        />
        <Scrim
          position="bottom"
          from={c.surfaceContainerLowest}
          height="55%"
          stops={[c.surfaceContainerLowest, alpha(c.surfaceContainerLowest, 0.7), 'transparent']}
        />

        {(loading || failed || (pausedByUser && active)) && (
          <View style={styles.center} pointerEvents={failed ? 'auto' : 'none'}>
            {failed ? (
              <View style={styles.errorBox}>
                <Icon name="error-outline" size={28} color={c.onSurface} />
                <Text style={[type.labelLg, { color: c.onSurface, textAlign: 'center' }]}>
                  This video couldn’t play.
                </Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
                  Check your connection and try again.
                </Text>
                {source && (
                  <Pressable onPress={() => player.replace(source)} accessibilityRole="button">
                    <Text style={[type.labelLg, { color: c.secondary }]}>Try again</Text>
                  </Pressable>
                )}
              </View>
            ) : loading ? (
              <ActivityIndicator size="large" color={c.onSurface} />
            ) : (
              <Glass tint={alpha(c.surfaceContainerHigh, 0.7)} style={styles.bigPlay}>
                <Icon name="play-arrow" size={44} color={c.onSurface} />
              </Glass>
            )}
          </View>
        )}

        <View style={{ height: FEED_TABS_HEIGHT }} pointerEvents="none" />

        <View style={styles.topRow} pointerEvents="box-none">
          {video.category && (
            <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.topPill}>
              <Icon name="auto-awesome" size={14} color={c.secondary} />
              <Text style={[type.labelSm, styles.topText]}>{video.category.name}</Text>
            </Glass>
          )}
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={replay}
            accessibilityRole="button"
            accessibilityLabel="Replay"
            hitSlop={8}
          >
            <Glass tint={alpha(c.surfaceContainerHigh, 0.7)} style={styles.smallBtn}>
              <Icon name="replay" size={18} color={c.onSurface} />
            </Glass>
          </Pressable>
          <Pressable
            onPress={onToggleMute}
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Unmute' : 'Mute'}
            hitSlop={8}
          >
            <Glass tint={alpha(c.surfaceContainerHigh, 0.7)} style={styles.smallBtn}>
              <Icon name={muted ? 'volume-off' : 'volume-up'} size={18} color={c.onSurface} />
            </Glass>
          </Pressable>
        </View>

        <View style={styles.bottom} pointerEvents="box-none">
          <View style={styles.details} pointerEvents="box-none">
            <Pressable
              onPress={() => creator && router.push(`/u/${creator.username}`)}
              accessibilityRole="link"
              style={styles.nameRow}
            >
              <Text style={[type.labelLg, styles.name]} numberOfLines={1}>
                {name}
              </Text>
              {creator && (
                <Text style={[type.bodySm, styles.handle]} numberOfLines={1}>
                  @{creator.username}
                </Text>
              )}
            </Pressable>
            <Text style={[type.headlineSm, styles.caption]} numberOfLines={3}>
              {video.caption}
            </Text>
            {(video.skills.length > 0 || video.location.city) && (
              <View style={styles.meta}>
                {video.skills.slice(0, 3).map((s) => (
                  <View key={s.id} style={styles.skill}>
                    <Text style={[type.labelSm, { color: c.onSurface }]}>{s.name}</Text>
                  </View>
                ))}
                {video.location.city && (
                  <View style={styles.city}>
                    <Icon name="location-on" size={13} color={c.secondary} />
                    <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>
                      {video.location.city}
                    </Text>
                  </View>
                )}
              </View>
            )}
            {hasLearn && (
              <Pressable
                onPress={() => setLearnOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Learn this"
                style={({ pressed }) => [
                  { alignSelf: 'flex-start', transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}
              >
                <Gradient colors={gradients.apply} style={[styles.learnBtn, glow('primary')]}>
                  <Icon name="lightbulb-outline" size={16} color={c.onPrimary} />
                  <Text style={[type.labelLg, { color: c.onPrimary }]}>Learn this</Text>
                </Gradient>
              </Pressable>
            )}
          </View>

          <View style={styles.rail}>
            {creator && (
              <View style={styles.creator}>
                <Pressable
                  onPress={() => router.push(`/u/${creator.username}`)}
                  accessibilityLabel={`${name}'s profile`}
                >
                  <Gradient colors={gradients.ring} diagonal style={styles.creatorRing}>
                    {video.creator?.avatarUrl ? (
                      <Image
                        source={{ uri: mediaUrl(video.creator.avatarUrl)! }}
                        style={styles.initials}
                      />
                    ) : (
                      <View style={styles.initials}>
                        <Text style={[type.labelMd, { color: c.onSurface }]}>
                          {name.replace('@', '').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </Gradient>
                </Pressable>
                {!video.viewer?.isMine && (
                  <Pressable
                    onPress={follow}
                    disabled={busy === 'followingCreator'}
                    accessibilityRole="button"
                    accessibilityLabel={video.viewer?.followingCreator ? 'Unfollow' : 'Follow'}
                    style={styles.follow}
                    hitSlop={8}
                  >
                    <FollowBadge on={Boolean(video.viewer?.followingCreator)} size={20} />
                  </Pressable>
                )}
              </View>
            )}
            <RailButton
              icon="favorite-border"
              activeIcon="favorite"
              count={compact(video.stats.likes)}
              label={video.viewer?.liked ? 'Unlike' : 'Like'}
              active={video.viewer?.liked}
              activeColor={brand.like}
              busy={busy === 'liked'}
              onPress={() => void like()}
            />
            <RailButton
              icon="chat-bubble-outline"
              label="Comments (coming soon)"
              onPress={() =>
                Alert.alert('Comments are coming soon', 'For now, like, save or share the video.')
              }
            />
            <RailButton
              icon="bookmark-border"
              activeIcon="bookmark"
              count={compact(video.stats.saves)}
              label={video.viewer?.saved ? 'Saved for later' : 'Save for later'}
              active={video.viewer?.saved}
              activeColor={c.secondary}
              busy={busy === 'saved'}
              onPress={() => void save()}
            />
            <RailButton icon="share" label="Share" onPress={() => void share()} />
          </View>
        </View>

        <View style={styles.progressTrack} pointerEvents="none">
          <View style={{ width: `${progress * 100}%`, height: '100%' }}>
            <Gradient colors={gradients.apply} style={{ flex: 1 }} />
          </View>
        </View>

        {learnOpen && (
          <LearnPanel
            learn={video.learn}
            title={video.caption}
            saved={Boolean(video.viewer?.saved)}
            onSave={() => void save()}
            onClose={() => setLearnOpen(false)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {},
  card: {
    flex: 1,
    borderRadius: radii.media,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerLowest,
    justifyContent: 'space-between',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: { alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  bigPlay: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  topText: { color: c.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  smallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  details: { flex: 1, minWidth: 0, gap: 8, paddingRight: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  name: { color: c.onSurface, fontFamily: 'PlusJakartaSans_700Bold' },
  handle: { color: c.onSurfaceVariant, flexShrink: 1 },
  caption: {
    color: c.onSurface,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  skill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: alpha(c.surfaceContainerHighest, 0.8),
  },
  city: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  learnBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rail: { alignItems: 'center', gap: 16, paddingBottom: 4 },
  creator: { marginBottom: 8 },
  creatorRing: { width: 48, height: 48, borderRadius: 24, padding: 2 },
  initials: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceContainerHigh,
  },
  follow: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railItem: { alignItems: 'center', gap: 2 },
  railOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railCount: { color: c.white, fontFamily: 'PlusJakartaSans_700Bold', ...ICON_SHADOW },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: alpha(c.surfaceContainerHighest, 0.4),
  },
});
