// Domain enums shared by mobile, web and api. Values match the database columns in the spec (Part 4).

export const USER_ROLES = ['seeker', 'employer', 'both', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** The mode a user is currently acting in. One account, two capabilities. */
export const ACTIVE_MODES = ['seeker', 'employer'] as const;
export type ActiveMode = (typeof ACTIVE_MODES)[number];

export const POST_TYPES = ['showcase', 'job', 'service', 'company', 'project'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'freelance',
  'gig',
  'internship',
  'local_service',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_ARRANGEMENTS = ['on_site', 'hybrid', 'remote'] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export const SALARY_PERIODS = ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'fixed'] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const APPLICATION_STATUSES = [
  'applied',
  'reviewing',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Spec (PRD 3.4): APPLIED → REVIEWING → SHORTLISTED → INTERVIEW → OFFER → HIRED / REJECTED.
 * Each stage advances one step; any non-final stage can be rejected. HIRED and REJECTED are final.
 * The database enforces the same table (trigger `applications_enforce_status_transition`).
 */
export const APPLICATION_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  applied: ['reviewing', 'rejected'],
  reviewing: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: [],
};

export const FINAL_APPLICATION_STATUSES: readonly ApplicationStatus[] = ['hired', 'rejected'];

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}

export const MESSAGE_TYPES = ['text', 'image', 'file', 'job_share', 'profile_share'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type Proficiency = (typeof PROFICIENCY_LEVELS)[number];

export const REPORT_ENTITY_TYPES = ['post', 'job', 'user', 'message', 'comment'] as const;
export type ReportEntityType = (typeof REPORT_ENTITY_TYPES)[number];

export const REPORT_STATUSES = ['pending', 'reviewing', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const LAUNCH_CATEGORIES = [
  { slug: 'digital-tech', name: 'Digital & Tech' },
  { slug: 'skilled-trades', name: 'Skilled Trades' },
  { slug: 'beauty-fashion', name: 'Beauty & Fashion' },
  { slug: 'creative', name: 'Creative' },
  { slug: 'food-hospitality', name: 'Food & Hospitality' },
  { slug: 'professional', name: 'Professional' },
  { slug: 'education', name: 'Education' },
] as const;
export type CategorySlug = (typeof LAUNCH_CATEGORIES)[number]['slug'];

/** Product limits from the spec. */
export const LIMITS = {
  maxVideoSeconds: 60,
  maxVideoHeight: 720,
} as const;
