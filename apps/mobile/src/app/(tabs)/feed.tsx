import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Icon, type IconName } from '../../components/primitives';
import { SAMPLE_HOME_CITY, countValue, feedTalents } from '../../features/demo/data';
import { FeedCard } from '../../features/feed/FeedCard';
import { FEED_TABS, FeedTabs, type FeedTab } from '../../features/feed/FeedTabs';
import { c, type } from '../../theme';

const EMPTY: Record<FeedTab, { icon: IconName; title: string; body: string }> = {
  'For You': {
    icon: 'smart-display',
    title: 'Nothing here yet',
    body: 'New videos will show up soon.',
  },
  Following: {
    icon: 'person-add',
    title: 'Follow people whose work you love',
    body: 'Tap + on someone’s video and their new posts will show up here.',
  },
  Learn: {
    icon: 'lightbulb-outline',
    title: 'Nothing to learn here yet',
    body: 'Videos with tools, steps and tips will show up here.',
  },
  Trending: {
    icon: 'trending-up',
    title: 'Nothing trending yet',
    body: 'The most shared and saved videos will show up here.',
  },
  'Near You': {
    icon: 'near-me',
    title: 'No one near you yet',
    body: 'Try For You to see what people are making in other cities.',
  },
};

/** Vertical, snap-paged video feed with a single top row of tabs + search. */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Other screens can open a tab directly, e.g. Explore → "Near You".
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<FeedTab>('For You');
  // Adjust state when the link parameter changes (React's recommended pattern, no effect).
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  if (params.tab !== seenParam) {
    setSeenParam(params.tab);
    const wanted = FEED_TABS.find((t) => t === params.tab);
    if (wanted) setTab(wanted);
  }
  const [followed, setFollowed] = useState<string[]>([]);
  const [pageHeight, setPageHeight] = useState(0);

  // Sample-data filters. Real ranking will weigh watch time, saves, shares and follows, not
  // follower counts, so a new creator with a great video can still reach people.
  const items = useMemo(() => {
    switch (tab) {
      case 'Following':
        return feedTalents.filter((t) => followed.includes(t.id));
      case 'Learn':
        return feedTalents.filter((t) => t.feed.learn);
      case 'Trending':
        return [...feedTalents].sort(
          (a, b) => countValue(b.feed.shares) - countValue(a.feed.shares),
        );
      case 'Near You':
        return feedTalents.filter((t) => t.city === SAMPLE_HOME_CITY);
      default:
        return feedTalents;
    }
  }, [tab, followed]);

  const toggleFollow = (id: string) =>
    setFollowed((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const empty = EMPTY[tab];

  return (
    <View style={styles.screen}>
      <View
        style={[styles.viewport, { top: insets.top, bottom: DOCK_BODY_HEIGHT + insets.bottom }]}
        onLayout={(e) => setPageHeight(Math.floor(e.nativeEvent.layout.height))}
      >
        {pageHeight > 0 && items.length > 0 && (
          <FlatList
            key={tab}
            data={items}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <FeedCard
                talent={item}
                height={pageHeight}
                context={tab === 'Near You' ? 'near' : tab === 'Learn' ? 'learn' : 'default'}
                following={followed.includes(item.id)}
                onToggleFollow={() => toggleFollow(item.id)}
              />
            )}
            pagingEnabled
            snapToInterval={pageHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
          />
        )}
        {items.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name={empty.icon} size={28} color={c.secondary} />
            </View>
            <Text style={[type.headlineSm, { color: c.onSurface, textAlign: 'center' }]}>
              {empty.title}
            </Text>
            <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              {empty.body}
            </Text>
          </View>
        )}
      </View>
      <FeedTabs
        active={tab}
        onChange={setTab}
        onSearch={() => router.navigate({ pathname: '/explore', params: { focus: 'search' } })}
        top={insets.top + 8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  viewport: { position: 'absolute', left: 0, right: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
