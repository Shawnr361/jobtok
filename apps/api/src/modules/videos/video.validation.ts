import {
  CLIENT_INTERACTIONS,
  FEED_TABS,
  VIDEO_LIMITS as L,
  VIDEO_VISIBILITIES,
} from '@jobtok/types';
import { z } from 'zod';
import { line, paragraph, placeName } from '../profiles/profile.validation.js';

/** A short list of trimmed, non-empty, de-duplicated items. */
function list(maxItems: number, maxLength: number, label: string) {
  return z
    .array(line(maxLength, label))
    .max(maxItems, `Add up to ${maxItems}`)
    .transform((items) => [...new Set(items.filter((v): v is string => v !== null))]);
}

const details = {
  caption: line(L.caption, 'Your caption').pipe(
    z.string('Say what you’re showing, like “Building this gate from scratch”').min(1),
  ),
  description: paragraph(L.description, 'The story').nullable().optional(),
  categorySlug: z.string().trim().max(60).nullable().optional(),
  skillIds: z
    .array(z.uuid('Pick skills from the list'))
    .max(L.skills, `Pick up to ${L.skills} skills`)
    .transform((ids) => [...new Set(ids)])
    .optional(),
  city: placeName(L.city, 'City').nullable().optional(),
  region: placeName(L.region, 'Region').nullable().optional(),
  visibility: z.enum(VIDEO_VISIBILITIES).optional(),
  tools: list(L.tools, L.learnItem, 'Each tool').optional(),
  materials: list(L.materials, L.learnItem, 'Each material').optional(),
  tips: list(L.tips, L.tipItem, 'Each tip').optional(),
};

/**
 * Only these fields can come from the client. Owner, status, storage keys, dates, counts and
 * moderation flags are set by the server alone (unknown fields are rejected).
 */
export const createVideoSchema = z.object(details).strict();

export const updateVideoSchema = z
  .object({ ...details, caption: details.caption.optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const interactionSchema = z
  .object({
    type: z.enum(CLIENT_INTERACTIONS),
    watchMs: z
      .number()
      .int()
      .min(0)
      .max(10 * 60_000)
      .optional(),
  })
  .strict();

export const feedQuerySchema = z.object({
  tab: z.enum(FEED_TABS).default('for_you'),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const videoIdParam = z.uuid('We couldn’t find that video.');
