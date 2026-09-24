// Creator profile: a living portfolio, not a CV (design: jobtok_candidate_profile_portfolio).
import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import {
  Cover,
  Glass,
  Gradient,
  Icon,
  PulseDot,
  Scrim,
  type IconName,
} from '../../components/primitives';
import { alpha, c, glow, gradients, radii, shadow, type } from '../../theme';
import { skillStyle } from '../explore/TalentCard';
import type { Skill, Talent, Work } from '../demo/data';

export interface ProfileViewProps {
  avatar: ImageSourcePropType | null;
  initials?: string;
  name: string;
  /** Verified crest on the avatar. */
  verified?: boolean;
  handleLine: string;
  headline: string;
  location?: string;
  status?: string;
  stats: Talent['stats'] | null;
  action: { label: string; icon: IconName; onPress: () => void };
  onBookmark?: () => void;
  onShare?: () => void;
  bookmarked?: boolean;
  skills: Skill[];
  skillsEmpty?: string;
  works: Work[];
  workTile: { title: string; subtitle: string; icon: IconName; onPress: () => void };
  projects: Talent['projects'];
  reviews: Talent['reviews'];
  /** Extra content under the portfolio tabs (e.g. account settings on "my profile"). */
  footer?: ReactNode;
}

type Tab = 'work' | 'projects' | 'reviews';

