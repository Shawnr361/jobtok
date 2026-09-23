// One full-height "video" in the feed (design: jobtok_video_feed). Video playback arrives with
// the showcase pipeline; until then the poster image stands in for the video.
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cover, Glass, Gradient, Icon, PulseDot, Scrim, Spin } from '../../components/primitives';
import { alpha, c, glow, gradients, radii, shadow, type } from '../../theme';
import { useAuth } from '../../lib/auth/AuthProvider';
import { images, type Talent } from '../demo/data';

function RailButton({
  icon,
  count,
  label,
  active,
  activeColor,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  count: string;
  label: string;
  active?: boolean;
  activeColor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      style={({ pressed }) => [styles.railItem, { transform: [{ scale: pressed ? 1.12 : 1 }] }]}
    >
      <Glass tint="rgba(35, 42, 58, 0.70)" style={[styles.railOrb, shadow('md')]}>
        <Icon name={icon} size={24} color={active ? (activeColor ?? c.onSurface) : c.onSurface} />
      </Glass>
      <Text style={[type.labelSm, styles.railCount]}>{count}</Text>
    </Pressable>
  );
}

/** Height reserved at the top of each card for the fixed feed tabs overlay. */
export const FEED_TABS_HEIGHT = 56;

export function FeedCard({
  talent,
  height,
  following,
  onToggleFollow,
}: {
  talent: Talent;
  height: number;
  following: boolean;
  onToggleFollow: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applyNote, setApplyNote] = useState(false);
  const f = talent.feed;

  useEffect(() => {
    if (!applyNote) return;
    const t = setTimeout(() => setApplyNote(false), 2400);
    return () => clearTimeout(t);
  }, [applyNote]);

  function quickApply() {
    // Spec: phone verification is mandatory before applying.
    if (user && !user.verification.phone) {
      router.push('/phone?purpose=verify_phone');
      return;
    }
    setApplyNote(true); // applications open in a later step
  }

  return (
    <View style={[styles.page, { height }]}>
      <View style={[styles.card, shadow('xl')]}>
        <Cover source={talent.cover} />
        <Scrim
          position="top"
          from={c.surfaceContainerLowest}
          height={160}
          stops={[
            alpha(c.surfaceContainerLowest, 0.9),
            alpha(c.surfaceContainerLowest, 0.4),
            'transparent',
          ]}
        />
        <Scrim
          position="bottom"
          from={c.surfaceContainerLowest}
          height="62%"
          stops={[c.surfaceContainerLowest, alpha(c.surfaceContainerLowest, 0.8), 'transparent']}
        />

        {/* Room for the fixed feed tabs overlay */}
        <View style={{ height: FEED_TABS_HEIGHT }} />

        {/* Match pill */}
        <View style={styles.matchRow}>
          <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.matchPill}>
            <PulseDot />
            <Text style={[type.labelSm, styles.matchText]}>{f.match}% MATCH FOR YOUR PROJECT</Text>
          </Glass>
        </View>

        {/* Bottom details + right rail */}
        <View style={styles.bottom}>
          <View style={styles.details}>
            <View style={styles.badges}>
              <Glass tint={alpha(c.surfaceContainerHighest, 0.8)} style={styles.badge}>
                <Icon name={f.kindIcon} size={12} color={c.secondary} />
                <Text style={[type.labelSm, { color: c.onSurface }]}>{f.kind}</Text>
              </Glass>
              <Glass tint={alpha(c.surfaceContainerHighest, 0.8)} style={styles.badge}>
                <Icon name="verified" size={12} color={c.primary} />
                <Text style={[type.labelSm, { color: c.primaryFixedDim }]}>Verified Pro</Text>
              </Glass>
              {f.rate && (
                <View style={[styles.badge, { backgroundColor: alpha(c.secondaryContainer, 0.2) }]}>
                  <Text style={[type.labelSm, { color: c.secondary }]}>{f.rate}</Text>
                </View>
              )}
            </View>

            <View style={styles.nameRow}>
              <Text style={[type.headlineSm, { color: c.onSurface }]} numberOfLines={1}>
                {talent.name}
              </Text>
              <Text style={[type.bodySm, styles.handle]} numberOfLines={1}>
                {talent.handle}
              </Text>
            </View>

            <Text style={[type.bodyMd, styles.pitch]} numberOfLines={3}>
              {f.pitch}
            </Text>

            <View style={styles.location}>
              <Icon name="location-on" size={14} color={c.secondary} />
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{talent.location}</Text>
              <Text style={[type.bodySm, { color: c.onSurfaceVariant, opacity: 0.5 }]}>•</Text>
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{f.availability}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={quickApply}
                accessibilityRole="button"
                accessibilityLabel="Quick Apply"
                style={({ pressed }) => [{ flex: 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
              >
                {applyNote ? (
                  <View style={[styles.apply, { backgroundColor: c.secondaryContainer }]}>
                    <Icon name="schedule" size={16} color={c.onSecondaryContainer} />
                    <Text style={[type.labelLg, { color: c.onSecondaryContainer }]}>
                      Applying opens soon
                    </Text>
                  </View>
                ) : (
                  <Gradient colors={gradients.apply} style={[styles.apply, glow('primary')]}>
                    <Icon name="send" size={16} color={c.onPrimary} />
                    <Text style={[type.labelLg, { color: c.onPrimary }]}>Quick Apply</Text>
                  </Gradient>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push(`/talent/${talent.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${talent.name}'s portfolio`}
              >
                <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.portfolio}>
                  <Icon name="grid-view" size={14} color={c.secondary} />
                  <Text style={[type.labelMd, { color: c.onSurface }]}>Portfolio</Text>
                  <Icon name="north-east" size={12} color={c.onSurface} />
                </Glass>
              </Pressable>
            </View>

            <View style={styles.sound}>
              <Spin duration={4000}>
                <Icon name="music-note" size={12} color={c.primary} />
              </Spin>
              <Text style={[type.labelSm, styles.soundText]} numberOfLines={1}>
                {f.sound}
              </Text>
            </View>
          </View>

          <View style={styles.rail}>
            <View style={styles.creator}>
              <Gradient colors={gradients.ring} diagonal style={styles.creatorRing}>
                <Image source={talent.avatar} style={styles.creatorAvatar} />
              </Gradient>
              <Pressable
                onPress={onToggleFollow}
                accessibilityRole="button"
                accessibilityLabel={following ? 'Unfollow' : 'Follow'}
                style={[styles.follow, { backgroundColor: following ? c.secondary : c.primary }]}
              >
                <Icon
                  name={following ? 'check' : 'add'}
                  size={14}
                  color={following ? c.onSecondary : c.onPrimary}
                />
              </Pressable>
            </View>
            <RailButton
              icon={liked ? 'favorite' : 'favorite-border'}
              count={liked ? bump(f.likes) : f.likes}
              label="Like"
              active={liked}
              activeColor={c.error}
              onPress={() => setLiked((v) => !v)}
            />
            <RailButton icon="chat-bubble" count={f.comments} label="Comments" />
            <RailButton
              icon={saved ? 'bookmark' : 'bookmark-border'}
              count={f.saves}
              label="Save"
              active={saved}
              activeColor={c.secondary}
              onPress={() => setSaved((v) => !v)}
            />
            <RailButton icon="share" count={f.shares} label="Share" />
            <Spin>
              <View style={[styles.disc, shadow('xl')]}>
                <Image source={images.soundDisc} style={styles.discImage} />
                <View style={styles.discHole} />
              </View>
            </Spin>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <Gradient colors={gradients.apply} style={styles.progress} />
        </View>
      </View>
    </View>
  );
}

/** 12.4K -> 12.5K style bump for the like toggle. */
function bump(count: string): string {
  const m = count.match(/^([\d.]+)(K?)$/);
  if (!m) return count;
  const n = parseFloat(m[1]!);
  return m[2] ? `${(n + 0.1).toFixed(1)}K` : String(n + 1);
}

const styles = StyleSheet.create({
  page: { paddingBottom: 0 },
  card: {
    flex: 1,
    borderRadius: radii.media,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerLowest,
    justifyContent: 'space-between',
  },
  matchRow: { paddingHorizontal: 16, flexDirection: 'row' },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  matchText: { color: c.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  bottom: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  details: { flex: 1, minWidth: 0, gap: 8, paddingRight: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, paddingTop: 2 },
  handle: { color: c.onSurfaceVariant, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  pitch: {
    color: c.onSurface,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  apply: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  portfolio: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sound: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  soundText: { color: alpha(c.onSurfaceVariant, 0.8), flex: 1 },
  rail: { alignItems: 'center', gap: 16, paddingBottom: 4 },
  creator: { marginBottom: 8 },
  creatorRing: { width: 48, height: 48, borderRadius: 24, padding: 2 },
  creatorAvatar: { width: '100%', height: '100%', borderRadius: 22 },
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
  railCount: { color: c.onSurface, fontFamily: 'PlusJakartaSans_700Bold' },
  disc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 4,
    backgroundColor: c.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discImage: { width: '100%', height: '100%', borderRadius: 16 },
  discHole: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.surface,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: alpha(c.surfaceContainerHighest, 0.4),
  },
  progress: { width: '40%', height: '100%' },
});
