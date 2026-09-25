import { VIDEO_LIMITS, type SkillRef } from '@jobtok/types';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/primitives';
import { Field } from '../../components/ui';
import { profileApi } from '../../lib/profile/profileApi';
import { c, radii, type } from '../../theme';

/**
 * Tag a video with skills from JobTok's skill list (the same taxonomy profiles use).
 * Shows the chosen category's skills until you search.
 */
export function SkillPicker({
  value,
  onChange,
  categorySlug,
}: {
  value: SkillRef[];
  onChange: (skills: SkillRef[]) => void;
  categorySlug: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SkillRef[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    let alive = true;
    const t = setTimeout(
      () => {
        if (!q && !categorySlug) {
          setResults([]);
          return;
        }
        setLoading(true);
        profileApi
          .searchSkills(q ? { q, limit: 12 } : { category: categorySlug!, limit: 30 })
          .then((r) => alive && setResults(r.skills))
          .catch(() => alive && setResults([]))
          .finally(() => alive && setLoading(false));
      },
      q ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, categorySlug]);

  const chosen = new Set(value.map((s) => s.id));
  const full = value.length >= VIDEO_LIMITS.skills;

  return (
    <View style={{ gap: 10 }}>
      {value.length > 0 && (
        <View style={styles.wrap}>
          {value.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onChange(value.filter((x) => x.id !== s.id))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${s.name}`}
              style={[styles.chip, styles.on]}
            >
              <Text style={[type.labelMd, { color: c.onPrimaryContainer }]}>{s.name}</Text>
              <Icon name="close" size={14} color={c.onPrimaryContainer} />
            </Pressable>
          ))}
        </View>
      )}
      {full ? (
        <Text style={[type.bodySm, { color: c.outline }]}>
          That’s {VIDEO_LIMITS.skills} skills, the most a video can have.
        </Text>
      ) : (
        <>
          <Field
            label="Skills in this video (optional)"
            icon="search"
            value={query}
            onChangeText={setQuery}
            placeholder="Like welding, tailoring or baking"
            maxLength={60}
            counter={false}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading && <ActivityIndicator color={c.primary} />}
          <View style={styles.wrap}>
            {results
              .filter((r) => !chosen.has(r.id))
              .map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    onChange([...value, r]);
                    setQuery('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${r.name}`}
                  style={[styles.chip, styles.off]}
                >
                  <Icon name="add" size={14} color={c.secondary} />
                  <Text style={[type.labelMd, { color: c.onSurface }]}>{r.name}</Text>
                </Pressable>
              ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  on: { backgroundColor: c.primaryContainer },
  off: { backgroundColor: c.surfaceContainerHigh },
});
