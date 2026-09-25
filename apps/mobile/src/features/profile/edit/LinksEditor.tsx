import { PROFILE_LIMITS, type ProfileLink } from '@jobtok/types';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/primitives';
import { Button, ErrorText, Field } from '../../../components/ui';
import { errorMessage, useAuth } from '../../../lib/auth/AuthProvider';
import { profileApi } from '../../../lib/profile/profileApi';
import { c, radii, type } from '../../../theme';

/** Links to work people have shown elsewhere. Saved straight away. */
export function LinksEditor({
  links,
  onChange,
}: {
  links: ProfileLink[];
  onChange: (links: ProfileLink[]) => void;
}) {
  const { getAccessToken } = useAuth();
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ProfileLink[]>) {
    setBusy(true);
    setError(null);
    try {
      onChange(await action());
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const ok = await run(
      async () =>
        (await profileApi.addLink(await getAccessToken(), { label: label.trim(), url: url.trim() }))
          .links,
    );
    if (ok) {
      setLabel('');
      setUrl('');
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {links.map((l) => (
        <View key={l.id} style={styles.item}>
          <Icon name="link" size={18} color={c.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[type.labelMd, { color: c.onSurface }]}>{l.label}</Text>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {l.url}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              void run(
                async () => (await profileApi.removeLink(await getAccessToken(), l.id)).links,
              )
            }
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${l.label}`}
            hitSlop={8}
          >
            <Icon name="close" size={18} color={c.outline} />
          </Pressable>
        </View>
      ))}

      {links.length < PROFILE_LIMITS.links && (
        <>
          <Field
            label="What is it?"
            value={label}
            onChangeText={setLabel}
            placeholder="Like Instagram, Behance or My website"
            maxLength={PROFILE_LIMITS.linkLabel}
          />
          <Field
            label="Link"
            icon="link"
            value={url}
            onChangeText={setUrl}
            placeholder="instagram.com/yourname"
            rule="noSpaces"
            maxLength={PROFILE_LIMITS.url}
            counter={false}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Button
            label="Add link"
            variant="secondary"
            onPress={() => void add()}
            loading={busy}
            disabled={!label.trim() || !url.trim()}
          />
        </>
      )}
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.card,
    backgroundColor: c.surfaceContainer,
  },
});
