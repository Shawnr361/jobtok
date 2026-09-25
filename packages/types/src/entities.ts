// Public shapes returned by the API. Server-only fields (password_hash etc.) never appear here.
import type {
  ActiveMode,
  ApplicationStatus,
  EmploymentType,
  PostType,
  SalaryPeriod,
  UserRole,
  WorkArrangement,
} from './enums.js';

export type ISODateString = string;

export interface Verification {
  phone: boolean;
  email: boolean;
  id: boolean;
  business: boolean;
}

export interface User {
  id: string;
  email: string | null;
  /** E.164. Null until the user verifies a phone number (required before using the product). */
  phone: string | null;
  role: UserRole;
  activeMode: ActiveMode;
  verification: Verification;
  createdAt: ISODateString;
}

export interface Location {
  city: string | null;
  state: string | null;
  country: string;
}

// Creator profiles live in profile.ts.

export interface EmployerProfile {
  id: string;
  userId: string;
  companyName: string | null;
  companyLogoUrl: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  description: string | null;
  location: Location;
  isVerified: boolean;
}

export interface Post {
  id: string;
  userId: string;
  type: PostType;
  title: string | null;
  description: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  location: Omit<Location, 'country'>;
  createdAt: ISODateString;
}

export interface Job {
  id: string;
  employerId: string;
  postId: string | null;
  title: string;
  description: string;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
    period: SalaryPeriod;
  };
  location: Location;
  experienceRequired: number | null;
  openings: number;
  applicationDeadline: string | null;
  isActive: boolean;
  createdAt: ISODateString;
}

export interface Application {
  id: string;
  jobId: string;
  applicantId: string;
  status: ApplicationStatus;
  coverMessage: string | null;
  attachedCvUrl: string | null;
  attachedPostIds: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
