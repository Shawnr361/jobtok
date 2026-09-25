import {
  AVAILABILITY_OPTIONS,
  COUNTRIES,
  PROFILE_LIMITS as L,
  USERNAME_PATTERN,
  type Availability,
  type MyCreatorProfile,
  type ProfileStep,
  type ProfileUpdate,
  type UsernameCheck,
} from '@jobtok/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../components/ScreenHeader';
import { Chip, Glass, Icon } from '../components/primitives';
import { Button, ErrorText, Field, SuccessText } from '../components/ui';
import { LinksEditor } from '../features/profile/edit/LinksEditor';
import { PhotoEditor } from '../features/profile/edit/PhotoEditor';
import { ProjectsEditor } from '../features/profile/edit/ProjectsEditor';
import { SkillsEditor } from '../features/profile/edit/SkillsEditor';
import { AVAILABILITY_LABEL, initialsOf } from '../features/profile/realProfile';
import { errorMessage, useAuth } from '../lib/auth/AuthProvider';
import { profileApi, useMyProfile } from '../lib/profile/profileApi';
import { alpha, c, radii, shadow, type } from '../theme';

/**
 * Edit your creator profile. Everything is optional and can be filled in over time: the
 * basics save with the button, skills, links and projects save as you change them.
 */
export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { focus } = useLocalSearchParams<{ focus?: ProfileStep }>();
  const { profile, setProfile, loading, error, reload } = useMyProfile();
  const [ready, setReady] = useState(false);
  // Snapshot the first loaded profile for the form, so later reloads never wipe typing.
  const [initial, setInitial] = useState<MyCreatorProfile | null>(null);
  // Skills, links and projects save instantly. The first one also creates the profile, so
  // fetch it then; afterwards just merge the returned list.
  const merge = (patch: Partial<MyCreatorProfile>) => {
    if (profile) setProfile({ ...profile, ...patch });
    else void reload();
  };
  if (!ready && !loading) {
    setReady(true);
    setInitial(profile);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: SCREEN_HEADER_HEIGHT + insets.top + 8,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {!ready ? (
          <View style={{ paddingVertical: 80 }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            <ErrorText message={error} />
            <BasicsForm initial={initial} focus={focus} onSaved={(p) => setProfile(p)} />
            <Section
              icon="auto-awesome"
              title="What are you good at?"
              hint="Your skills help people who do what you do find you."
            >
              <SkillsEditor
                skills={profile?.skills ?? []}
                autoFocus={focus === 'skills'}
                onChange={(skills) => merge({ skills })}
              />
            </Section>
            <Section
              icon="folder-special"
              title="Projects"
              hint="Work you’re proud of. Star one to feature it at the top."
            >
              <ProjectsEditor
                projects={profile?.projects ?? []}
                autoFocus={focus === 'work'}
                onChange={(projects) => merge({ projects })}
              />
            </Section>
            <Section
              icon="link"
              title="Show your work elsewhere"
              hint="Instagram, Behance, GitHub, a website: anywhere people can see what you make."
            >
              <LinksEditor links={profile?.links ?? []} onChange={(links) => merge({ links })} />
            </Section>
          </>
        )}
      </ScrollView>
      <ScreenHeader title="Edit profile" />
    </View>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.section, shadow('md')]}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={20} color={c.secondary} />
        <Text style={[type.headlineSm, { color: c.onSurface, flex: 1 }]}>{title}</Text>
      </View>
      {hint && <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{hint}</Text>}
      {children}
    </Glass>
  );
}

const COUNTRY_OPTIONS = Object.values(COUNTRIES).map((c) => ({ code: c.code, name: c.name }));

