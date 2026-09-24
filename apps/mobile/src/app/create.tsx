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
import { CATEGORIES, images } from '../features/demo/data';
import { alpha, c, glow, gradients, radii, shadow, type } from '../theme';

/** Show your work: a video of real work. Team needed: find skilled people for a project. */
type Mode = 'work' | 'team';

const STYLES = [
  'Before & after',
  'Step by step',
  'Problem & fix',
  'Day in the life',
  'Time-lapse',
  'Tips',
];
const TEAM_TERMS = [
  'One day',
  'A few days',
  'Weekend',
  'Ongoing',
  'Tools provided',
  'Meals provided',
];
const MAX_DESC = 300;

const comingSoon = (what: string) =>
  Alert.alert('Coming soon', `${what} is coming soon. Nothing has been posted yet.`);

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

const GUIDE: Record<Mode, { title: string; text: string }> = {
  work: {
    title: 'Story guide',
    text: 'Start with the before. Show the process and the tricky part, then end with the result: “Watch the final result.”',
  },
  team: {
    title: 'Say what you need',
    text: '“I’m catering a wedding for 300 guests on Saturday. I need 2 assistant chefs and 3 kitchen helpers. Here’s the kitchen...”',
  },
};

/** Post a video of your work or a team request (design: jobtok_post_a_video_job). UI only for now. */
export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('work');
  const [prompter, setPrompter] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [pickCategory, setPickCategory] = useState(false);
  const [location, setLocation] = useState('');
  const [pay, setPay] = useState(15000);
  const [videoStyles, setVideoStyles] = useState<string[]>(['Before & after']);
  const [terms, setTerms] = useState<string[]>([]);
  const [roles, setRoles] = useState('');
  const [tools, setTools] = useState('');
  const [tip, setTip] = useState('');
  const [desc, setDesc] = useState('');

  const team = mode === 'team';
  const chips = team ? TEAM_TERMS : STYLES;
  const selected = team ? terms : videoStyles;
  const toggleChip = (t: string) =>
    (team ? setTerms : setVideoStyles)((cur) =>
      cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t],
    );

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
            {(['work', 'team'] as const).map((m) => (
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
                  {m === 'work' ? 'Show your work' : 'Team needed'}
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
                  <Text style={[type.labelSm, { color: c.onSurface }]}>{GUIDE[mode].title}</Text>
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
                    <Text style={[type.labelSm, { color: c.secondary }]}>{GUIDE[mode].title}</Text>
                  </View>
                  <Pressable
                    onPress={() => setPrompter(false)}
                    accessibilityLabel="Close guide"
                    hitSlop={8}
                  >
                    <Icon name="close" size={14} color={c.onSurfaceVariant} />
                  </Pressable>
                </View>
                <Text
                  style={[type.bodySm, { color: c.onSurface, lineHeight: 20 }]}
                  numberOfLines={3}
                >
                  {GUIDE[mode].text}
                </Text>
              </Glass>
            )}

            <View style={styles.reticle} pointerEvents="none">
              <Icon name="crop-free" size={48} color={c.primary} />
              <Text style={[type.labelMd, styles.tagline]}>SHOW US WHAT YOU CAN DO.</Text>
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
                  {team ? 'Your team request' : 'Video details'}
                </Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                  {team
                    ? 'Tell skilled people what the job is and who you need.'
                    : 'A few details help the right people find your video.'}
                </Text>
              </View>
              <View style={styles.step}>
                <Text style={[type.labelSm, { color: c.secondary }]}>Step 2 of 2</Text>
              </View>
            </View>

            <Card>
              <Label
                text={team ? 'What’s the project?' : 'What are you showing?'}
                right={<Text style={[type.labelSm, { color: c.secondary }]}>Required</Text>}
              />
              <InputRow icon={team ? 'groups' : 'videocam'} iconColor={c.primary}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={
                    team ? 'Like: Wedding for 300 guests' : 'Like: Watch me build this custom gate'
                  }
                  placeholderTextColor={c.outline}
                  style={[type.bodyMd, styles.input]}
                  accessibilityLabel={team ? 'Project' : 'Video title'}
                />
              </InputRow>
            </Card>

            <Card>
              <Label text="Category" />
              <Pressable
                onPress={() => setPickCategory((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={`Category: ${category}`}
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
                text={team ? 'Where is it?' : 'Your city'}
                right={
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        'Location',
                        'Finding your city automatically is coming soon. For now, just type it in.',
                      )
                    }
                    style={styles.gps}
                  >
                    <Icon name="my-location" size={14} color={c.secondary} />
                    <Text style={[type.labelSm, { color: c.secondary }]}>Use my city</Text>
                  </Pressable>
                }
              />
              <InputRow icon="location-on" iconColor={c.error}>
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Like Kaduna or Lagos"
                  placeholderTextColor={c.outline}
                  style={[type.bodyMd, styles.input]}
                  accessibilityLabel="City"
                />
              </InputRow>
              <Text style={[type.bodySm, { color: c.outline }]}>
                Only your city is shown, never your address.
              </Text>
            </Card>

            {team ? (
              <>
                <Card>
                  <Label text="Who do you need?" />
                  <InputRow icon="group-add" iconColor={c.primary}>
                    <TextInput
                      value={roles}
                      onChangeText={setRoles}
                      placeholder="Like: 2 assistant chefs, 3 kitchen helpers"
                      placeholderTextColor={c.outline}
                      style={[type.bodyMd, styles.input]}
                      accessibilityLabel="Who do you need"
                    />
                  </InputRow>
                </Card>
                <Card>
                  <Label
                    text="Pay per person"
                    right={
                      <Text
                        style={[type.labelMd, { color: c.primary }]}
                      >{`${naira(pay)} a day`}</Text>
                    }
                  />
                  <View style={styles.sliderBox}>
                    <Slider
                      minimumValue={5000}
                      maximumValue={100000}
                      step={1000}
                      value={pay}
                      onValueChange={setPay}
                      minimumTrackTintColor={c.primary}
                      maximumTrackTintColor={c.surfaceContainerLowest}
                      thumbTintColor={c.primary}
                      accessibilityLabel="Pay per person per day"
                    />
                    <View style={styles.sliderScale}>
                      {['₦5k', '₦50k', '₦100k+'].map((s) => (
                        <Text key={s} style={[type.labelSm, { color: c.outline }]}>
                          {s}
                        </Text>
                      ))}
                    </View>
                  </View>
                </Card>
              </>
            ) : (
              <Card>
                <Label
                  text="Learn this"
                  right={<Text style={[type.labelSm, { color: c.outline }]}>Optional</Text>}
                />
                <InputRow icon="handyman" iconColor={c.secondary}>
                  <TextInput
                    value={tools}
                    onChangeText={setTools}
                    placeholder="Tools and materials you used"
                    placeholderTextColor={c.outline}
                    style={[type.bodyMd, styles.input]}
                    accessibilityLabel="Tools and materials"
                  />
                </InputRow>
                <InputRow icon="tips-and-updates" iconColor={c.primary}>
                  <TextInput
                    value={tip}
                    onChangeText={setTip}
                    placeholder="Your best tip for someone learning this"
                    placeholderTextColor={c.outline}
                    style={[type.bodyMd, styles.input]}
                    accessibilityLabel="Your best tip"
                  />
                </InputRow>
              </Card>
            )}

            <Card>
              <Label text={team ? 'How long, and what’s included' : 'Video style'} />
              <View style={styles.tags}>
                {chips.map((t) => {
                  const on = selected.includes(t);
                  return (
                    <Pressable
                      key={t}
                      onPress={() => toggleChip(t)}
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
                text={team ? 'Anything else they should know?' : 'Tell the story'}
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
                placeholder={
                  team
                    ? 'Dates, times, what to bring...'
                    : 'What was the job, how did you do it, and how did it turn out?'
                }
                placeholderTextColor={c.outline}
                style={[type.bodyMd, styles.textarea]}
                accessibilityLabel="Description"
              />
            </Card>

            <View style={styles.safe}>
              <Icon name="verified-user" size={24} color={c.secondary} />
              <View style={{ flexShrink: 1 }}>
                <Text style={[type.labelMd, { color: c.onSurface }]}>Keep it real</Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                  {team
                    ? 'Describe the job honestly and pay what you promise.'
                    : 'Only post work you did yourself.'}
                </Text>
              </View>
            </View>

            <View style={{ gap: 8, paddingTop: 8 }}>
              <Pressable
                onPress={() => comingSoon('Posting')}
                accessibilityRole="button"
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
              >
                <Gradient colors={gradients.cta} style={[styles.publish, glow('primary')]}>
                  <Icon name="rocket-launch" size={20} color={c.white} />
                  <Text style={[type.labelLg, { color: c.white }]}>
                    {team ? 'Post team request' : 'Post video'}
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
                <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>Save draft</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <ScreenHeader title="Create" />
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
