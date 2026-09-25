// Show your work: pick or record a real video, watch it back, add details, post it.
// Every status shown here reflects what the server actually confirmed.
import {
  VIDEO_LIMITS as L,
  type MyVideo,
  type SkillCategory,
  type SkillRef,
  type VideoUploadTarget,
  type VideoVisibility,
} from '@jobtok/types';
import { useEvent } from 'expo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { VerifiedBadge } from '../../components/animations/VerifiedBadge';
import { MorphCard, useMorph, type Morph } from '../../components/auth/MorphCard';
import { Chip, Glass, Gradient, Icon } from '../../components/primitives';
import { Button, CharCount, ErrorText, Field } from '../../components/ui';
import { applyRule } from '../../lib/input/rules';
import { errorMessage, useAuth } from '../../lib/auth/AuthProvider';
import { profileApi, useMyProfile } from '../../lib/profile/profileApi';
import { setPlayerMuted } from '../../lib/video/player';
import { uploadVideoFile, videoApi, type UploadHandle } from '../../lib/video/videoApi';
import { alpha, c, glow, gradients, radii, shadow, type } from '../../theme';
import { SkillPicker } from './SkillPicker';

/** Client-side hint only; the server enforces the real limit from the file itself. */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

interface PickedVideo {
  uri: string;
  durationMs: number | null;
  sizeBytes: number | null;
}

type Step = 'pick' | 'preview' | 'details' | 'posting' | 'done';
type Phase = 'saving' | 'uploading' | 'checking' | 'publishing';

const CAPTION_IDEAS = [
  'Building this dining table from raw wood',
  'Here’s how I repaired this generator',
  'From fabric to finished outfit',
  'My process for installing this solar system',
];

const splitList = (v: string, max: number) =>
  v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);

/** The create flow. Each step (choose → preview → details → posting → done) morphs into the next. */
export function VideoComposer() {
  const morph = useMorph();
  return (
    <MorphCard morph={morph} bare>
      <ComposerSteps morph={morph} />
    </MorphCard>
  );
}

