// One full-height "video" in the feed (design: jobtok_video_feed). Video playback arrives with
// the upload pipeline; until then the poster image stands in for the video.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated, Image, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Cover, Glass, Gradient, Icon, Scrim, Spin } from '../../components/primitives';
import { SpinningGem } from '../../components/animations/SpinningGem';
import { useOnce } from '../../components/animations/useLoop';
import { alpha, c, glow, gradients, radii, shadow, type } from '../../theme';
import { images, type Learn, type Talent } from '../demo/data';

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

/** Which feed tab the card is shown in; changes the label at the top of the card. */
export type FeedContext = 'default' | 'learn' | 'near';

export function FeedCard({
  talent,
  height,
  context = 'default',
  following,
  onToggleFollow,
}: {
  talent: Talent;
  height: number;
  context?: FeedContext;
  following: boolean;
  onToggleFollow: () => void;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const f = talent.feed;
  const openProfile = () => router.push(`/talent/${talent.id}`);

  async function share() {
    try {
      await Share.share({
        message: `Watch this on JobTok: “${f.title}” by ${talent.name} (${talent.handle}).`,
      });
    } catch {
      // Sharing isn't available here (e.g. some desktop browsers). Nothing to do.
    }
  }

  const pill =
    context === 'near'
      ? { icon: 'near-me' as const, text: `Near you • ${talent.city}` }
      : context === 'learn' && f.learn
        ? { icon: 'lightbulb-outline' as const, text: 'Learn this' }
        : null;

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

        {/* Context pill: the category, or why this video is in this tab */}
        <View style={styles.topRow}>
          <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.topPill}>
            {pill ? (
              <Icon name={pill.icon} size={14} color={c.secondary} />
            ) : (
              <SpinningGem size={16} />
            )}
            <Text style={[type.labelSm, styles.topText]}>{pill?.text ?? talent.category}</Text>
          </Glass>
        </View>

        {/* Bottom details + right rail */}
        <View style={styles.bottom}>
          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Pressable onPress={openProfile} accessibilityRole="link" style={{ flexShrink: 1 }}>
                <Text style={[type.labelLg, styles.name]} numberOfLines={1}>
                  {talent.name}
                </Text>
              </Pressable>
              <Icon name="verified" size={14} color={c.primary} />
              <Text style={[type.bodySm, styles.handle]} numberOfLines={1}>
                {talent.handle}
              </Text>
            </View>

            {/* What is happening in the video */}
            <Text style={[type.headlineSm, styles.title]} numberOfLines={2}>
              {f.title}
            </Text>
            <Text style={[type.bodyMd, styles.caption]} numberOfLines={2}>
              {f.caption}
            </Text>

            <View style={styles.location}>
              <Icon name={f.icon} size={14} color={c.secondary} />
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{talent.role}</Text>
              <Text style={[type.bodySm, { color: c.onSurfaceVariant, opacity: 0.5 }]}>•</Text>
              <Icon name="location-on" size={14} color={c.secondary} />
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{talent.city}</Text>
            </View>

            <View style={styles.actions}>
              {f.learn ? (
                <Pressable
                  onPress={() => setLearnOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Learn this"
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                >
                  <Gradient colors={gradients.apply} style={[styles.primary, glow('primary')]}>
                    <Icon name="lightbulb-outline" size={16} color={c.onPrimary} />
                    <Text style={[type.labelLg, { color: c.onPrimary }]}>Learn this</Text>
                  </Gradient>
                </Pressable>
              ) : null}
              <Pressable
                onPress={openProfile}
                accessibilityRole="button"
                accessibilityLabel={`See ${talent.name}'s work`}
              >
                <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.secondary}>
                  <Icon name="grid-view" size={14} color={c.secondary} />
                  <Text style={[type.labelMd, { color: c.onSurface }]}>Their work</Text>
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
              <Pressable onPress={openProfile} accessibilityLabel={`${talent.name}'s profile`}>
                <Gradient colors={gradients.ring} diagonal style={styles.creatorRing}>
                  <Image source={talent.avatar} style={styles.creatorAvatar} />
                </Gradient>
              </Pressable>
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
              count={saved ? bump(f.saves) : f.saves}
              label={saved ? 'Saved for later' : 'Save for later'}
              active={saved}
              activeColor={c.secondary}
              onPress={() => setSaved((v) => !v)}
            />
            <RailButton icon="share" count={f.shares} label="Share" onPress={() => void share()} />
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

        {f.learn && learnOpen && (
          <LearnPanel
            learn={f.learn}
            title={f.title}
            saved={saved}
            onSave={() => setSaved((v) => !v)}
            onClose={() => setLearnOpen(false)}
          />
        )}
      </View>
    </View>
  );
}

