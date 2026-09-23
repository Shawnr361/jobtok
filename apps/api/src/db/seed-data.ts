import { createHash } from 'node:crypto';
import type { CategorySlug } from '@jobtok/types';

/** Stable UUID (v5-shaped) derived from a key, so seed rows get the same id on every run. */
export function seedId(key: string): string {
  const h = createHash('sha1').update(`jobtok-seed:${key}`).digest('hex');
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Launch skills per spec category (Part 1 §1 "Launch Categories"). */
export const SKILLS_BY_CATEGORY: Record<CategorySlug, readonly string[]> = {
  'digital-tech': [
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Data Analysis',
    'Digital Marketing',
    'IT Support',
    'Social Media Management',
  ],
  'skilled-trades': [
    'Carpentry',
    'Plumbing',
    'Electrical Installation',
    'Welding & Fabrication',
    'Tiling',
    'Auto Mechanics',
    'Painting & Decorating',
  ],
  'beauty-fashion': [
    'Hairdressing',
    'Barbering',
    'Makeup Artistry',
    'Tailoring',
    'Fashion Design',
    'Nail Technology',
  ],
  creative: [
    'Graphic Design',
    'Photography',
    'Videography',
    'Video Editing',
    'Content Writing',
    'Animation',
  ],
  'food-hospitality': [
    'Catering',
    'Baking & Pastry',
    'Professional Cooking',
    'Event Planning',
    'Bartending',
    'Housekeeping',
  ],
  professional: [
    'Accounting',
    'Customer Service',
    'Sales',
    'Administration',
    'Human Resources',
    'Project Management',
  ],
  education: [
    'Tutoring',
    'Mathematics Teaching',
    'English Teaching',
    'Early Childhood Education',
    'Coding Instruction',
    'Exam Preparation',
  ],
};

/** Development accounts. Phones are valid Nigerian numbers reserved for local data only. */
export const SEED_USERS = {
  admin: { phone: '+2347031110004', email: 'admin@jobtok.test', role: 'admin', mode: 'seeker' },
  ada: { phone: '+2348031110001', email: 'ada@jobtok.test', role: 'seeker', mode: 'seeker' },
  chidi: { phone: '+2348031110002', email: 'chidi@jobtok.test', role: 'both', mode: 'seeker' },
  bola: { phone: '+2349031110003', email: 'bola@jobtok.test', role: 'employer', mode: 'employer' },
} as const;

export const SEED_IDS = {
  user: (key: keyof typeof SEED_USERS) => seedId(`user:${key}`),
  profile: (key: 'ada' | 'chidi') => seedId(`profile:${key}`),
  employer: (key: 'bola' | 'chidi') => seedId(`employer:${key}`),
  adaShowcase: seedId('post:ada-showcase'),
  bolaJobPost: seedId('post:bola-job'),
  bolaJob: seedId('job:bola-site-carpenter'),
  adaPortfolio: seedId('portfolio:ada-kitchen'),
  adaApplication: seedId('application:ada-bola'),
  adaBolaConversation: seedId('conversation:ada-bola'),
};