function BasicsForm({
  initial,
  focus,
  onSaved,
}: {
  initial: MyCreatorProfile | null;
  focus?: ProfileStep;
  onSaved: (p: MyCreatorProfile) => void;
}) {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [headline, setHeadline] = useState(initial?.headline ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [city, setCity] = useState(initial?.location.city ?? '');
  const [region, setRegion] = useState(initial?.location.region ?? '');
  const [country, setCountry] = useState(initial?.location.countryCode ?? 'NG');
  const [availability, setAvailability] = useState<Availability | null>(
    initial?.availability ?? null,
  );
  const [username, setUsername] = useState(initial?.username ?? '');
  // The photo saves on its own (not with the button), so it tracks the latest profile.
  const [photoProfile, setPhotoProfile] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  /** Only what changed. Empty text clears a field. */
  function changes(): ProfileUpdate {
    const u: ProfileUpdate = {};
    const text = (now: string, before: string | null | undefined) =>
      now.trim() !== (before ?? '').trim();
    if (text(displayName, initial?.displayName)) u.displayName = displayName;
    if (text(firstName, initial?.firstName)) u.firstName = firstName;
    if (text(lastName, initial?.lastName)) u.lastName = lastName;
    if (text(headline, initial?.headline)) u.headline = headline;
    if (text(bio, initial?.bio)) u.bio = bio;
    if (text(city, initial?.location.city)) u.city = city;
    if (text(region, initial?.location.region)) u.region = region;
    if (country !== (initial?.location.countryCode ?? 'NG')) u.countryCode = country;
    if (availability !== (initial?.availability ?? null)) u.availability = availability;
    if (username.trim() && text(username, initial?.username)) u.username = username.trim();
    return u;
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const { profile } = await profileApi.updateMine(await getAccessToken(), changes());
      onSaved(profile);
      setUsername(profile.username);
      setSaved('Saved. Your profile is up to date.');
      if (router.canGoBack()) router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const dirty = Object.keys(changes()).length > 0 || !initial;
  const nameCheck = useUsernameCheck(username, initial?.username);

  return (
    <>
      <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.section, shadow('md')]}>
        <View style={styles.sectionHead}>
          <Icon name="badge" size={20} color={c.secondary} />
          <Text style={[type.headlineSm, { color: c.onSurface, flex: 1 }]}>Who are you?</Text>
        </View>
        <PhotoEditor
          profile={photoProfile}
          initials={initialsOf(displayName || username || '?')}
          onChange={(p) => {
            setPhotoProfile(p);
            onSaved(p);
          }}
        />
        <Field
          label="Your name, as people will see it"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Like Amaka Obi or Amaka’s Kitchen"
          rule="displayName"
          maxLength={L.displayName}
          autoFocus={focus === 'name'}
        />
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Field
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              rule="name"
              autoComplete="given-name"
              maxLength={L.firstName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              rule="name"
              autoComplete="family-name"
              maxLength={L.lastName}
            />
          </View>
        </View>
        <Text style={[type.bodySm, { color: c.outline }]}>
          Only you see your first and last name.
        </Text>
        <Field
          label="Username"
          prefix={<Text style={[type.bodyLg, { color: c.outline }]}>@</Text>}
          value={username}
          onChangeText={setUsername}
          rule="handle"
          placeholder="We’ll suggest one"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={L.usernameMax}
        />
        <UsernameStatus check={nameCheck} />
      </Glass>

      <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.section, shadow('md')]}>
        <View style={styles.sectionHead}>
          <Icon name="work-outline" size={20} color={c.secondary} />
          <Text style={[type.headlineSm, { color: c.onSurface, flex: 1 }]}>What do you do?</Text>
        </View>
        <Field
          label="In a line"
          value={headline}
          onChangeText={setHeadline}
          placeholder="Like: I build custom gates and burglary-proof windows"
          maxLength={L.headline}
          autoFocus={focus === 'what_you_do'}
        />
        <Field
          label="About you (optional)"
          value={bio}
          onChangeText={setBio}
          placeholder="What you make, how you learned it, what you love about it"
          multiline
          maxLength={L.bio}
          style={{ minHeight: 96, textAlignVertical: 'top', paddingVertical: 12 }}
        />
        <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>Availability (optional)</Text>
        <View style={styles.chips}>
          {AVAILABILITY_OPTIONS.map((a) => (
            <Chip
              key={a}
              label={AVAILABILITY_LABEL[a]}
              active={availability === a}
              onPress={() => setAvailability((cur) => (cur === a ? null : a))}
            />
          ))}
        </View>
      </Glass>

      <Glass tint={alpha(c.surfaceContainer, 0.7)} style={[styles.section, shadow('md')]}>
        <View style={styles.sectionHead}>
          <Icon name="location-on" size={20} color={c.secondary} />
          <Text style={[type.headlineSm, { color: c.onSurface, flex: 1 }]}>Where are you?</Text>
        </View>
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
          Helps people near you discover your work. Only your city shows, never an address.
        </Text>
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Field
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="Like Kaduna"
              rule="place"
              maxLength={L.city}
              autoFocus={focus === 'location'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="State or region"
              value={region}
              onChangeText={setRegion}
              rule="place"
              maxLength={L.region}
            />
          </View>
        </View>
        <View style={styles.chips}>
          {COUNTRY_OPTIONS.map((opt) => (
            <Chip
              key={opt.code}
              label={opt.name}
              active={country === opt.code}
              onPress={() => setCountry(opt.code)}
            />
          ))}
        </View>
      </Glass>

      <ErrorText message={error} />
      <SuccessText message={saved} />
      <Button
        label={initial ? 'Save changes' : 'Save my profile'}
        onPress={() => void save()}
        loading={saving}
        disabled={!dirty || nameCheck.state === 'bad' || nameCheck.state === 'checking'}
      />
    </>
  );
}

