import { PROFILE_LIMITS, type ProfileProject } from '@jobtok/types';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../../components/primitives';
import { Button, ErrorText, Field } from '../../../components/ui';
import { errorMessage, useAuth } from '../../../lib/auth/AuthProvider';
import { profileApi } from '../../../lib/profile/profileApi';
import { c, radii, type } from '../../../theme';

/** Projects: work you're proud of. Star one to feature it. Saved straight away. */
export function ProjectsEditor({
  projects,
  onChange,
  autoFocus,
}: {
  projects: ProfileProject[];
  onChange: (projects: ProfileProject[]) => void;
  autoFocus?: boolean;
}) {
  const { getAccessToken } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ProfileProject[]>) {
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
        (
          await profileApi.addProject(await getAccessToken(), {
            title: title.trim(),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(link.trim() ? { link: link.trim() } : {}),
          })
        ).projects,
    );
    if (ok) {
      setTitle('');
      setDescription('');
      setLink('');
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {projects.map((p) => (
        <View key={p.id} style={styles.item}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.labelLg, { color: c.onSurface }]}>{p.title}</Text>
            {p.description && (
              <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
                {p.description}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() =>
              void run(
                async () =>
                  (
                    await profileApi.updateProject(await getAccessToken(), p.id, {
                      featured: !p.featured,
                    })
                  ).projects,
              )
            }
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={p.featured ? `Unfeature ${p.title}` : `Feature ${p.title}`}
            accessibilityState={{ selected: p.featured }}
            hitSlop={8}
          >
            <Icon name={p.featured ? 'star' : 'star-border'} size={20} color={c.primary} />
          </Pressable>
          <Pressable
            onPress={() =>
              void run(
                async () => (await profileApi.removeProject(await getAccessToken(), p.id)).projects,
              )
            }
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${p.title}`}
            hitSlop={8}
          >
            <Icon name="close" size={18} color={c.outline} />
          </Pressable>
        </View>
      ))}

      {projects.length < PROFILE_LIMITS.projects && (
        <>
          <Field
            label="Project"
            value={title}
            onChangeText={setTitle}
            placeholder="Like: Catering for a 300-guest wedding"
            maxLength={PROFILE_LIMITS.projectTitle}
            autoFocus={autoFocus}
          />
          <Field
            label="What did you do? (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="The problem, how you did it, how it turned out"
            multiline
            maxLength={PROFILE_LIMITS.projectDescription}
            style={{ minHeight: 72, textAlignVertical: 'top', paddingVertical: 12 }}
          />
          <Field
            label="Link (optional)"
            icon="link"
            value={link}
            onChangeText={setLink}
            placeholder="Photos or a write-up somewhere else"
            rule="noSpaces"
            maxLength={PROFILE_LIMITS.url}
            counter={false}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Button
            label="Add project"
            variant="secondary"
            onPress={() => void add()}
            loading={busy}
            disabled={!title.trim()}
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
