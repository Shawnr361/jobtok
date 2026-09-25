import { AVAILABILITY_OPTIONS, PROFILE_LIMITS as L, USERNAME_PATTERN } from '@jobtok/types';
import { z } from 'zod';

// Control characters are never useful in profile text; newlines are allowed only in long text.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Single-line text: trimmed, inner whitespace collapsed. Empty becomes null (clears it). */
export function line(max: number, label: string) {
  return z
    .string()
    .transform((v) => v.replace(CONTROL, '').replace(/\s+/g, ' ').trim())
    .pipe(z.string().max(max, `${label} can be up to ${max} characters`))
    .transform((v) => (v === '' ? null : v));
}

/** Multi-line text: trimmed, at most two blank lines in a row. Empty becomes null. */
export function paragraph(max: number, label: string) {
  return z
    .string()
    .transform((v) =>
      v
        .replace(/\r\n?/g, '\n')
        .replace(CONTROL, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .pipe(z.string().max(max, `${label} can be up to ${max} characters`))
    .transform((v) => (v === '' ? null : v));
}

// Letters from any Latin-script language, including Yoruba, Igbo and Hausa marks. The app
// filters typing with the same sets (apps/mobile/src/lib/input/rules.ts); this is the guarantee.
const LETTERS = 'A-Za-z\u00C0-\u024F\u0253\u0257\u01B4\u1E00-\u1EFF\u0300-\u036F';
// The combining tone marks (U+0300–036F) are allowed on purpose: "Adéèyọ̀" is typed with them.
/* eslint-disable no-misleading-character-class */
const NAME_CHARS = new RegExp(`^[${LETTERS} '’-]+$`);
const DISPLAY_NAME_CHARS = new RegExp(`^[${LETTERS}0-9 '’&.,-]+$`);
const PLACE_CHARS = new RegExp(`^[${LETTERS} '’.-]+$`);
/* eslint-enable no-misleading-character-class */

/** Single-line text limited to a character set (after tidying). */
function charset(max: number, label: string, pattern: RegExp, allowed: string) {
  return line(max, label).refine(
    (v) => v === null || pattern.test(v),
    `${label} can only use ${allowed}`,
  );
}

export const personName = (max: number, label: string) =>
  charset(max, label, NAME_CHARS, 'letters, spaces, hyphens and apostrophes');
export const placeName = (max: number, label: string) =>
  charset(max, label, PLACE_CHARS, 'letters, spaces, dots, hyphens and apostrophes');

/**
 * Handles no one can pick for themselves: they would read like official JobTok accounts,
 * collide with routes, or belong to the founder (@kenny, assigned by `npm run founder`).
 */
const RESERVED_USERNAMES = new Set([
  'me',
  'admin',
  'administrator',
  'api',
  'jobtok',
  'support',
  'help',
  'settings',
  'profile',
  'profiles',
  'skills',
  'official',
  'moderator',
  'staff',
  'team',
  'root',
  'system',
  'security',
  'founder',
  'ceo',
  'null',
  'undefined',
  'username_check',
  'username-check',
  'kenny',
]);

export const USERNAME_FORMAT_MESSAGE = `Usernames are ${L.usernameMin}-${L.usernameMax} characters: letters, numbers, dots and underscores`;

/** Trimmed, lowercase, without a leading @ (people often type it). */
export const normalizeUsername = (v: string) => v.trim().replace(/^@+/, '').toLowerCase();

/** Reserved words, and anything posing as JobTok itself (jobtok.help, the_jobtok_team…). */
export const isReservedUsername = (v: string) =>
  RESERVED_USERNAMES.has(v) || v.replace(/[._]/g, '').includes('jobtok');

export const username = z
  .string()
  .transform(normalizeUsername)
  .refine((v) => USERNAME_PATTERN.test(v), USERNAME_FORMAT_MESSAGE)
  .refine((v) => !isReservedUsername(v), 'That username isn’t available');

export const usernameCheckSchema = z.object({ username: z.string().max(100) });

/**
 * Public web link: http(s) only, a real-looking host, no embedded credentials.
 * Links are only ever displayed, never fetched by the server.
 */
export const webUrl = z
  .string()
  .trim()
  .max(L.url, `Links can be up to ${L.url} characters`)
  .transform((v, ctx) => {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid link, like https://example.com' });
      return z.NEVER;
    }
    const host = url.hostname;
    const bad =
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username !== '' ||
      url.password !== '' ||
      !host.includes('.') ||
      host === 'localhost' ||
      /^[\d.]+$/.test(host) ||
      host.startsWith('[');
    if (bad) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid link, like https://example.com' });
      return z.NEVER;
    }
    return url.toString();
  })
  .pipe(z.string().max(L.url, `Links can be up to ${L.url} characters`));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-09-24')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Use a real date');

export const profileUpdateSchema = z
  .object({
    username: username.optional(),
    displayName: charset(
      L.displayName,
      'Your name',
      DISPLAY_NAME_CHARS,
      "letters, numbers, spaces and & . , ' -",
    )
      .nullable()
      .optional(),
    firstName: personName(L.firstName, 'First name').nullable().optional(),
    lastName: personName(L.lastName, 'Last name').nullable().optional(),
    headline: line(L.headline, 'What you do').nullable().optional(),
    bio: paragraph(L.bio, 'Your bio').nullable().optional(),
    city: placeName(L.city, 'City').nullable().optional(),
    region: placeName(L.region, 'Region').nullable().optional(),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'Use a two-letter country code')
      .optional(),
    availability: z.enum(AVAILABILITY_OPTIONS).nullable().optional(),
  })
  .strict();

/** Add an existing skill by id, or add one by name (reused if it already exists). */
export const addSkillSchema = z.union([
  z.object({ skillId: z.uuid('Pick a skill from the list') }).strict(),
  z
    .object({
      name: line(L.skillName, 'Skill').pipe(z.string('Type a skill name').min(2, 'Type a skill')),
      categorySlug: z.string().trim().max(60).optional(),
    })
    .strict(),
]);

export const addLinkSchema = z
  .object({
    label: line(L.linkLabel, 'Label').pipe(z.string('Add a label, like Instagram').min(1)),
    url: webUrl,
  })
  .strict();

const projectFields = {
  title: line(L.projectTitle, 'Title').pipe(z.string('Give your project a title').min(1)),
  description: paragraph(L.projectDescription, 'Description').nullable().optional(),
  link: webUrl.nullable().optional(),
  projectDate: isoDate.nullable().optional(),
  featured: z.boolean().optional(),
};

export const projectCreateSchema = z.object(projectFields).strict();
export const projectUpdateSchema = z
  .object({ ...projectFields, title: projectFields.title.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const idParam = z.uuid('Not found');

export const skillSearchSchema = z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