type NameCheck =
  { state: 'idle' } | { state: 'checking' } | { state: 'ok' | 'bad'; message: string };

/**
 * Checks a new username as you type: format straight away, then (after a short pause) asks
 * the server whether it's reserved or taken. Saving checks again, so this is only guidance.
 */
function useUsernameCheck(value: string, current: string | undefined): NameCheck {
  const { getAccessToken } = useAuth();
  const [result, setResult] = useState<UsernameCheck | null>(null);
  const name = value.trim().toLowerCase();
  const unchanged = !name || name === (current ?? '');
  const wellFormed = USERNAME_PATTERN.test(name);

  useEffect(() => {
    if (unchanged || !wellFormed) return;
    let alive = true;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const r = await profileApi.checkUsername(await getAccessToken(), name);
          if (alive) setResult(r);
        } catch {
          // Offline or signed out: saving will still check.
          if (alive) setResult(null);
        }
      })();
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [name, unchanged, wellFormed, getAccessToken]);

  if (unchanged) return { state: 'idle' };
  if (!wellFormed) {
    return {
      state: 'bad',
      message:
        name.length < L.usernameMin
          ? `At least ${L.usernameMin} characters.`
          : 'Use letters, numbers, dots and underscores. No dot at the start or end.',
    };
  }
  if (!result || result.username !== name) return { state: 'checking' };
  return { state: result.available ? 'ok' : 'bad', message: result.message };
}

function UsernameStatus({ check }: { check: NameCheck }) {
  if (check.state === 'idle') return null;
  if (check.state === 'checking') {
    return (
      <View style={styles.nameStatus}>
        <ActivityIndicator size="small" color={c.outline} />
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>Checking…</Text>
      </View>
    );
  }
  const ok = check.state === 'ok';
  return (
    <View style={styles.nameStatus} accessibilityLiveRegion="polite">
      <Icon
        name={ok ? 'check-circle' : 'error-outline'}
        size={16}
        color={ok ? c.primary : c.error}
      />
      <Text style={[type.bodySm, { color: ok ? c.onSurface : c.error, flexShrink: 1 }]}>
        {check.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nameStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 },
  screen: { flex: 1, backgroundColor: c.surface },
  section: { padding: 16, borderRadius: radii.card, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pair: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
