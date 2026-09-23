import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_HEADER_HEIGHT, ScreenHeader } from '../components/ScreenHeader';
import {
  Cover,
  Glass,
  Gradient,
  Icon,
  PulseDot,
  Scrim,
  type IconName,
} from '../components/primitives';
import { images } from '../features/demo/data';
import { alpha, c, glow, gradients, radii, shadow, type } from '../theme';

type Mode = 'pitch' | 'hire';

const CATEGORIES = [
  'Construction & Real Estate',
  'Tech & Product Design',
  'Culinary & Hospitality',
  'Logistics & Heavy Fleet',
  'Healthcare & Nursing',
];
const TAGS = ['On-site', 'Immediate start', 'Full-time', 'Verified Portfolio', 'Relocation OK'];
const MAX_DESC = 300;

const comingSoon = (what: string) =>
  Alert.alert('Coming soon', `${what} is coming soon. Nothing has been posted yet.`);

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Record a pitch or a hiring post (design: jobtok_post_a_video_job). UI only for now. */
export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('pitch');
  const [prompter, setPrompter] = useState(true);
  const [title, setTitle] = useState('Site Supervisor & Finishes Lead');
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [pickCategory, setPickCategory] = useState(false);
  const [location, setLocation] = useState('Lekki Phase 1, Lagos, Nigeria');
  const [salary, setSalary] = useState(1800);
  const [tags, setTags] = useState<string[]>(['On-site', 'Immediate start', 'Full-time']);
  const [desc, setDesc] = useState(
    'We need an experienced site supervisor for our ongoing high-spec residential build in Lekki. Candidate must demonstrate 4+ years managing subcontractors and carpentry finishing.',
  );

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: SCREEN_HEADER_HEIGHT + insets.top,
          paddingBottom: insets.bottom + 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Studio label + mode toggle */}
        <View style={styles.modeRow}>
          <View style={styles.studio}>
            <View style={[styles.studioDot, glow('secondary')]} />
            <Text style={[type.labelSm, styles.studioText]}>Creator Studio</Text>
          </View>
          <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.toggle}>
            {(['pitch', 'hire'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                style={[styles.toggleItem, mode === m && [styles.toggleActive, shadow('md')]]}
              >
                <Text
                  style={[
                    type.labelSm,
                    { color: mode === m ? c.onPrimaryContainer : c.onSurfaceVariant },
                  ]}
                >
                  {m === 'pitch' ? 'Seeker Pitch' : 'Hiring Post'}
                </Text>
              </Pressable>
            ))}
          </Glass>
        </View>

        <View style={styles.content}>
          {/* Viewfinder */}
          <View style={[styles.viewfinder, shadow('xl')]}>
            <Cover source={images.studioDesk} />
            <Scrim
              position="top"
              from={c.surfaceContainerLowest}
              height="100%"
              stops={[
                alpha(c.surfaceContainerLowest, 0.8),
                'transparent',
                alpha(c.surfaceContainerLowest, 0.9),
              ]}
            />

            <View style={styles.hudTop}>
              <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.recPill}>
                <PulseDot color={c.error} size={10} />
                <Text style={[type.labelMd, { color: c.onSurface, letterSpacing: 1 }]}>00:00</Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>/ 01:00</Text>
              </Glass>
              <Pressable onPress={() => setPrompter((v) => !v)} accessibilityRole="button">
                <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.recPill}>
                  <Icon name="notes" size={14} color={c.secondary} />
                  <Text style={[type.labelSm, { color: c.onSurface }]}>Prompter Script</Text>
                </Glass>
              </Pressable>
            </View>

            {prompter && (
              <Glass
                tint={alpha(c.surfaceContainerHigh, 0.9)}
                intensity={50}
                style={styles.prompter}
              >
                <View style={styles.prompterHead}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="auto-awesome" size={12} color={c.secondary} />
                    <Text style={[type.labelSm, { color: c.secondary }]}>
                      {mode === 'pitch'
                        ? 'Suggested 45s Pitch Script'
                        : 'Suggested 45s Hiring Script'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setPrompter(false)}
                    accessibilityLabel="Close prompter"
                    hitSlop={8}
                  >
                    <Icon name="close" size={14} color={c.onSurfaceVariant} />
                  </Pressable>
                </View>
                <Text
                  style={[type.bodySm, { color: c.onSurface, lineHeight: 20 }]}
                  numberOfLines={3}
                >
                  {mode === 'pitch'
                    ? '“Hi, I’m Joshua! Over the last 5 years in Lagos, I’ve led custom commercial woodworking and finished high-end bespoke fitouts on time and under budget. Here are 3 projects I personally delivered...”'
                    : '“We’re hiring a site supervisor in Lekki! You’ll lead subcontractors and carpentry finishing on a high-spec residential build. Here’s the site and the team you’d join...”'}
                </Text>
              </Glass>
            )}

            <View style={styles.reticle} pointerEvents="none">
              <Icon name="crop-free" size={48} color={c.primary} />
              <Text style={[type.labelMd, styles.tagline]}>SHOW ME WHAT YOU CAN DO.</Text>
            </View>

            <View style={styles.tools}>
              <Tool icon="flip-camera-ios" label="Flip" />
              <Tool icon="speed" label="1.0x" />
              <Tool icon="auto-fix-high" label="Glow" />
              <Tool icon="mic" label="Sound" />
            </View>

            <View style={styles.deck}>
              <Pressable
                onPress={() => comingSoon('Uploading from your gallery')}
                accessibilityRole="button"
                accessibilityLabel="Upload from gallery"
              >
                <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.deckBtn}>
                  <Icon name="photo-library" size={20} color={c.onSurface} />
                </Glass>
              </Pressable>
              <Pressable
                onPress={() => comingSoon('Camera recording')}
                accessibilityRole="button"
                accessibilityLabel="Record"
                style={({ pressed }) => [
                  styles.shutter,
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <Gradient colors={gradients.apply} diagonal style={styles.shutterRing}>
                  <View style={[styles.shutterCore, glow('primary')]}>
                    <View style={styles.shutterStop} />
                  </View>
                </Gradient>
              </Pressable>
              <Pressable
                onPress={() => comingSoon('Retaking videos')}
                accessibilityRole="button"
                accessibilityLabel="Retake video"
              >
                <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={styles.deckBtn}>
                  <Icon name="replay" size={20} color={c.onSurface} />
                </Glass>
              </Pressable>
            </View>
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View style={styles.formHead}>
              <View style={{ flexShrink: 1 }}>
                <Text style={[type.headlineSm, { color: c.onSurface }]}>
                  Job &amp; Skill Metadata
                </Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                  Add a few details so{' '}
                  {mode === 'pitch'
                    ? 'employers can find your pitch'
                    : 'the right people can find your job'}
                  .
                </Text>
              </View>
              <View style={styles.step}>
                <Text style={[type.labelSm, { color: c.secondary }]}>Step 2 of 2</Text>
              </View>
            </View>

            <Card>
              <Label
                text="Job Title or Specialty Role"
                right={<Text style={[type.labelSm, { color: c.secondary }]}>Required</Text>}
              />
              <InputRow icon="work" iconColor={c.primary}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Like Full Stack Developer or Head Chef"
                  placeholderTextColor={c.outline}
                  style={[type.bodyMd, styles.input]}
                  accessibilityLabel="Job title or specialty role"
                />
              </InputRow>
            </Card>

            <Card>
              <Label text="Industry Category" />
              <Pressable
                onPress={() => setPickCategory((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={`Industry category: ${category}`}
              >
                <InputRow icon="category" iconColor={c.secondary}>
                  <Text style={[type.bodyMd, { color: c.onSurface, flex: 1 }]}>{category}</Text>
                  <Icon name="expand-more" size={20} color={c.outline} />
                </InputRow>
              </Pressable>
              {pickCategory && (
                <View style={styles.menu}>
                  {CATEGORIES.map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => {
                        setCategory(opt);
                        setPickCategory(false);
                      }}
                      style={styles.menuItem}
                      accessibilityRole="menuitem"
                    >
                      <Text
                        style={[type.bodyMd, { color: opt === category ? c.primary : c.onSurface }]}
                      >
                        {opt}
                      </Text>
                      {opt === category && <Icon name="check" size={16} color={c.primary} />}
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>

            <Card>
              <Label
                text="Job / Candidate Location"
                right={
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Location',
                        'Finding your location automatically is coming soon. For now, just type it in.',
                      )
                    }
                    style={styles.gps}
                  >
                    <Icon name="my-location" size={14} color={c.secondary} />
                    <Text style={[type.labelSm, { color: c.secondary }]}>GPS Auto</Text>
                  </Pressable>
                }
              />
              <InputRow icon="location-on" iconColor={c.error}>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="City, State or Remote"
                  placeholderTextColor={c.outline}
                  style={[type.bodyMd, styles.input]}
                  accessibilityLabel="Location"
                />
              </InputRow>
            </Card>

            <Card>
              <Label
                text={mode === 'pitch' ? 'Expected Monthly Compensation' : 'Monthly Pay Range'}
                right={
                  <Text
                    style={[type.labelMd, { color: c.primary }]}
                  >{`${money(Math.max(500, salary - 600))} - ${money(salary)} / mo`}</Text>
                }
              />
              <View style={styles.sliderBox}>
                <Slider
                  minimumValue={500}
                  maximumValue={5000}
                  step={100}
                  value={salary}
                  onValueChange={setSalary}
                  minimumTrackTintColor={c.primary}
                  maximumTrackTintColor={c.surfaceContainerLowest}
                  thumbTintColor={c.primary}
                  accessibilityLabel="Monthly compensation"
                />
                <View style={styles.sliderScale}>
                  {['Entry ($500)', 'Mid ($2,500)', 'Senior ($5,000+)'].map((s) => (
                    <Text key={s} style={[type.labelSm, { color: c.outline }]}>
                      {s}
                    </Text>
                  ))}
                </View>
              </View>
            </Card>

            <Card>
              <Label text="Employment Badges & Terms" />
              <View style={styles.tags}>
                {TAGS.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <Pressable
                      key={t}
                      onPress={() => toggleTag(t)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={[
                        styles.tag,
                        { backgroundColor: on ? c.primaryContainer : c.surfaceContainerHigh },
                      ]}
                    >
                      <Icon
                        name={on ? 'check' : 'add'}
                        size={12}
                        color={on ? c.onPrimaryContainer : c.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          type.labelSm,
                          { color: on ? c.onPrimaryContainer : c.onSurfaceVariant },
                        ]}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            <Card>
              <Label
                text={
                  mode === 'pitch'
                    ? 'Pitch Overview & Deliverables'
                    : 'Role Overview & Requirements'
                }
                right={
                  <Text
                    style={[type.labelSm, { color: c.outline }]}
                  >{`${desc.length}/${MAX_DESC}`}</Text>
                }
              />
              <TextInput
                value={desc}
                onChangeText={(v) => setDesc(v.slice(0, MAX_DESC))}
                multiline
                numberOfLines={3}
                maxLength={MAX_DESC}
                placeholder="Tell people what you've worked on, the tools you use, or what you need..."
                placeholderTextColor={c.outline}
                style={[type.bodyMd, styles.textarea]}
                accessibilityLabel="Description"
              />
            </Card>

            <View style={styles.safe}>
              <Icon name="verified-user" size={24} color={c.secondary} />
              <View style={{ flexShrink: 1 }}>
                <Text style={[type.labelMd, { color: c.onSurface }]}>
                  Verified JobTok Safe Network
                </Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                  Every video will be checked to help protect you from fake job offers.
                </Text>
              </View>
            </View>

            <View style={{ gap: 8, paddingTop: 8 }}>
              <Pressable
                onPress={() => comingSoon('Publishing')}
                accessibilityRole="button"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
              >
                <Gradient colors={gradients.cta} style={[styles.publish, glow('primary')]}>
                  <Icon name="rocket-launch" size={20} color={c.white} />
                  <Text style={[type.labelLg, { color: c.white }]}>
                    {mode === 'pitch' ? 'Publish Pitch to Feed' : 'Publish Job to Feed'}
                  </Text>
                  <Icon name="arrow-forward" size={18} color={c.white} />
                </Gradient>
              </Pressable>
              <Pressable
                onPress={() => comingSoon('Saving drafts')}
                accessibilityRole="button"
                style={styles.draft}
              >
                <Icon name="bookmark-border" size={18} color={c.onSurfaceVariant} />
                <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>Save Video Draft</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <ScreenHeader title="Create Video Job" />
    </View>
  );
}

function Tool({ icon, label }: { icon: IconName; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <Glass tint={alpha(c.surfaceContainerHigh, 0.8)} style={[styles.tool, shadow('md')]}>
        <Icon name={icon} size={18} color={c.onSurface} />
        <Text style={[type.labelSm, { color: c.onSurface, fontSize: 8, lineHeight: 10 }]}>
          {label}
        </Text>
      </Glass>
    </Pressable>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={[styles.card, shadow('md')]}>{children}</View>;
}

function Label({ text, right }: { text: string; right?: React.ReactNode }) {
  return (
    <View style={styles.label}>
      <Text style={[type.labelMd, { color: c.onSurfaceVariant, flexShrink: 1 }]}>{text}</Text>
      {right}
    </View>
  );
}

function InputRow({
  icon,
  iconColor,
  children,
}: {
  icon: IconName;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.inputRow}>
      <Icon name={icon} size={20} color={iconColor} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface },
  modeRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studio: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  studioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.secondary },
  studioText: { color: c.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radii.pill },
  toggleItem: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radii.pill },
  toggleActive: { backgroundColor: c.primaryContainer },
  content: { paddingHorizontal: 16, gap: 24 },
  viewfinder: {
    width: '100%',
    aspectRatio: 9 / 12,
    maxHeight: 460,
    borderRadius: radii.media,
    overflow: 'hidden',
    backgroundColor: c.surfaceContainerLowest,
    padding: 16,
    justifyContent: 'space-between',
  },
  hudTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  prompter: { padding: 8, borderRadius: radii.md, marginRight: 52 },
  prompterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reticle: { alignSelf: 'center', alignItems: 'center', gap: 4, opacity: 0.55 },
  tagline: { color: c.onSurface, letterSpacing: 1.5 },
  tools: { position: 'absolute', right: 12, top: 64, gap: 8, alignItems: 'center' },
  tool: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  deck: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  deckBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: { width: 64, height: 64 },
  shutterRing: { flex: 1, borderRadius: 32, padding: 8, opacity: 0.95 },
  shutterCore: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterStop: { width: 16, height: 16, borderRadius: 3, backgroundColor: '#ffffff' },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  step: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainerHigh,
  },
  card: { backgroundColor: c.surfaceContainer, padding: 16, borderRadius: radii.card, gap: 4 },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surfaceContainerHigh,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.card,
  },
  input: { flex: 1, color: c.onSurface, padding: 0 },
  menu: {
    marginTop: 4,
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainerHigh,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: alpha(c.outlineVariant, 0.6),
  },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sliderBox: {
    backgroundColor: c.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.card,
    gap: 8,
  },
  sliderScale: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  textarea: {
    backgroundColor: c.surfaceContainerHigh,
    color: c.onSurface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.card,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  safe: {
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  publish: {
    paddingVertical: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  draft: {
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
