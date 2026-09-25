import type { MyCreatorProfile, ProfileStep } from '@jobtok/types';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, HEADER_BODY_HEIGHT } from '../../components/AppHeader';
import { DOCK_BODY_HEIGHT } from '../../components/NavDock';
import { Glass, Gradient, Icon } from '../../components/primitives';
import { Button, ErrorText, Notice } from '../../components/ui';
import { ProfileView } from '../../features/profile/ProfileView';
import {
  AVAILABILITY_LABEL,
  STEP_COPY,
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
import { authApi, errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { useMyProfile } from '../../lib/profile/profileApi';
import { mediaUrl } from '../../lib/video/videoApi';
import { alpha, c, gradients, radii, shadow, type } from '../../theme';

/** The signed-in user's own creator profile, from the API. Nothing here is sample data. */
export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, getAccessToken } = useAuth();
  const { profile, loading, error: loadError, reload } = useMyProfile();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideChecklist, setHideChecklist] = useState(false);

  if (!user) return null;

  const methods = [
    user.phone && 'phone',
    user.hasPassword && 'password',
    ...user.linkedProviders,
  ].filter(Boolean);

  const edit = (focus?: ProfileStep) =>
    router.push(focus ? { pathname: '/profile-edit', params: { focus } } : '/profile-edit');
  const goToStep = (step: ProfileStep) => (step === 'create' ? router.push('/create') : edit(step));

  async function resendEmail() {
    setError(null);
    try {
      setInfo((await authApi.requestEmailVerification(await getAccessToken())).message);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function share(p: MyCreatorProfile) {
    try {
      await Share.share({ message: `See what I make on JobTok: @${p.username}` });
    } catch {
      // Sharing isn't available here. Nothing to do.
    }
  }

  const account = (
    <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.account, shadow('md')]}>
      <Text style={[type.labelMd, styles.sectionTitle]}>Account</Text>
      <Row
        icon="phone-iphone"
        label="Phone"
        value={user.phone ?? 'Not added'}
        ok={user.verification.phone}
      />
      {user.email && (
        <Row icon="mail" label="Email" value={user.email} ok={user.verification.email} />
      )}
      <Row icon="lock" label="Sign-in methods" value={methods.join(', ')} />
      <Text style={[type.bodySm, { color: c.outline }]}>
        Your phone and email stay private. They never appear on your profile.
      </Text>

      {!user.verification.phone && (
        <>
          <Notice>Verify your phone number to post, message and connect on JobTok.</Notice>
          <Button label="Verify phone" onPress={() => router.push('/phone?purpose=verify_phone')} />
        </>
      )}
      {user.email && !user.verification.email && (
        <Button label="Resend confirmation email" variant="secondary" onPress={resendEmail} />
      )}
      {info && <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{info}</Text>}
      <ErrorText message={error} />
      <Button
        label="Log out"
        variant="ghost"
        onPress={async () => {
          await logout();
          router.replace('/welcome');
        }}
      />
    </Glass>
  );

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  } else if (loadError && !profile) {
    body = (
      <View style={styles.pad}>
        <ErrorText message={loadError} />
        <Button label="Try again" variant="secondary" onPress={() => void reload()} />
        {account}
      </View>
    );
  } else if (!profile) {
    body = (
      <View style={styles.pad}>
        <Welcome onStart={() => edit('name')} />
        {account}
      </View>
    );
  } else {
    const { completion } = profile;
    body = (
      <ProfileView
        avatar={profile.avatarUrl ? { uri: mediaUrl(profile.avatarUrl)! } : null}
        initials={initialsOf(nameOf(profile))}
        name={nameOf(profile)}
        verified={false}
        handleLine={handleOf(profile)}
        headline={profile.headline ?? 'What do you do? Add it so people know what you make.'}
        location={locationOf(profile)}
        {...(profile.availability ? { status: AVAILABILITY_LABEL[profile.availability] } : {})}
        stats={statsOf(profile)}
        action={{ label: 'Edit profile', icon: 'edit', onPress: () => edit() }}
        onShare={() => void share(profile)}
        header={
          <>
            {completion.next && !hideChecklist && (
              <Checklist
                profile={profile}
                onStep={goToStep}
                onSkip={() => setHideChecklist(true)}
              />
            )}
            <PublicNote
              isPublic={profile.isPublic}
              onPreview={() => router.push(`/u/${profile.username}`)}
            />
          </>
        }
        skills={skillsOf(profile.skills)}
        skillsEmpty="What are you good at? Add your skills so people who do what you do can find you."
        links={linksOf(profile)}
        works={videosOf(profile, (id) => router.push(`/video/${id}`))}
        workTile={{
          title: profile.videos.length ? 'Post another video' : 'Post your first video',
          subtitle: 'Show us what you can do',
          icon: 'videocam',
          onPress: () => router.push('/create'),
        }}
        projects={projectsOf(profile)}
        projectsEmpty="Add a project you’re proud of. A wedding you catered, a gate you built, an app you shipped."
        reviews={[]}
        footer={account}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: HEADER_BODY_HEIGHT + insets.top + 8,
          paddingBottom: DOCK_BODY_HEIGHT + insets.bottom + 16,
        }}
      >
        {body}
      </ScrollView>
      <AppHeader title="Profile" />
    </View>
  );
}

