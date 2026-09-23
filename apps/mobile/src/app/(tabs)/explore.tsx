import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, HEADER_BODY_HEIGHT } from '../../components/AppHeader';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Chip, Gradient, Icon, IconButton } from '../../components/primitives';
import { exploreFilters, exploreTalents } from '../../features/demo/data';
import { TalentCard } from '../../features/explore/TalentCard';
import { alpha, c, radii, shadow, type } from '../../theme';

/** Search & discover talent (design: jobtok_explore_talent_search). */
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Opened from the feed search button: put the cursor straight in the search box.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exploreTalents.filter((t) => {
      const matchesFilter = filter === 'All' || t.tags.includes(filter);
      const haystack = [t.name, t.role, t.location, t.bio, ...t.skills.map((s) => s.label)]
        .join(' ')
        .toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
  }, [query, filter]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: HEADER_BODY_HEIGHT + insets.top + 8,
          paddingBottom: DOCK_BODY_HEIGHT + insets.bottom + 16,
          paddingHorizontal: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search + filters */}
        <View style={{ gap: 8 }}>
          <View style={styles.searchRow}>
            <View style={[styles.search, shadow('md')]}>
              <Icon name="search" size={20} color={c.outline} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search jobs, skills, candidates..."
                placeholderTextColor={c.outline}
                style={[type.bodyMd, styles.input]}
                accessibilityLabel="Search jobs, skills, candidates"
                returnKeyType="search"
                autoFocus={focus === 'search'}
              />
              <Icon name="mic" size={20} color={c.outline} />
            </View>
            <IconButton
              icon="tune"
              label="Filter options"
              color={c.primary}
              background={c.surfaceContainer}
              style={shadow('md')}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {exploreFilters.map((f) => (
              <Chip
                key={f}
                label={f}
                active={f === filter}
                onPress={() => setFilter(f)}
                style={{ paddingVertical: 6 }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Live stats */}
        <View style={[styles.stats, shadow('md')]}>
          <Stat
            icon="videocam"
            value="1,420"
            label="Active Video Jobs"
            color={c.secondary}
            tint={c.secondaryContainer}
          />
          <View style={styles.divider} />
          <Stat
            icon="verified"
            value="8,500+"
            label="Verified Pros"
            color={c.primary}
            tint={c.primaryContainer}
          />
        </View>

        {results.map((t) => (
          <TalentCard key={t.id} talent={t} />
        ))}
        {results.length === 0 && (
          <View style={styles.empty}>
            <Icon name="search" size={28} color={c.outline} />
            <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              No one matches “{query}” yet. Try another skill or city.
            </Text>
          </View>
        )}

        {/* Callout */}
        <Gradient
          colors={[c.surfaceContainerHigh, c.surfaceContainer]}
          style={[styles.callout, shadow('xl')]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.headlineSm, { color: c.onSurface }]}>Got Skills to Show?</Text>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
              Post a 60-second video and get noticed directly by top recruiters.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/create')}
            accessibilityRole="button"
            accessibilityLabel="Upload video resume"
            style={[styles.calloutBtn, shadow('md')]}
          >
            <Icon name="video-call" size={24} color={c.onSecondary} />
          </Pressable>
        </Gradient>
      </ScrollView>
      <AppHeader title="Explore" />
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
  tint,
}: {
  icon: 'videocam' | 'verified';
  value: string;
  label: string;
  color: string;
  tint: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: alpha(tint, 0.2) }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View>
        <Text
          style={[
            type.headlineSm,
            { color, fontFamily: 'PlusJakartaSans_700Bold', lineHeight: 22 },
          ]}
        >
          {value}
        </Text>
        <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.surfaceContainer,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: { flex: 1, color: c.onSurface, paddingVertical: 2 },
  filters: { gap: 4, paddingVertical: 4 },
  stats: {
    backgroundColor: c.surfaceContainerLow,
    borderRadius: radii.card,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { width: 1, height: 24, backgroundColor: c.surfaceVariant },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  callout: {
    padding: 16,
    borderRadius: radii.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calloutBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
