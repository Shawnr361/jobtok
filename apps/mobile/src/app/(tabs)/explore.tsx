import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, HEADER_BODY_HEIGHT } from '../../components/AppHeader';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Chip, Gradient, Icon, IconButton } from '../../components/primitives';
import { SAMPLE_HOME_CITY, exploreFilters, exploreTalents } from '../../features/demo/data';
import { TalentCard } from '../../features/explore/TalentCard';
import { alpha, c, radii, shadow, type } from '../../theme';

/** Discover skills and creators by category, search or place (design: jobtok_explore_talent_search). */
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Opened from the feed search button: put the cursor straight in the search box.
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('All');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exploreTalents.filter((t) => {
      const matchesFilter = filter === 'All' || t.category === filter;
      const haystack = [
        t.name,
        t.role,
        t.location,
        t.bio,
        t.category,
        t.feed.title,
        ...t.skills.map((s) => s.label),
      ]
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
                placeholder="Search skills, creators, ideas..."
                maxLength={80}
                placeholderTextColor={c.outline}
                style={[type.bodyMd, styles.input]}
                accessibilityLabel="Search skills, creators and ideas"
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

        {/* Near you: city level only, never a precise address */}
        <Pressable
          onPress={() => router.navigate({ pathname: '/feed', params: { tab: 'Near You' } })}
          accessibilityRole="button"
          accessibilityLabel={`Talented people near you in ${SAMPLE_HOME_CITY}`}
          style={({ pressed }) => [styles.near, shadow('md'), pressed && { opacity: 0.85 }]}
        >
          <View style={styles.nearIcon}>
            <Icon name="near-me" size={20} color={c.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.labelLg, { color: c.onSurface }]}>Talented people near you</Text>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
              See what people are making around {SAMPLE_HOME_CITY}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={c.onSurfaceVariant} />
        </Pressable>

        {results.map((t) => (
          <TalentCard key={t.id} talent={t} />
        ))}
        {results.length === 0 && (
          <View style={styles.empty}>
            <Icon name="search" size={28} color={c.outline} />
            <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              {query.trim()
                ? `Nothing matches “${query.trim()}” yet. Try another skill or city.`
                : `No ${filter} videos yet. Be the first to show what you can do.`}
            </Text>
          </View>
        )}

        {/* Callout */}
        <Gradient
          colors={[c.surfaceContainerHigh, c.surfaceContainer]}
          style={[styles.callout, shadow('xl')]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.headlineSm, { color: c.onSurface }]}>What can you do?</Text>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
              Show us. Post a short video of your work and let it speak for you.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/create')}
            accessibilityRole="button"
            accessibilityLabel="Create a video"
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
  near: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainerLow,
  },
  nearIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(c.secondaryContainer, 0.2),
  },
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