/** First visit: invite, don't interrogate. */
function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <Gradient
      colors={[c.surfaceContainerHigh, c.surfaceContainer]}
      style={[styles.welcome, shadow('xl')]}
    >
      <View style={styles.welcomeIcon}>
        <Icon name="auto-awesome" size={26} color={c.secondary} />
      </View>
      <Text style={[type.headlineMd, { color: c.onSurface, textAlign: 'center' }]}>
        What do you do?
      </Text>
      <Text style={[type.bodyMd, { color: c.onSurfaceVariant, textAlign: 'center' }]}>
        Set up your profile so people can see what you make, learn from you and find you. It takes a
        minute, and you can skip anything.
      </Text>
      <Button label="Set up my profile" onPress={onStart} />
    </Gradient>
  );
}

function Checklist({
  profile,
  onStep,
  onSkip,
}: {
  profile: MyCreatorProfile;
  onStep: (step: ProfileStep) => void;
  onSkip: () => void;
}) {
  const { percent, steps } = profile.completion;
  return (
    <Glass tint={alpha(c.surfaceContainer, 0.8)} style={[styles.checklist, shadow('md')]}>
      <View style={styles.checkHead}>
        <View style={{ flex: 1 }}>
          <Text style={[type.labelLg, { color: c.onSurface }]}>
            Your profile is {percent}% ready
          </Text>
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
            A fuller profile helps people discover you. Skip anything you like.
          </Text>
        </View>
        <Pressable onPress={onSkip} accessibilityRole="button" hitSlop={8}>
          <Text style={[type.labelMd, { color: c.outline }]}>Later</Text>
        </Pressable>
      </View>
      <View style={styles.track}>
        <Gradient colors={gradients.apply} style={{ width: `${percent}%`, height: '100%' }} />
      </View>
      {steps.map((s) => (
        <Pressable
          key={s.key}
          onPress={() => onStep(s.key)}
          disabled={s.done}
          accessibilityRole="button"
          accessibilityState={{ checked: s.done }}
          style={({ pressed }) => [styles.step, pressed && { opacity: 0.7 }]}
        >
          <Icon
            name={s.done ? 'check-circle' : STEP_COPY[s.key].icon}
            size={18}
            color={s.done ? c.secondary : c.onSurfaceVariant}
          />
          <Text
            style={[
              type.bodyMd,
              { flex: 1, color: s.done ? c.outline : c.onSurface },
              s.done && { textDecorationLine: 'line-through' },
            ]}
          >
            {STEP_COPY[s.key].label}
          </Text>
          {!s.done && <Icon name="chevron-right" size={18} color={c.outline} />}
        </Pressable>
      ))}
    </Glass>
  );
}

function PublicNote({ isPublic, onPreview }: { isPublic: boolean; onPreview: () => void }) {
  if (!isPublic) {
    return <Notice>Your profile goes public once your phone number is verified.</Notice>;
  }
  return (
    <Pressable onPress={onPreview} accessibilityRole="button" style={styles.preview}>
      <Icon name="visibility" size={16} color={c.secondary} />
      <Text style={[type.labelMd, { color: c.secondary }]}>See how others see your profile</Text>
    </Pressable>
  );
}

function Row({
  icon,
  label,
  value,
  ok,
}: {
  icon: 'phone-iphone' | 'mail' | 'lock';
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={c.secondary} />
      <View style={{ flex: 1 }}>
        <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{label}</Text>
        <Text style={[type.bodyMd, { color: c.onSurface }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {ok !== undefined && (
        <Icon
          name={ok ? 'check-circle' : 'schedule'}
          size={18}
          color={ok ? c.secondary : c.outline}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  center: { paddingVertical: 80, alignItems: 'center' },
  pad: { paddingHorizontal: 16, gap: 16 },
  account: { padding: 16, borderRadius: radii.card, gap: 12 },
  sectionTitle: { color: c.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcome: { padding: 24, borderRadius: radii.card, gap: 12, alignItems: 'stretch' },
  welcomeIcon: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(c.secondary, 0.12),
  },
  checklist: { padding: 16, borderRadius: radii.card, gap: 10 },
  checkHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerHighest,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
});
