// Explore result card (design: jobtok_explore_talent_search).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Cover, Glass, Icon, Scrim } from '../../components/primitives';
import { alpha, c, radii, shadow, type } from '../../theme';
import type { Skill, Talent } from '../demo/data';

export function skillStyle(tone: Skill['tone']) {
  switch (tone) {
    case 'primary':
      return { backgroundColor: alpha(c.primaryContainer, 0.2), color: c.primary };
    case 'secondary':
      return { backgroundColor: alpha(c.secondaryContainer, 0.2), color: c.secondary };
    case 'tertiary':
      return { backgroundColor: alpha(c.tertiaryContainer, 0.2), color: c.tertiary };
    default:
      return { backgroundColor: c.surfaceContainerHigh, color: c.onSurface };
  }
}

export function TalentCard({ talent }: { talent: Talent }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const open = () => router.push(`/talent/${talent.id}`);
  const ctaBg = talent.cta.tone === 'secondary' ? c.secondary : c.primary;
  const ctaFg = talent.cta.tone === 'secondary' ? c.onSecondary : c.onPrimary;

  return (
    <View style={[styles.card, shadow('xl')]}>
      <View style={styles.media}>
        <Cover source={talent.cover} />
        <Scrim
          position="bottom"
          from={c.surfaceContainer}
          height="100%"
          stops={[c.surfaceContainer, alpha(c.surfaceContainer, 0.3), 'transparent']}
        />
        <Glass tint={alpha(c.surfaceContainerLowest, 0.8)} style={styles.mediaLabel}>
          <View style={[styles.dot, { backgroundColor: talent.mediaDot }]} />
          <Text style={[type.labelSm, styles.mediaLabelText]}>{talent.mediaLabel}</Text>
        </Glass>
        <Pressable
          onPress={() => setSaved((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove bookmark' : 'Bookmark profile'}
          style={styles.bookmarkHit}
        >
          <Glass tint={alpha(c.surfaceContainerLowest, 0.8)} style={styles.bookmark}>
            <Icon
              name={saved ? 'bookmark' : 'bookmark-border'}
              size={16}
              color={saved ? c.secondary : c.onSurface}
            />
          </Glass>
        </Pressable>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`Play ${talent.name}'s video`}
          style={[styles.play, shadow('md')]}
        >
          <Icon name="play-arrow" size={24} color={c.onSecondary} style={{ marginLeft: 2 }} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.head}>
          <View style={styles.identity}>
            <View>
              <Image source={talent.avatar} style={styles.avatar} />
              <View style={styles.check}>
                <Icon
                  name={talent.verifiedTone === 'primary' ? 'check-circle' : 'verified'}
                  size={16}
                  color={talent.verifiedTone === 'primary' ? c.primary : c.secondary}
                />
              </View>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[type.headlineSm, { color: c.onSurface }]} numberOfLines={1}>
                {talent.name}
              </Text>
              <Text
                style={[
                  type.bodySm,
                  {
                    color: talent.roleTone === 'primary' ? c.primary : c.secondary,
                    fontFamily: 'Inter_500Medium',
                  },
                ]}
              >
                {talent.role}
              </Text>
            </View>
          </View>
          <View style={styles.badge}>
            <Text style={[type.labelSm, { color: talent.badge.color }]}>{talent.badge.label}</Text>
          </View>
        </View>

        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
          {talent.bio}
        </Text>

        <View style={styles.skills}>
          {talent.skills.map((s) => {
            const st = skillStyle(s.tone);
            return (
              <View key={s.label} style={[styles.skill, { backgroundColor: st.backgroundColor }]}>
                <Text style={[type.labelSm, { color: st.color }]}>{s.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.foot}>
          <View style={styles.loc}>
            <Icon name="location-on" size={16} color={c.secondary} />
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{talent.location}</Text>
          </View>
          <Pressable
            onPress={open}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              shadow('md'),
              { backgroundColor: ctaBg, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Text style={[type.labelMd, { color: ctaFg }]}>{talent.cta.label}</Text>
            <Icon name={talent.cta.icon} size={14} color={ctaFg} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: c.surfaceContainer, borderRadius: radii.card, overflow: 'hidden' },
  media: { height: 176, backgroundColor: c.surfaceContainerHighest },
  mediaLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  mediaLabelText: { color: c.onSurface, textTransform: 'uppercase', letterSpacing: 0.8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bookmarkHit: { position: 'absolute', top: 8, right: 8 },
  bookmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  play: {
    position: 'absolute',
    right: 8,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, marginTop: -16, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  check: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    borderRadius: 10,
    backgroundColor: c.surfaceContainerLowest,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceBright,
  },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 4 },
  skill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
});