function ComposerSteps({ morph }: { morph: Morph }) {
  const router = useRouter();
  const { getAccessToken, user } = useAuth();
  const { profile } = useMyProfile();

  const [step, setStepNow] = useState<Step>('pick');
  // Step changes play the morph; the step swaps while the content is hidden.
  const setStep = (next: Step) => morph.run(() => setStepNow(next));
  const [video, setVideo] = useState<PickedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Details
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<SkillRef[]>([]);
  const [city, setCity] = useState<string | null>(null);
  const [tools, setTools] = useState('');
  const [materials, setMaterials] = useState('');
  const [tip, setTip] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');

  // Posting
  const [phase, setPhase] = useState<Phase>('saving');
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<{ id: string; upload: VideoUploadTarget } | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [posted, setPosted] = useState<MyVideo | null>(null);
  const upload = useRef<UploadHandle<MyVideo> | null>(null);

  useEffect(() => {
    let alive = true;
    profileApi
      .categories()
      .then((r) => alive && setCategories(r.categories))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const phoneVerified = Boolean(user?.verification.phone);

  async function pick(fromCamera: boolean) {
    setError(null);
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(
        fromCamera
          ? 'JobTok needs your camera to record. You can allow it in your phone’s settings.'
          : 'JobTok needs access to your videos to pick one. You can allow it in your phone’s settings.',
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      videoMaxDuration: L.maxDurationSeconds,
      // iOS: lets people trim to the limit right in the picker.
      allowsEditing: true,
      quality: 1,
    };
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    // expo-image-picker reports milliseconds on iOS/Android but seconds on web.
    const durationMs = a.duration ? (Platform.OS === 'web' ? a.duration * 1000 : a.duration) : null;
    // Quick, friendly checks. The server inspects the actual file either way.
    if (durationMs && durationMs > (L.maxDurationSeconds + 1) * 1000) {
      setError(
        `That video is ${Math.round(durationMs / 1000)} seconds. Videos can be up to ${L.maxDurationSeconds} seconds, so trim it first.`,
      );
      return;
    }
    if (a.fileSize && a.fileSize > MAX_UPLOAD_BYTES) {
      setError('That video is over 100 MB. Try a shorter clip or a lower camera quality.');
      return;
    }
    setVideo({ uri: a.uri, durationMs, sizeBytes: a.fileSize ?? null });
    setDraft(null);
    setUploaded(false);
    setStep('preview');
  }

  async function post() {
    if (!video) return;
    setError(null);
    setStep('posting');
    try {
      const token = await getAccessToken();
      const details = {
        caption: caption.trim(),
        categorySlug: category,
        skillIds: skills.map((s) => s.id),
        city: city === null ? (profile?.location.city ?? null) : city.trim() || null,
        visibility,
        tools: splitList(tools, L.tools),
        materials: splitList(materials, L.materials),
        tips: tip.trim() ? [tip.trim()] : [],
      };

      // 1. Save the details (or refresh them when retrying).
      setPhase('saving');
      let current = draft;
      if (!current) {
        const created = await videoApi.create(token, details);
        current = { id: created.video.id, upload: created.upload };
        setDraft(current);
      } else {
        await videoApi.update(token, current.id, details);
      }

      // 2. Upload the file. The server checks it before answering.
      if (!uploaded) {
        setPhase('uploading');
        setProgress(0);
        const handle = uploadVideoFile(video.uri, current.upload, token, (p) => {
          setProgress(p);
          if (p >= 1) setPhase('checking');
        });
        upload.current = handle;
        await handle.done;
        upload.current = null;
        setUploaded(true);
      }

      // 3. Publish.
      setPhase('publishing');
      const { video: published } = await videoApi.publish(await getAccessToken(), current.id);
      setPosted(published);
      setStep('done');
    } catch (err) {
      upload.current = null;
      setError(errorMessage(err));
      setStep('details');
    }
  }

  function reset() {
    setStep('pick');
    setVideo(null);
    setDraft(null);
    setUploaded(false);
    setPosted(null);
    setCaption('');
    setSkills([]);
    setTools('');
    setMaterials('');
    setTip('');
    setError(null);
  }

  if (!phoneVerified) {
    return (
      <Glass tint={alpha(c.surfaceContainer, 0.8)} style={[styles.card, shadow('md')]}>
        <Icon name="verified-user" size={28} color={c.secondary} />
        <Text style={[type.headlineSm, styles.center]}>Verify your phone to post</Text>
        <Text style={[type.bodyMd, styles.muted]}>
          Every video on JobTok comes from someone with a verified phone number. It keeps the
          community real.
        </Text>
        <Button
          label="Verify my phone"
          onPress={() => router.push('/phone?purpose=verify_phone')}
        />
      </Glass>
    );
  }

  if (step === 'pick') {
    return (
      <View style={{ gap: 16 }}>
        <Gradient
          colors={[c.surfaceContainerHigh, c.surfaceContainer]}
          style={[styles.hero, shadow('xl')]}
        >
          <Text style={[type.labelSm, styles.kicker]}>SHOW US WHAT YOU CAN DO</Text>
          <Text style={[type.headlineMd, { color: c.onSurface }]}>What are you showing today?</Text>
          <Text style={[type.bodyMd, { color: c.onSurfaceVariant }]}>
            Show the before, the process and the result. Up to {L.maxDurationSeconds} seconds.
          </Text>
          <View style={styles.steps}>
            {['Before', 'Process', 'Result'].map((s, i) => (
              <View key={s} style={styles.stepPill}>
                <Text style={[type.labelSm, { color: c.secondary }]}>{i + 1}</Text>
                <Text style={[type.labelMd, { color: c.onSurface }]}>{s}</Text>
              </View>
            ))}
          </View>
        </Gradient>
        <Pressable
          onPress={() => void pick(true)}
          accessibilityRole="button"
          accessibilityLabel="Record a video"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <Gradient colors={gradients.cta} style={[styles.bigBtn, glow('primary')]}>
            <Icon name="videocam" size={26} color={c.white} />
            <View style={{ flex: 1 }}>
              <Text style={[type.labelLg, { color: c.white }]}>Record a video</Text>
              <Text style={[type.bodySm, { color: alpha(c.white, 0.8) }]}>Use your camera now</Text>
            </View>
            <Icon name="arrow-forward" size={20} color={c.white} />
          </Gradient>
        </Pressable>
        <Pressable
          onPress={() => void pick(false)}
          accessibilityRole="button"
          accessibilityLabel="Choose a video"
          style={({ pressed }) => [styles.bigBtn, styles.secondaryBtn, pressed && { opacity: 0.8 }]}
        >
          <Icon name="video-library" size={26} color={c.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[type.labelLg, { color: c.onSurface }]}>Choose a video</Text>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
              MP4 or MOV from your phone, up to 100 MB
            </Text>
          </View>
          <Icon name="arrow-forward" size={20} color={c.onSurfaceVariant} />
        </Pressable>
        <ErrorText message={error} />
      </View>
    );
  }

  if (step === 'preview' && video) {
    return (
      <View style={{ gap: 16 }}>
        <LocalPreview uri={video.uri} />
        <Button label="Use this video" onPress={() => setStep('details')} />
        <Button label="Choose another" variant="secondary" onPress={reset} />
      </View>
    );
  }

  if (step === 'posting') {
    const label = {
      saving: 'Saving your details…',
      uploading: `Uploading ${Math.round(progress * 100)}%`,
      checking: 'Checking your video…',
      publishing: 'Posting…',
    }[phase];
    return (
      <Glass tint={alpha(c.surfaceContainer, 0.8)} style={[styles.card, shadow('md')]}>
        <Icon name="cloud-upload" size={32} color={c.secondary} />
        <Text style={[type.headlineSm, styles.center]} accessibilityLiveRegion="polite">
          {label}
        </Text>
        <View style={styles.track}>
          <View
            style={{
              width: `${phase === 'saving' ? 5 : phase === 'uploading' ? Math.max(5, progress * 90) : phase === 'checking' ? 95 : 100}%`,
              height: '100%',
            }}
          >
            <Gradient colors={gradients.apply} style={{ flex: 1 }} />
          </View>
        </View>
        <Text style={[type.bodySm, styles.muted]}>
          {phase === 'checking'
            ? 'We check every video before it goes live. This takes a few seconds.'
            : 'Keep JobTok open until this finishes.'}
        </Text>
        {phase === 'uploading' && (
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              upload.current?.abort();
            }}
          />
        )}
      </Glass>
    );
  }

  if (step === 'done' && posted) {
    const isPublic = posted.visibility === 'public';
    return (
      <View style={[styles.card, { gap: 14 }]}>
        <VerifiedBadge size={150} ringsDelay={900} />
        <Text style={[type.headlineMd, styles.center]}>
          {isPublic ? 'Your video is live' : 'Saved to your profile'}
        </Text>
        <Text style={[type.bodyMd, styles.muted]}>
          {isPublic
            ? 'People can now discover your work in the feed and on your profile.'
            : 'Only you can see it. You can make it public any time.'}
        </Text>
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <Button label="See it on my profile" onPress={() => router.replace('/profile')} />
          <Button
            label="Watch it"
            variant="secondary"
            onPress={() => router.push(`/video/${posted.id}`)}
          />
          <Button label="Post another video" variant="ghost" onPress={reset} />
        </View>
      </View>
    );
  }

  // Details
  const canPost = caption.trim().length > 0 && caption.trim().length <= L.caption;
  return (
    <View style={{ gap: 16 }}>
      {video && (
        <Pressable
          onPress={() => setStep('preview')}
          style={styles.mini}
          accessibilityRole="button"
        >
          <Icon name="movie" size={20} color={c.secondary} />
          <Text style={[type.labelMd, { color: c.onSurface, flex: 1 }]}>
            Your video
            {video.durationMs ? ` • ${Math.round(video.durationMs / 1000)}s` : ''}
          </Text>
          <Text style={[type.labelMd, { color: c.secondary }]}>Watch again</Text>
        </Pressable>
      )}

      <View style={styles.section}>
        <Text style={[type.labelMd, styles.label]}>What are you showing?</Text>
        <TextInput
          value={caption}
          onChangeText={(v) => setCaption(applyRule('text', v).value)}
          placeholder={`Like: ${CAPTION_IDEAS[0]}`}
          placeholderTextColor={c.outline}
          maxLength={L.caption}
          multiline
          style={[type.bodyLg, styles.textarea]}
          accessibilityLabel="What are you showing?"
        />
        <View style={{ alignSelf: 'flex-end' }}>
          <CharCount length={caption.length} max={L.caption} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[type.labelMd, styles.label]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {categories.map((cat) => (
              <Chip
                key={cat.slug}
                label={cat.name}
                active={category === cat.slug}
                onPress={() => setCategory((cur) => (cur === cat.slug ? null : cat.slug))}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SkillPicker value={skills} onChange={setSkills} categorySlug={category} />
      </View>

      <View style={styles.section}>
        <Field
          label="City (optional)"
          icon="location-on"
          value={city ?? profile?.location.city ?? ''}
          onChangeText={setCity}
          placeholder="Like Kaduna"
          rule="place"
          maxLength={L.city}
        />
        <Text style={[type.bodySm, { color: c.outline }]}>
          Only the city is shown, never an address.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[type.labelMd, styles.label]}>Learn this (optional)</Text>
        <Field
          label="Tools"
          value={tools}
          onChangeText={setTools}
          placeholder="Like: drill, multimeter, crimping tool"
          hint={`Separate with commas. Up to ${L.tools}.`}
          maxLength={L.tools * (L.learnItem + 2)}
          counter={false}
        />
        <Field
          label="Materials"
          value={materials}
          onChangeText={setMaterials}
          placeholder="Like: solar panels, inverter, battery"
          hint={`Separate with commas. Up to ${L.materials}.`}
          maxLength={L.materials * (L.learnItem + 2)}
          counter={false}
        />
        <Field
          label="Your best tip"
          value={tip}
          onChangeText={setTip}
          placeholder="Like: Always check polarity before connecting the battery"
          maxLength={L.tipItem}
        />
      </View>

      <View style={styles.section}>
        <Text style={[type.labelMd, styles.label]}>Who can see it?</Text>
        <View style={styles.row}>
          <Chip
            label="Everyone"
            icon="public"
            active={visibility === 'public'}
            onPress={() => setVisibility('public')}
          />
          <Chip
            label="Only me"
            icon="lock"
            active={visibility === 'private'}
            onPress={() => setVisibility('private')}
          />
        </View>
      </View>

      <ErrorText message={error} />
      <Button label="Post video" onPress={() => void post()} disabled={!canPost} />
      <Button label="Choose another video" variant="ghost" onPress={reset} />
    </View>
  );
}

/** The real selected/recorded file, played back before posting. */
function LocalPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
    p.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });

  return (
    <View style={[styles.preview, shadow('xl')]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />
      {status === 'error' && (
        <View style={styles.previewError}>
          <Icon name="error-outline" size={28} color={c.onSurface} />
          <Text style={[type.bodyMd, styles.center]}>
            This video can’t be played here. Try choosing another one.
          </Text>
        </View>
      )}
      <View style={styles.controls}>
        <PreviewButton
          icon={isPlaying ? 'pause' : 'play-arrow'}
          label={isPlaying ? 'Pause' : 'Play'}
          onPress={() => (isPlaying ? player.pause() : player.play())}
        />
        <PreviewButton icon="replay" label="Replay" onPress={() => player.replay()} />
        <PreviewButton
          icon={muted ? 'volume-off' : 'volume-up'}
          label={muted ? 'Unmute' : 'Mute'}
          onPress={() => setPlayerMuted(player, !muted)}
        />
      </View>
    </View>
  );
}

function PreviewButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.ctrl}>
        <Icon name={icon} size={24} color={c.onSurface} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { color: c.onSurface, textAlign: 'center' },
  muted: { color: c.onSurfaceVariant, textAlign: 'center' },
  card: {
    padding: 24,
    borderRadius: radii.card,
    gap: 12,
    alignItems: 'center',
  },
  hero: { padding: 20, borderRadius: radii.card, gap: 8 },
  kicker: { color: c.secondary, letterSpacing: 1.2 },
  steps: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainerHighest,
  },
  bigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: radii.card,
  },
  secondaryBtn: {
    backgroundColor: c.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  preview: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 560,
    alignSelf: 'center',
    borderRadius: radii.media,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewError: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  ctrl: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  track: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerHighest,
  },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainer,
  },
  section: { gap: 8, padding: 16, borderRadius: radii.card, backgroundColor: c.surfaceContainer },
  label: { color: c.onSurfaceVariant },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  textarea: {
    minHeight: 80,
    color: c.onSurface,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainerHigh,
    textAlignVertical: 'top',
  },
});