export function ProfileView(p: ProfileViewProps) {
  const [tab, setTab] = useState<Tab>('work');

  return (
    <View style={styles.wrap}>
      {/* Identity */}
      <View style={styles.hero}>
        <View style={styles.aura} pointerEvents="none" />
        <View style={styles.avatarBox}>
          <Gradient
            colors={gradients.ringHero}
            diagonal
            style={[styles.avatarRing, glow('primary')]}
          >
            {p.avatar ? (
              <Image source={p.avatar} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.initials]}>
                <Text style={[type.headlineLgMobile, { color: c.onSurface }]}>{p.initials}</Text>
              </View>
            )}
          </Gradient>
          <View style={[styles.onlineDot, glow('secondary')]} />
          {p.verified !== false && (
            <View style={[styles.crest, shadow('md')]}>
              <Icon name="verified" size={18} color={c.secondary} />
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={[type.headlineLgMobile, { color: c.onSurface }]} numberOfLines={1}>
            {p.name}
          </Text>
        </View>
        <Text style={[type.labelMd, { color: c.primary, marginTop: 2 }]}>{p.handleLine}</Text>
        <Text style={[type.bodyMd, styles.headline]}>{p.headline}</Text>

        <View style={styles.pills}>
          {p.location && (
            <View style={[styles.pill, shadow('md')]}>
              <Icon name="location-on" size={14} color={c.secondary} />
              <Text style={[type.bodySm, { color: c.onSurface }]}>{p.location}</Text>
            </View>
          )}
          {p.status && (
            <View style={[styles.pill, shadow('md')]}>
              <PulseDot color={c.secondaryFixed} />
              <Text style={[type.bodySm, { color: c.onSurface }]}>{p.status}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      {p.stats && (
        <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.stats, shadow('md')]}>
          <Stat value={p.stats.followers} label="Followers" />
          <Stat value={p.stats.following} label="Following" />
          <Stat value={p.stats.views} label="Views" color={c.secondary} />
          <View style={styles.stat}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={[type.headlineSm, styles.statValue]}>{p.stats.rating}</Text>
              <Icon name="star" size={14} color={c.primary} />
            </View>
            <Text style={[type.labelSm, styles.statLabel]}>{p.stats.reviews} Reviews</Text>
          </View>
        </Glass>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={p.action.onPress}
          accessibilityRole="button"
          style={({ pressed }) => [{ flex: 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <Gradient colors={gradients.cta} style={[styles.primary, glow('primary')]}>
            <Icon name={p.action.icon} size={20} color={c.onPrimary} />
            <Text
              style={[type.labelLg, { color: c.onPrimary, fontFamily: 'PlusJakartaSans_700Bold' }]}
            >
              {p.action.label}
            </Text>
          </Gradient>
        </Pressable>
        {p.onBookmark && (
          <Pressable
            onPress={p.onBookmark}
            accessibilityRole="button"
            accessibilityLabel="Bookmark"
            style={[styles.round, shadow('md')]}
          >
            <Icon
              name={p.bookmarked ? 'bookmark' : 'bookmark-border'}
              size={20}
              color={p.bookmarked ? c.primary : c.onSurface}
            />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share profile"
          onPress={p.onShare}
          style={[styles.round, shadow('md')]}
        >
          <Icon name="share" size={20} color={c.onSurface} />
        </Pressable>
      </View>

      {/* Verified skills */}
      <View style={{ gap: 8 }}>
        <View style={styles.sectionHead}>
          <Text style={[type.labelMd, styles.sectionTitle]}>Skills</Text>
        </View>
        {p.skills.length > 0 ? (
          <View style={styles.skills}>
            {p.skills.map((s) => {
              const st =
                s.tone === 'primary'
                  ? { backgroundColor: alpha(c.primary, 0.1), color: c.primaryFixedDim }
                  : s.tone === 'secondary'
                    ? { backgroundColor: alpha(c.secondary, 0.1), color: c.secondary }
                    : skillStyle('neutral');
              return (
                <View key={s.label} style={[styles.skill, { backgroundColor: st.backgroundColor }]}>
                  {s.icon && <Icon name={s.icon} size={12} color={st.color} />}
                  <Text style={[type.labelSm, { color: st.color }]}>{s.label}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{p.skillsEmpty}</Text>
        )}
      </View>

      {/* Portfolio tabs */}
      <View style={{ gap: 16, paddingTop: 4 }}>
        <View style={styles.segment}>
          <Segment
            icon="video-camera-front"
            label="My Work"
            active={tab === 'work'}
            onPress={() => setTab('work')}
          />
          <Segment
            icon="folder-special"
            label="Projects"
            active={tab === 'projects'}
            onPress={() => setTab('projects')}
          />
          <Segment
            icon="reviews"
            label="Reviews"
            active={tab === 'reviews'}
            onPress={() => setTab('reviews')}
          />
        </View>

        {tab === 'work' && (
          <View style={styles.grid}>
            {p.works.map((pitch) => (
              <View key={pitch.title} style={[styles.pitch, shadow('md')]}>
                <Cover source={pitch.image} />
                <Scrim
                  position="bottom"
                  from={c.surfaceContainerLowest}
                  height="100%"
                  stops={[alpha(c.surfaceContainerLowest, 0.9), 'transparent', 'transparent']}
                />
                <View style={styles.pitchInner}>
                  <View style={styles.duration}>
                    <Text style={[type.labelSm, { color: c.secondary }]}>{pitch.duration}</Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Icon name="play-arrow" size={12} color={c.primary} />
                      <Text style={[type.labelSm, { color: c.onSurface, fontSize: 11 }]}>
                        {pitch.views}
                      </Text>
                    </View>
                    <Text
                      style={[type.bodySm, { color: c.onSurfaceVariant, fontSize: 11 }]}
                      numberOfLines={1}
                    >
                      {pitch.title}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            <Pressable
              onPress={p.workTile.onPress}
              accessibilityRole="button"
              style={[styles.pitch, styles.pitchCta]}
            >
              <View style={[styles.pitchCtaIcon, shadow('md')]}>
                <Icon name={p.workTile.icon} size={20} color={c.secondary} />
              </View>
              <Text style={[type.labelSm, { color: c.onSurface, textAlign: 'center' }]}>
                {p.workTile.title}
              </Text>
              <Text
                style={[
                  type.bodySm,
                  { color: c.onSurfaceVariant, fontSize: 10, marginTop: 4, textAlign: 'center' },
                ]}
              >
                {p.workTile.subtitle}
              </Text>
            </Pressable>
          </View>
        )}

        {tab === 'projects' &&
          (p.projects.length ? (
            p.projects.map((cs) => (
              <Glass
                key={cs.title}
                tint={alpha(c.surfaceContainer, 0.7)}
                style={[styles.panel, shadow('md')]}
              >
                <View style={styles.panelHead}>
                  <View style={{ flexShrink: 1 }}>
                    <Text
                      style={[
                        type.labelSm,
                        {
                          color: cs.tone === 'primary' ? c.primary : c.secondary,
                          letterSpacing: 0.8,
                          textTransform: 'uppercase',
                        },
                      ]}
                    >
                      {cs.kicker}
                    </Text>
                    <Text
                      style={[
                        type.headlineSm,
                        { color: c.onSurface, fontFamily: 'PlusJakartaSans_700Bold' },
                      ]}
                    >
                      {cs.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.tag,
                      {
                        backgroundColor: alpha(
                          cs.tone === 'primary' ? c.primary : c.secondary,
                          0.15,
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        type.labelSm,
                        { color: cs.tone === 'primary' ? c.primary : c.secondary },
                      ]}
                    >
                      {cs.tag}
                    </Text>
                  </View>
                </View>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{cs.summary}</Text>
                <View style={styles.panelHead}>
                  <Text style={[type.labelSm, { color: c.primary, flexShrink: 1 }]}>{cs.meta}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[type.labelSm, { color: c.secondary }]}>See project</Text>
                    <Icon name="arrow-forward" size={14} color={c.secondary} />
                  </View>
                </View>
              </Glass>
            ))
          ) : (
            <Empty icon="folder-special" text="No projects yet." />
          ))}

        {tab === 'reviews' && (
          <>
            {p.reviews.length ? (
              p.reviews.map((r) => (
                <Glass
                  key={r.name}
                  tint={alpha(c.surfaceContainer, 0.7)}
                  style={[styles.panel, shadow('md')]}
                >
                  <View style={styles.panelHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.reviewer}>
                        <Text style={[type.labelMd, { color: c.onPrimary }]}>{r.initials}</Text>
                      </View>
                      <View>
                        <Text style={[type.labelMd, { color: c.onSurface }]}>{r.name}</Text>
                        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                          {r.company}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Icon key={i} name="star" size={14} color={c.primary} />
                      ))}
                    </View>
                  </View>
                  <Text style={[type.bodySm, { color: c.onSurface, fontStyle: 'italic' }]}>
                    {r.quote}
                  </Text>
                  <Text
                    style={[type.labelSm, { color: c.onSurfaceVariant, alignSelf: 'flex-end' }]}
                  >
                    {r.meta}
                  </Text>
                </Glass>
              ))
            ) : (
              <Empty icon="reviews" text="Reviews show up after people work together." />
            )}
          </>
        )}
      </View>

      {p.footer}
    </View>
  );
}

function Stat({
  value,
  label,
  color = c.onSurface,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[type.headlineSm, styles.statValue, { color }]}>{value}</Text>
      <Text style={[type.labelSm, styles.statLabel]}>{label}</Text>
    </View>
  );
}

function Segment({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.segmentItem, active && [styles.segmentActive, shadow('md')]]}
    >
      <Icon name={icon} size={16} color={active ? c.primary : c.onSurfaceVariant} />
      <Text
        style={[type.labelSm, { color: active ? c.primary : c.onSurfaceVariant }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Empty({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={24} color={c.outline} />
      <Text style={[type.bodySm, { color: c.onSurfaceVariant, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 24, gap: 24 },
  hero: { alignItems: 'center', marginTop: 8 },
  aura: {
    position: 'absolute',
    top: -24,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: alpha(c.primaryContainer, 0.14),
  },
  avatarBox: { marginBottom: 8 },
  avatarRing: { width: 112, height: 112, borderRadius: 56, padding: 4 },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    backgroundColor: c.surfaceContainerHighest,
  },
  initials: { alignItems: 'center', justifyContent: 'center' },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.secondary,
    borderWidth: 4,
    borderColor: c.surface,
  },
  crest: {
    position: 'absolute',
    top: -4,
    right: 4,
    padding: 4,
    borderRadius: 16,
    backgroundColor: c.surfaceContainerHigh,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  headline: {
    color: c.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
    maxWidth: 380,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainerHigh,
  },
  stats: { flexDirection: 'row', padding: 8, borderRadius: radii.card },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  statValue: { color: c.onSurface, fontFamily: 'PlusJakartaSans_700Bold' },
  statLabel: { color: c.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: c.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 16,
    backgroundColor: c.surfaceContainerLowest,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentActive: { backgroundColor: c.surfaceContainerHigh },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pitch: {
    width: '31.5%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerHigh,
  },
  pitchInner: { flex: 1, padding: 8, justifyContent: 'space-between' },
  duration: {
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: alpha(c.surface, 0.7),
  },
  pitchCta: {
    backgroundColor: c.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  pitchCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  panel: { padding: 16, borderRadius: 16, gap: 8 },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: radii.pill },
  reviewer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 20 },
});
