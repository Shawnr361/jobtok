import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../../components/ScreenHeader';
import { DEMO_NOTICE, findTalent } from '../../features/demo/data';
import { ProfileView } from '../../features/profile/ProfileView';
import { useAuth } from '../../lib/auth/AuthProvider';
import { c, type } from '../../theme';

/** Public talent profile (design: jobtok_candidate_profile_portfolio). Sample data for now. */
export default function TalentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const talent = findTalent(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);

  if (!talent) return <Redirect href="/explore" />;

  function contact() {
    if (user && !user.verification.phone) {
      router.push('/phone?purpose=verify_phone');
      return;
    }
    Alert.alert('Coming soon', "You'll be able to hire and message people here very soon.");
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
          pro
          handleLine={`${talent.handle} • ${talent.role}`}
          headline={talent.headline}
          location={talent.location}
          status={talent.status}
          stats={talent.stats}
          action={{ label: 'Hire / Contact Directly', icon: 'bolt', onPress: contact }}
          bookmarked={bookmarked}
          onBookmark={() => setBookmarked((v) => !v)}
          skills={talent.verifiedSkills}
          pitches={
            talent.pitches.length
              ? talent.pitches
              : [
                  {
                    title: talent.mediaLabel,
                    duration: '0:58',
                    views: talent.feed.likes,
                    image: talent.cover,
                  },
                ]
          }
          pitchTile={{
            title: 'Request Custom Pitch',
            subtitle: '24hr turnaround',
            icon: 'videocam',
            onPress: contact,
          }}
          caseStudies={talent.caseStudies}
          reviews={talent.reviews}
          certified
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