/** Lightweight "Learn this" sheet that slides up over the video. */
function LearnPanel({
  learn,
  title,
  saved,
  onSave,
  onClose,
}: {
  learn: Learn;
  title: string;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const t = useOnce(280);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  const sections: {
    icon: React.ComponentProps<typeof Icon>['name'];
    label: string;
    items?: string[];
  }[] = [
    { icon: 'handyman', label: 'Tools', items: learn.tools },
    { icon: 'inventory-2', label: 'Materials', items: learn.materials },
    { icon: 'format-list-numbered', label: 'Steps', items: learn.steps },
    { icon: 'tips-and-updates', label: 'Tips', items: learn.tips },
  ];

  return (
    <View style={styles.sheetWrap}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View style={{ opacity: t, transform: [{ translateY }] }}>
        <Glass tint={alpha(c.surfaceContainer, 0.94)} style={styles.sheet}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[type.labelSm, { color: c.secondary, letterSpacing: 1 }]}>
                LEARN THIS
              </Text>
              <Text style={[type.headlineSm, { color: c.onSurface }]} numberOfLines={2}>
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={styles.sheetClose}
            >
              <Icon name="close" size={20} color={c.onSurface} />
            </Pressable>
          </View>

          {sections
            .filter((s) => s.items?.length)
            .map((s) => (
              <View key={s.label} style={{ gap: 6 }}>
                <View style={styles.sheetLabel}>
                  <Icon name={s.icon} size={14} color={c.primary} />
                  <Text style={[type.labelMd, { color: c.onSurface }]}>{s.label}</Text>
                </View>
                {s.label === 'Tools' || s.label === 'Materials' ? (
                  <View style={styles.chips}>
                    {s.items!.map((item) => (
                      <View key={item} style={styles.chip}>
                        <Text style={[type.labelSm, { color: c.onSurface }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  s.items!.map((item, i) => (
                    <Text key={item} style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                      {s.label === 'Steps' ? `${i + 1}. ` : ''}
                      {item}
                    </Text>
                  ))
                )}
              </View>
            ))}

          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}
          >
            <Icon
              name={saved ? 'bookmark' : 'bookmark-add'}
              size={18}
              color={saved ? c.secondary : c.onSurface}
            />
            <Text style={[type.labelLg, { color: saved ? c.secondary : c.onSurface }]}>
              {saved ? 'Saved for later' : 'Save for later'}
            </Text>
          </Pressable>
        </Glass>
      </Animated.View>
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
  topRow: { paddingHorizontal: 16, flexDirection: 'row' },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  topText: { color: c.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  bottom: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  details: { flex: 1, minWidth: 0, gap: 8, paddingRight: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  name: { color: c.onSurface, fontFamily: 'PlusJakartaSans_700Bold' },
  title: {
    color: c.onSurface,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  handle: { color: c.onSurfaceVariant, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  caption: {
    color: c.onSurfaceVariant,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 4 },
  primary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondary: {
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
  sheetWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha(c.surfaceContainerLowest, 0.5),
  },
  sheet: {
    margin: 8,
    padding: 16,
    gap: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceContainerHighest,
  },
  sheetLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainerHighest,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
