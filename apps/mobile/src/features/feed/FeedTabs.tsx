// The feed's single top row (TikTok / Reels pattern): scrollable feed tabs + one search button.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Glass, Gradient, IconButton, Scrim } from '../../components/primitives';
import { alpha, c, glow, gradients } from '../../theme';

/** Discovery-first feed tabs. For You surfaces new creators, not only people you follow. */
export const FEED_TABS = ['For You', 'Following', 'Learn', 'Trending', 'Near You'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

export function FeedTabs({
  active,
  onChange,
  onSearch,
  top,
}: {
  active: FeedTab;
  onChange: (tab: FeedTab) => void;
  onSearch: () => void;
  top: number;
}) {
  return (
    <View style={[styles.wrap, { paddingTop: top }]} pointerEvents="box-none">
      <Scrim
        position="top"
        from={c.surfaceContainerLowest}
        height="100%"
        stops={[
          alpha(c.surfaceContainerLowest, 0.85),
          alpha(c.surfaceContainerLowest, 0.35),
          'transparent',
        ]}
      />
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          style={{ flex: 1 }}
          accessibilityRole="tablist"
        >
          {FEED_TABS.map((tab) => {
            const on = tab === active;
            return (
              <Pressable
                key={tab}
                onPress={() => onChange(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                hitSlop={6}
                style={styles.tab}
              >
                <Text
                  style={[
                    styles.label,
                    { color: on ? c.onSurface : alpha(c.onSurfaceVariant, 0.7) },
                  ]}
                >
                  {tab}
                </Text>
                <Gradient
                  colors={gradients.apply}
                  style={[styles.underline, on ? glow('primary') : { opacity: 0 }]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
        <Glass tint={alpha(c.surfaceContainerHigh, 0.6)} style={styles.search}>
          <IconButton
            icon="search"
            label="Search skills and creators"
            size={40}
            iconSize={20}
            onPress={onSearch}
          />
        </Glass>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 12, gap: 8 },
  tabs: { alignItems: 'center', gap: 16, paddingHorizontal: 8 },
  // 16px so all five tabs fit on a typical 360-412px wide phone without clipping.
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 22 },
  tab: { alignItems: 'center', paddingVertical: 4 },
  underline: { width: 20, height: 4, borderRadius: 2, marginTop: 2 },
  search: { width: 40, height: 40, borderRadius: 20 },
});
