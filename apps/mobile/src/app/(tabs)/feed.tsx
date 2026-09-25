import type { FeedTabKey, VideoPost } from '@jobtok/types';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Icon, type IconName } from '../../components/primitives';
import { Button } from '../../components/ui';
import { SAMPLE_HOME_CITY, countValue, feedTalents, type Talent } from '../../features/demo/data';
import { FeedCard } from '../../features/feed/FeedCard';
import { FEED_TABS, FeedTabs, type FeedTab } from '../../features/feed/FeedTabs';
import { RealVideoCard } from '../../features/feed/RealVideoCard';
import { errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { videoApi } from '../../lib/video/videoApi';
import { c, radii, type } from '../../theme';

const TAB_KEY: Record<FeedTab, FeedTabKey> = {
  'For You': 'for_you',
  Following: 'following',
  Learn: 'learn',
  Trending: 'trending',
  'Near You': 'near',
};

type Notice = {
  icon: IconName;
  title: string;
  body: string;
  action?: { label: string; to: string };
};

type Item =
  | { kind: 'real'; key: string; video: VideoPost }
  | { kind: 'sample'; key: string; talent: Talent }
  | { kind: 'notice'; key: string; notice: Notice };

/** Honest messages for when a tab has no real videos (sample content follows, clearly marked). */
const NO_REAL: Record<FeedTab, Notice> = {
  'For You': {
    icon: 'videocam',
    title: 'Be one of the first to show your work',
    body: 'Real videos from JobTok creators show up here. The ones after this are samples.',
    action: { label: 'Show your work', to: '/create' },
  },
  Following: {
    icon: 'person-add',
    title: 'Follow people whose work you love',
    body: 'Tap + on a creator’s video and their new posts will show up here.',
  },
  Learn: {
    icon: 'lightbulb-outline',
    title: 'Nothing to learn here yet',
    body: 'Videos with tools, materials and tips show up here.',
  },
  Trending: {
    icon: 'trending-up',
    title: 'Nothing trending yet',
    body: 'Videos people like, save and share the most show up here.',
  },
  'Near You': {
    icon: 'near-me',
    title: 'No one near you has posted yet',
    body: 'Be the first in your city to show what you can do.',
    action: { label: 'Show your work', to: '/create' },
  },
};

/** Vertical, snap-paged discovery feed: real videos first, then clearly marked samples. */
export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<FeedTab>('For You');
  const [seenParam, setSeenParam] = useState<string | undefined>(undefined);
  if (params.tab !== seenParam) {
    setSeenParam(params.tab);
    const wanted = FEED_TABS.find((t) => t === params.tab);
    if (wanted) setTab(wanted);
  }

  const [real, setReal] = useState<VideoPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [needsCity, setNeedsCity] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followed, setFollowed] = useState<string[]>([]);
  const [pageHeight, setPageHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Browsers block autoplay with sound until the viewer interacts, so web starts muted.
  const [muted, setMuted] = useState(Platform.OS === 'web');
  const [focused, setFocused] = useState(true);
  const loadingMore = useRef(false);

  const load = useCallback(
    async (which: FeedTab) => {
      setError(null);
      try {
        const page = await videoApi.feed({ tab: TAB_KEY[which], limit: 8 }, await getAccessToken());
        setReal(page.items);
        setCursor(page.nextCursor);
        setNeedsCity(Boolean(page.needsCity));
      } catch (err) {
        setReal([]);
        setError(errorMessage(err));
      } finally {
        setLoaded(true);
      }
    },
    [getAccessToken],
  );

  // Reload when the screen comes back into view (e.g. after posting) or the tab changes.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void load(tab);
      return () => setFocused(false);
    }, [load, tab]),
  );

  async function loadMore() {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const page = await videoApi.feed(
        { tab: TAB_KEY[tab], cursor, limit: 8 },
        await getAccessToken(),
      );
      setReal((cur) => [...cur, ...page.items.filter((v) => !cur.some((x) => x.id === v.id))]);
      setCursor(page.nextCursor);
    } catch {
      // Keep what we have; the next scroll will try again.
    } finally {
      loadingMore.current = false;
    }
  }

  const samples = useMemo(() => {
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

  const items: Item[] = useMemo(() => {
    const list: Item[] = real.map((v) => ({ kind: 'real', key: `v:${v.id}`, video: v }));
    if (loaded && real.length === 0) {
      const notice: Notice = error
        ? { icon: 'wifi-off', title: 'Couldn’t load new videos', body: error }
        : needsCity
          ? {
              icon: 'near-me',
              title: 'Where are you?',
              body: 'Add your city to your profile to see people creating near you. Only your city is shown.',
              action: { label: 'Add my city', to: '/profile-edit?focus=location' },
            }
          : NO_REAL[tab];
      list.push({ kind: 'notice', key: `notice:${tab}`, notice });
    }
    return [
      ...list,
      ...samples.map((t) => ({ kind: 'sample' as const, key: `s:${t.id}`, talent: t })),
    ];
  }, [real, samples, loaded, error, needsCity, tab]);

  // FlatList needs a stable callback for viewability changes.
  const [onViewable] = useState(() => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index != null) setActiveIndex(first.index);
  });

  const toggleFollow = (id: string) =>
    setFollowed((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <View style={styles.screen}>
      <View
        style={[styles.viewport, { top: insets.top, bottom: DOCK_BODY_HEIGHT + insets.bottom }]}
        onLayout={(e) => setPageHeight(Math.floor(e.nativeEvent.layout.height))}
      >
        {pageHeight > 0 && (
          <FlatList
            key={tab}
            data={items}
            keyExtractor={(i) => i.key}
            renderItem={({ item, index }) =>
              item.kind === 'real' ? (
                <RealVideoCard
                  video={item.video}
                  height={pageHeight}
                  active={focused && index === activeIndex}
                  muted={muted}
                  onToggleMute={() => setMuted((m) => !m)}
                />
              ) : item.kind === 'sample' ? (
                <FeedCard
                  talent={item.talent}
                  height={pageHeight}
                  context={tab === 'Near You' ? 'near' : tab === 'Learn' ? 'learn' : 'default'}
                  following={followed.includes(item.talent.id)}
                  onToggleFollow={() => toggleFollow(item.talent.id)}
                />
              ) : (
                <NoticeCard
                  notice={item.notice}
                  height={pageHeight}
                  onAction={(to) => router.push(to as never)}
                />
              )
            }
            pagingEnabled
            snapToInterval={pageHeight}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={1.5}
            windowSize={3}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
          />
        )}
      </View>
      <FeedTabs
        active={tab}
        onChange={(t) => {
          setActiveIndex(0);
          setLoaded(false);
          setTab(t);
        }}
        onSearch={() => router.navigate({ pathname: '/explore', params: { focus: 'search' } })}
        top={insets.top + 8}
      />
    </View>
  );
}

function NoticeCard({
  notice,
  height,
  onAction,
}: {
  notice: Notice;
  height: number;
  onAction: (to: string) => void;
}) {
  return (
    <View style={[styles.notice, { height }]}>
      <View style={styles.noticeIcon}>
        <Icon name={notice.icon} size={28} color={c.secondary} />
      </View>
      <Text style={[type.headlineSm, { color: c.onSurface, textAlign: 'center' }]}>
        {notice.title}
      </Text>
      <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
        {notice.body}
      </Text>
      {notice.action && (
        <View style={{ alignSelf: 'stretch', paddingTop: 8 }}>
          <Button label={notice.action.label} onPress={() => onAction(notice.action!.to)} />
        </View>
      )}
      <Text style={[type.labelSm, styles.swipe]}>Swipe up for sample videos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  viewport: { position: 'absolute', left: 0, right: 0 },
  notice: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
    borderRadius: radii.media,
    backgroundColor: c.surfaceContainerLowest,
  },
  noticeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  swipe: { color: c.outline, position: 'absolute', bottom: 24 },
});
