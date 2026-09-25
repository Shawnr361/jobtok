// What each kind of text field accepts. Typing a character a field doesn't allow simply
// doesn't go in, and the field says what it does accept. The API validates again on save.

// Letters from any Latin-script language, including Yoruba, Igbo and Hausa marks (ẹ, ọ, ṣ, ƙ, ɗ,
// tone accents), written without \p{…} so every JS engine understands it.
const LETTERS = 'A-Za-z\\u00C0-\\u024F\\u0253\\u0257\\u01B4\\u1E00-\\u1EFF\\u0300-\\u036F';

export type InputRule =
  /** A person's first or last name: letters, spaces, hyphens, apostrophes. */
  | 'name'
  /** A public name, which can be a business: also numbers, & and dots. */
  | 'displayName'
  /** A city or state: letters, spaces, hyphens, apostrophes, dots. */
  | 'place'
  /** A username: lowercase letters, numbers, dots, underscores. */
  | 'handle'
  /** Digits only (codes). */
  | 'digits'
  /** A phone number: digits, and a leading + if typed. */
  | 'phone'
  /** A web link or email: no spaces. */
  | 'noSpaces'
  /** Free text: anything except invisible control characters. */
  | 'text';

interface Rule {
  /** Characters that are removed as they're typed. */
  strip: RegExp;
  /** Shown when something was removed, so people know what the field takes. */
  hint: string;
  /** Adjusts what's left (e.g. lowercase a username). */
  map?: (v: string) => string;
}

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const RULES: Record<InputRule, Rule> = {
  name: {
    strip: new RegExp(`[^${LETTERS} '’-]`, 'g'),
    hint: 'Letters only, with spaces, hyphens or apostrophes.',
  },
  displayName: {
    strip: new RegExp(`[^${LETTERS}0-9 '’&.,-]`, 'g'),
    hint: "Letters, numbers, spaces and & . , ' - only.",
  },
  place: {
    strip: new RegExp(`[^${LETTERS} '’.-]`, 'g'),
    hint: 'Letters only, like Kaduna or Port Harcourt.',
  },
  handle: {
    strip: /[^a-z0-9._]/g,
    hint: 'Lowercase letters, numbers, dots and underscores only.',
    map: (v) => v.replace(/^@+/, '').toLowerCase(),
  },
  digits: { strip: /\D/g, hint: 'Numbers only.' },
  phone: {
    strip: /[^\d+ ]|(?!^)\+/g,
    hint: 'Numbers only, like 0803 123 4567.',
  },
  noSpaces: { strip: /\s/g, hint: 'No spaces.' },
  text: { strip: CONTROL, hint: 'That character can’t be used here.' },
};

/** Cleans typed text for a field. `rejected` is true when something had to be removed. */
export function applyRule(rule: InputRule, raw: string): { value: string; rejected: boolean } {
  const r = RULES[rule];
  const mapped = r.map ? r.map(raw) : raw;
  const value = mapped.replace(r.strip, '');
  return { value, rejected: value.length < mapped.length };
}

export const ruleHint = (rule: InputRule) => RULES[rule].hint;
