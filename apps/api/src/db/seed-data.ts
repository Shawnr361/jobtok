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

/**
 * Curated starter skills per category: things people do, make, build, teach and create.
 * People can add their own skills too (stored uncurated). Names must be unique across the list.
 */
export const SKILLS_BY_CATEGORY: Record<CategorySlug, readonly string[]> = {
  technology: [
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Data Analysis',
    'IT Support',
    'Cybersecurity',
  ],
  engineering: ['Solar Installation', 'CAD Design', 'Prototyping', 'Robotics', 'Civil Engineering'],
  'build-and-make': ['Carpentry', 'Furniture Making', 'Metalwork', 'Upholstery', '3D Printing'],
  'skilled-trades': [
    'Plumbing',
    'Electrical Installation',
    'Welding & Fabrication',
    'Tiling',
    'Painting & Decorating',
    'Air Conditioning Repair',
  ],
  food: ['Professional Cooking', 'Catering', 'Baking & Pastry', 'Small Chops', 'Bartending'],
  fashion: ['Tailoring', 'Fashion Design', 'Shoemaking', 'Pattern Making'],
  beauty: ['Hairdressing', 'Barbering', 'Makeup Artistry', 'Nail Technology', 'Hair Braiding'],
  creative: ['Graphic Design', 'Animation', 'Content Writing', 'Music Production'],
  photography: ['Photography', 'Photo Editing', 'Product Photography'],
  videography: ['Videography', 'Video Editing', 'Colour Grading'],
  art: ['Painting', 'Drawing & Illustration', 'Sculpture', 'Calligraphy'],
  agriculture: ['Crop Farming', 'Poultry Farming', 'Fish Farming', 'Greenhouse Farming'],
  business: [
    'Digital Marketing',
    'Social Media Management',
    'Sales',
    'Accounting',
    'Event Planning',
    'Customer Service',
  ],
  education: [
    'Tutoring',
    'Mathematics Teaching',
    'English Teaching',
    'Coding Instruction',
    'Exam Preparation',
  ],
  science: ['Laboratory Work', 'Research', 'Science Communication'],
  automotive: ['Auto Mechanics', 'Auto Electrics', 'Panel Beating', 'Car Detailing'],
  electronics: ['Phone Repair', 'Electronics Repair', 'Inverter Installation', 'CCTV Installation'],
  'home-and-construction': ['Masonry', 'Roofing', 'Interior Design', 'POP Ceilings', 'Landscaping'],
  crafts: ['Beadwork', 'Leatherwork', 'Pottery', 'Weaving', 'Adire Tie-Dye'],
  'health-and-care': ['Caregiving', 'First Aid', 'Fitness Training', 'Nutrition Coaching'],
  'lifestyle-skills': ['Home Cleaning', 'Home Organising', 'Gardening', 'Childcare'],
  'african-culture': [
    'Traditional Drumming',
    'Cultural Dance',
    'Storytelling',
    'Traditional Attire',
  ],
};

/** DEVELOPMENT ONLY password for the seed accounts below (local databases only). */
export const SEED_DEV_PASSWORD = 'jobtok-dev-password';

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
