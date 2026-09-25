import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../../components/ScreenHeader';
import { DEMO_NOTICE, findTalent } from '../../features/demo/data';
import { ProfileView } from '../../features/profile/ProfileView';
import { useAuth } from '../../lib/auth/AuthProvider';
import { c, type } from '../../theme';
import { tapHaptic } from '../../components/animations/ToggleMotion';

/**
 * Public creator profile (design: jobtok_candidate_profile_portfolio). Sample data for now.
 * The natural path is discover → follow → learn → and only then message, collaborate or hire.
 */
export default function TalentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const talent = findTalent(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  if (!talent) return <Redirect href="/explore" />;

  function workTogether() {
    // Spec: a verified phone is required before contacting people.
    if (user && !user.verification.phone) {
      router.push('/phone?purpose=verify_phone');
      return;
    }
    Alert.alert(
      'Coming soon',
      `Soon you'll be able to message ${talent!.name.split(' ')[0]}, team up on a project or hire them right here.`,
    );
  }

  async function share() {
    try {
      await Share.share({
        message: `Discover ${talent!.name}'s work on JobTok (${talent!.handle}).`,
      });
    } catch {
      // Sharing isn't available here. Nothing to do.
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: SCREEN_HEADER_HEIGHT + insets.top + 8,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <ProfileView
          avatar={talent.avatar}
          name={talent.name}
          online
          handleLine={`${talent.handle} • ${talent.role}`}
          headline={talent.headline}
          location={talent.location}
          status={talent.status}
          stats={[
            { value: talent.stats.followers, label: 'Followers' },
            { value: talent.stats.following, label: 'Following' },
            { value: talent.stats.views, label: 'Views', color: c.secondary },
            { value: talent.stats.rating, label: `${talent.stats.reviews} Reviews`, icon: 'star' },
          ]}
          action={{
            label: following ? 'Following' : 'Follow',
            icon: 'person-add',
            activeIcon: 'check',
            active: following,
            onPress: () => {
              if (!following) tapHaptic();
              setFollowing(!following);
            },
          }}
          bookmarked={bookmarked}
          onBookmark={() => {
            if (!bookmarked) tapHaptic();
            setBookmarked(!bookmarked);
          }}
          onShare={() => void share()}
          skills={talent.topSkills}
          works={(talent.works.length
            ? talent.works
            : [
                {
                  title: talent.feed.title,
                  duration: '0:58',
                  views: talent.feed.likes,
                  image: talent.cover,
                },
              ]
          ).map((w) => ({ ...w, key: w.title }))}
          workTile={{
            title: 'Work together',
            subtitle: 'Message, team up or hire',
            icon: 'handshake',
            onPress: workTogether,
          }}
          projects={talent.projects.map((p) => ({ ...p, key: p.title }))}
          reviews={talent.reviews}
          footer={<Text style={[type.labelSm, styles.notice]}>{DEMO_NOTICE}</Text>}
        />
      </ScrollView>
      <ScreenHeader title={talent.name} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  notice: { color: c.outline, textAlign: 'center' },
});
