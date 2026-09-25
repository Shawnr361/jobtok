import type { SkillCategory, SkillRef } from '@jobtok/types';
import { PROFILE_LIMITS } from '@jobtok/types';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip, Icon } from '../../../components/primitives';
import { ErrorText, Field } from '../../../components/ui';
import { errorMessage, useAuth } from '../../../lib/auth/AuthProvider';
import { profileApi } from '../../../lib/profile/profileApi';
import { alpha, c, radii, type } from '../../../theme';

/**
 * "What are you good at?" Search the skill taxonomy, browse by category, or add your own.
 * Every change is saved straight away.
 */
export function SkillsEditor({
  skills,
  onChange,
  autoFocus,
}: {
  skills: SkillRef[];
  onChange: (skills: SkillRef[]) => void;
  autoFocus?: boolean;
}) {
  const { getAccessToken } = useAuth();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [results, setResults] = useState<SkillRef[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  // Search as you type (debounced), or list a category when one is picked.
  useEffect(() => {
    const q = query.trim();
    let alive = true;
    const t = setTimeout(
      () => {
        if (!q && !category) {
          setResults([]);
          return;
        }
        setSearching(true);
        profileApi
          .searchSkills(q ? { q, limit: 12 } : { category: category!, limit: 50 })
          .then((r) => alive && setResults(r.skills))
          .catch((err) => alive && setError(errorMessage(err)))
          .finally(() => alive && setSearching(false));
      },
      q ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, category]);

  async function run(key: string, action: () => Promise<SkillRef[]>) {
    setBusy(key);
    setError(null);
    try {
      onChange(await action());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const add = (skill: { skillId: string } | { name: string }) =>
    run('add', async () => {
      const res = await profileApi.addSkill(await getAccessToken(), skill);
      setQuery('');
      return res.skills;
    });
  const remove = (skill: SkillRef) =>
    run(
      skill.id,
      async () => (await profileApi.removeSkill(await getAccessToken(), skill.id)).skills,
    );

  const mine = new Set(skills.map((s) => s.id));
  const typed = query.trim();
  const exact = results.some((r) => r.name.toLowerCase() === typed.toLowerCase());
  const full = skills.length >= PROFILE_LIMITS.skills;

  return (
    <View style={{ gap: 12 }}>
      {skills.length > 0 ? (
        <View style={styles.wrap}>
          {skills.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => void remove(s)}
              disabled={busy !== null}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${s.name}`}
              style={styles.mine}
            >
              <Text style={[type.labelMd, { color: c.onPrimaryContainer }]}>{s.name}</Text>
              {busy === s.id ? (
                <ActivityIndicator size="small" color={c.onPrimaryContainer} />
              ) : (
                <Icon name="close" size={14} color={c.onPrimaryContainer} />
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
          Pick a few things you do really well. You can change them any time.
        </Text>
      )}

      {full ? (
        <Text style={[type.bodySm, { color: c.outline }]}>
          That’s {PROFILE_LIMITS.skills} skills, the most a profile can show. Remove one to add
          another.
        </Text>
      ) : (
        <>
          <Field
            label="Find a skill"
            icon="search"
            value={query}
            onChangeText={setQuery}
            placeholder="Like welding, catering or UI design"
            maxLength={PROFILE_LIMITS.skillName}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            autoFocus={autoFocus}
          />

          {!typed && (
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
          )}

          {searching && <ActivityIndicator color={c.primary} />}
          {(typed || category) && (
            <View style={styles.wrap}>
              {results
                .filter((r) => !mine.has(r.id))
                .map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => void add({ skillId: r.id })}
                    disabled={busy !== null}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${r.name}`}
                    style={styles.option}
                  >
                    <Icon name="add" size={14} color={c.secondary} />
                    <Text style={[type.labelMd, { color: c.onSurface }]}>{r.name}</Text>
                  </Pressable>
                ))}
              {typed.length >= 2 && !exact && !searching && (
                <Pressable
                  onPress={() => void add({ name: typed })}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  style={[styles.option, styles.custom]}
                >
                  <Icon name="add-circle-outline" size={14} color={c.primary} />
                  <Text style={[type.labelMd, { color: c.primary }]}>Add “{typed}”</Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 6 },
  mine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: c.primaryContainer,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: c.surfaceContainerHigh,
  },
  custom: { backgroundColor: alpha(c.primary, 0.12) },
});
