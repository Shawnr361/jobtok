// "Team needed": find skilled people for a project (a chef with a 300-guest wedding needs
// helpers). UI only for now: nothing is posted, and the screen says so.
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gradient, Icon, type IconName } from '../../components/primitives';
import { CharCount } from '../../components/ui';
import { applyRule } from '../../lib/input/rules';
import { CATEGORIES } from '../demo/data';
import { alpha, c, glow, gradients, radii, shadow, type } from '../../theme';

const TEAM_TERMS = [
  'One day',
  'A few days',
  'Weekend',
  'Ongoing',
  'Tools provided',
  'Meals provided',
];
const MAX_DESC = 300;
const MAX_TITLE = 80;
const MAX_PLACE = 100;
const MAX_ROLES = 120;
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

export function TeamRequestForm() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [pickCategory, setPickCategory] = useState(false);
  const [location, setLocation] = useState('');
  const [roles, setRoles] = useState('');
  const [pay, setPay] = useState(15000);
  const [terms, setTerms] = useState<string[]>([]);
  const [desc, setDesc] = useState('');

  const toggle = (t: string) =>
    setTerms((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.soon}>
        <Icon name="schedule" size={18} color={c.secondary} />
        <Text style={[type.bodySm, { color: c.onSurface, flex: 1 }]}>
          Team requests are coming soon. You can plan one here, but nothing is posted yet.
        </Text>
      </View>

      <Card>
        <Label text="What’s the project?" count={[title.length, MAX_TITLE]} />
        <InputRow icon="groups">
          <TextInput
            value={title}
            onChangeText={(v) => setTitle(applyRule('text', v).value)}
            maxLength={MAX_TITLE}
            placeholder="Like: Wedding for 300 guests"
            placeholderTextColor={c.outline}
            style={[type.bodyMd, styles.input]}
            accessibilityLabel="Project"
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
          <InputRow icon="category">
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
                <Text style={[type.bodyMd, { color: opt === category ? c.primary : c.onSurface }]}>
                  {opt}
                </Text>
                {opt === category && <Icon name="check" size={16} color={c.primary} />}
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Label text="Where is it?" count={[location.length, MAX_PLACE]} />
        <InputRow icon="location-on">
          <TextInput
            value={location}
            onChangeText={(v) => setLocation(applyRule('place', v).value)}
            maxLength={MAX_PLACE}
            placeholder="Like Kaduna or Lagos"
            placeholderTextColor={c.outline}
            style={[type.bodyMd, styles.input]}
            accessibilityLabel="City"
          />
        </InputRow>
      </Card>

      <Card>
        <Label text="Who do you need?" count={[roles.length, MAX_ROLES]} />
        <InputRow icon="group-add">
          <TextInput
            value={roles}
            onChangeText={(v) => setRoles(applyRule('text', v).value)}
            maxLength={MAX_ROLES}
            placeholder="Like: 2 assistant chefs, 3 kitchen helpers"
            placeholderTextColor={c.outline}
            style={[type.bodyMd, styles.input]}
            accessibilityLabel="Who do you need"
          />
        </InputRow>
      </Card>

      <Card>
        <Label text="Pay per person" right={`${naira(pay)} a day`} />
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
        </View>
      </Card>

      <Card>
        <Label text="How long, and what’s included" />
        <View style={styles.tags}>
          {TEAM_TERMS.map((t) => {
            const on = terms.includes(t);
            return (
              <Pressable
                key={t}
                onPress={() => toggle(t)}
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
                  style={[type.labelSm, { color: on ? c.onPrimaryContainer : c.onSurfaceVariant }]}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <Label text="Anything else they should know?" count={[desc.length, MAX_DESC]} />
        <TextInput
          value={desc}
          onChangeText={(v) => setDesc(applyRule('text', v).value.slice(0, MAX_DESC))}
          multiline
          maxLength={MAX_DESC}
          placeholder="Dates, times, what to bring..."
          placeholderTextColor={c.outline}
          style={[type.bodyMd, styles.textarea]}
          accessibilityLabel="Description"
        />
      </Card>

      <Pressable
        onPress={() =>
          Alert.alert('Coming soon', 'Team requests are coming soon. Nothing has been posted.')
        }
        accessibilityRole="button"
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <Gradient colors={gradients.cta} style={[styles.publish, glow('primary')]}>
          <Icon name="groups" size={20} color={c.white} />
          <Text style={[type.labelLg, { color: c.white }]}>Post team request</Text>
        </Gradient>
      </Pressable>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={[styles.card, shadow('md')]}>{children}</View>;
}

function Label({
  text,
  right,
  count,
}: {
  text: string;
  right?: string;
  /** [characters used, limit] */
  count?: [number, number];
}) {
  return (
    <View style={styles.label}>
      <Text style={[type.labelMd, { color: c.onSurfaceVariant, flexShrink: 1 }]}>{text}</Text>
      {right && <Text style={[type.labelMd, { color: c.primary }]}>{right}</Text>}
      {count && <CharCount length={count[0]} max={count[1]} />}
    </View>
  );
}

function InputRow({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <View style={styles.inputRow}>
      <Icon name={icon} size={20} color={c.secondary} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  soon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: alpha(c.secondary, 0.3),
    backgroundColor: alpha(c.secondary, 0.08),
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
  sliderBox: {
    backgroundColor: c.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radii.card,
  },
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
  publish: {
    paddingVertical: 16,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
