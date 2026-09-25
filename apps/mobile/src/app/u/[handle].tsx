import type { PublicCreatorProfile } from '@jobtok/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../../components/ScreenHeader';
import { Icon } from '../../components/primitives';
import { Button } from '../../components/ui';
import { ProfileView } from '../../features/profile/ProfileView';
import {
  AVAILABILITY_LABEL,
  handleOf,
  initialsOf,
  linksOf,
  locationOf,
  nameOf,
  projectsOf,
  skillsOf,
  statsOf,
  videosOf,
} from '../../features/profile/realProfile';
import { errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { profileApi, useMyProfile } from '../../lib/profile/profileApi';
import { mediaUrl } from '../../lib/video/videoApi';
import { c, type } from '../../theme';
import { tapHaptic } from '../../components/animations/ToggleMotion';

/**
 * A real creator's public profile (GET /profiles/:handle): exactly what anyone can see.
 * Sample creators live at /talent/[id] instead.
 */
export default function PublicProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile: mine } = useMyProfile();
  const { getAccessToken } = useAuth();
  const [profile, setProfile] = useState<PublicCreatorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await profileApi.getPublic(String(handle), await getAccessToken());
        if (!alive) return;
        setProfile(r.profile);
        setFollowing(Boolean(r.profile.viewer?.following));
      } catch (err) {
        if (alive) setError(errorMessage(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle, getAccessToken]);

  const isMe = Boolean(profile?.viewer?.isMe || (profile && mine && profile.id === mine.id));

  async function toggleFollow(p: PublicCreatorProfile) {
    if (!following) tapHaptic();
    setBusy(true);
    try {
      const token = await getAccessToken();
      const r = following
        ? await profileApi.unfollow(token, p.username)
        : await profileApi.follow(token, p.username);
      setFollowing(r.following);
      setProfile({ ...p, stats: { ...p.stats, followers: r.followers } });
    } catch (err) {
      Alert.alert('That didn’t work', errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function share(p: PublicCreatorProfile) {
    try {
      await Share.share({ message: `Discover ${nameOf(p)}'s work on JobTok (@${p.username}).` });
    } catch {
      // Sharing isn't available here. Nothing to do.
    }
  }

  const comingSoon = (what: string) =>
    Alert.alert('Coming soon', `${what} is coming soon. Nothing has been sent.`);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: SCREEN_HEADER_HEIGHT + insets.top + 8,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {error ? (
          <View style={styles.empty}>
            <Icon name="person-search" size={32} color={c.outline} />
            <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
              {error}
            </Text>
            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : !profile ? (
          <View style={styles.empty}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <ProfileView
            avatar={profile.avatarUrl ? { uri: mediaUrl(profile.avatarUrl)! } : null}
            initials={initialsOf(nameOf(profile))}
            name={nameOf(profile)}
            verified={false}
            handleLine={handleOf(profile)}
            headline={profile.headline ?? ''}
            location={locationOf(profile)}
            {...(profile.availability ? { status: AVAILABILITY_LABEL[profile.availability] } : {})}
            stats={statsOf(profile)}
            action={
              isMe
                ? {
                    label: 'Edit profile',
                    icon: 'edit',
                    onPress: () => router.push('/profile-edit'),
                  }
                : {
                    label: busy ? '…' : following ? 'Following' : 'Follow',
                    icon: 'person-add',
                    activeIcon: 'check',
                    active: following,
                    onPress: () => void toggleFollow(profile),
                  }
            }
            onShare={() => void share(profile)}
            header={
              isMe ? (
                <Text style={[type.bodySm, styles.note]}>
                  This is how your profile looks to everyone else.
                </Text>
              ) : null
            }
            skills={skillsOf(profile.skills)}
            skillsEmpty="No skills added yet."
            links={linksOf(profile)}
            works={videosOf(profile, (id) => router.push(`/video/${id}`))}
            workTile={
              isMe
                ? {
                    title: 'Post a video',
                    subtitle: 'Show us what you can do',
                    icon: 'videocam',
                    onPress: () => router.push('/create'),
                  }
                : {
                    title: 'Work together',
                    subtitle: 'Message, team up or hire',
                    icon: 'handshake',
                    onPress: () => comingSoon('Messaging'),
                  }
            }
            projects={projectsOf(profile)}
            projectsEmpty="No projects yet."
            reviews={[]}
          />
        )}
      </ScrollView>
      <ScreenHeader title={profile ? nameOf(profile) : 'Profile'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 80, paddingHorizontal: 32 },
  note: { color: c.outline, textAlign: 'center' },
});
