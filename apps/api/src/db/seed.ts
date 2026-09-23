import { COUNTRIES, LAUNCH_CATEGORIES } from '@jobtok/types';
import { transitionApplication } from '../modules/applications/application-status.js';
import { hashPassword } from '../modules/auth/crypto.js';
import type { Db } from './client.js';
import {
  SEED_DEV_PASSWORD,
  SEED_IDS,
  SEED_USERS,
  SKILLS_BY_CATEGORY,
  seedId,
  slugify,
} from './seed-data.js';

export interface SeedSummary {
  countries: number;
  categories: number;
  skills: number;
  users: number;
}

/**
 * Deterministic, idempotent seed. Reference data (countries, categories, skills) is always
 * seeded; `withFixtures` adds a small set of development accounts and content.
 * Running it twice leaves the database unchanged.
 */
export async function seed(db: Db, { withFixtures = true } = {}): Promise<SeedSummary> {
  // Reference data ------------------------------------------------------------
  for (const c of Object.values(COUNTRIES)) {
    const data = {
      name: c.name,
      dialCode: c.dialCode,
      currencyCode: c.currency,
      currencySymbol: c.currencySymbol,
      phonePattern: c.nationalNumberPattern.source,
      isEnabled: c.enabled,
    };
    await db.country.upsert({
      where: { code: c.code },
      create: { code: c.code, ...data },
      update: data,
    });
  }

  let skillCount = 0;
  for (const [index, cat] of LAUNCH_CATEGORIES.entries()) {
    const categoryId = seedId(`category:${cat.slug}`);
    await db.category.upsert({
      where: { slug: cat.slug },
      create: { id: categoryId, slug: cat.slug, name: cat.name, sortOrder: index },
      update: { name: cat.name, sortOrder: index },
    });
    for (const name of SKILLS_BY_CATEGORY[cat.slug]) {
      const slug = slugify(name);
      await db.skill.upsert({
        where: { slug },
        create: { id: seedId(`skill:${slug}`), name, slug, categoryId },
        update: { name, categoryId },
      });
      skillCount++;
    }
  }

  if (withFixtures) await seedFixtures(db);

  return {
    countries: Object.keys(COUNTRIES).length,
    categories: LAUNCH_CATEGORIES.length,
    skills: skillCount,
    users: withFixtures ? Object.keys(SEED_USERS).length : 0,
  };
}

async function seedFixtures(db: Db) {
  const skill = (name: string) => seedId(`skill:${slugify(name)}`);
  const devPasswordHash = await hashPassword(SEED_DEV_PASSWORD);

  for (const [key, u] of Object.entries(SEED_USERS)) {
    const data = {
      phone: u.phone,
      email: u.email,
      role: u.role,
      activeMode: u.mode,
      isPhoneVerified: true,
      isEmailVerified: true,
    };
    await db.user.upsert({
      where: { id: SEED_IDS.user(key as keyof typeof SEED_USERS) },
      // Password set on creation only, so re-seeding never changes it.
      create: {
        id: SEED_IDS.user(key as keyof typeof SEED_USERS),
        ...data,
        passwordHash: devPasswordHash,
      },
      update: data,
    });
  }

  // Job seeker profiles
  const ada = {
    userId: SEED_IDS.user('ada'),
    username: 'ada.builds',
    fullName: 'Ada Okafor',
    headline: 'Carpenter & tiler, 5 years experience',
    bio: 'I build and renovate kitchens, wardrobes and furniture across Lagos.',
    locationCity: 'Ikeja',
    locationState: 'Lagos',
    availability: 'available',
    experienceYears: 5,
  };
  await db.profile.upsert({
    where: { id: SEED_IDS.profile('ada') },
    create: { id: SEED_IDS.profile('ada'), ...ada },
    update: ada,
  });
  const chidi = {
    userId: SEED_IDS.user('chidi'),
    username: 'chidi.designs',
    fullName: 'Chidi Eze',
    headline: 'Brand & UI designer',
    locationCity: 'Enugu',
    locationState: 'Enugu',
    availability: 'freelance',
    experienceYears: 3,
  };
  await db.profile.upsert({
    where: { id: SEED_IDS.profile('chidi') },
    create: { id: SEED_IDS.profile('chidi'), ...chidi },
    update: chidi,
  });

  for (const [profileId, skills] of [
    [SEED_IDS.profile('ada'), ['Carpentry', 'Tiling']],
    [SEED_IDS.profile('chidi'), ['Graphic Design', 'UI/UX Design']],
  ] as const) {
    for (const name of skills) {
      await db.profileSkill.upsert({
        where: { profileId_skillId: { profileId, skillId: skill(name) } },
        create: { profileId, skillId: skill(name), proficiency: 'advanced' },
        update: {},
      });
    }
  }

  // Employer profiles: a company (Bola) and an individual hirer (Chidi, role "both")
  const bolaEmployer = {
    userId: SEED_IDS.user('bola'),
    companyName: 'Bola Build Co.',
    industry: 'Construction',
    companySize: '11-50',
    description: 'Residential construction and renovation in Lagos.',
    locationCity: 'Lekki',
    locationState: 'Lagos',
    isVerified: true,
  };
  await db.employerProfile.upsert({
    where: { id: SEED_IDS.employer('bola') },
    create: { id: SEED_IDS.employer('bola'), ...bolaEmployer },
    update: bolaEmployer,
  });
  const chidiEmployer = {
    userId: SEED_IDS.user('chidi'),
    locationCity: 'Enugu',
    locationState: 'Enugu',
  };
  await db.employerProfile.upsert({
    where: { id: SEED_IDS.employer('chidi') },
    create: { id: SEED_IDS.employer('chidi'), ...chidiEmployer },
    update: chidiEmployer,
  });

  // Showcase post + portfolio (media URLs are object-storage references, never binaries)
  const showcase = {
    userId: SEED_IDS.user('ada'),
    postType: 'showcase' as const,
    title: 'Fitted kitchen build in 45 seconds',
    description: 'Start to finish: measuring, cutting and installing a fitted kitchen.',
    videoUrl: 'https://media.example.com/seed/ada-kitchen/720p.m3u8',
    videoThumbnailUrl: 'https://media.example.com/seed/ada-kitchen/thumb.webp',
    videoDurationSeconds: 45,
    locationCity: 'Ikeja',
    locationState: 'Lagos',
  };
  await db.post.upsert({
    where: { id: SEED_IDS.adaShowcase },
    create: { id: SEED_IDS.adaShowcase, ...showcase },
    update: showcase,
  });
  await db.postTag.upsert({
    where: { postId_skillId: { postId: SEED_IDS.adaShowcase, skillId: skill('Carpentry') } },
    create: { postId: SEED_IDS.adaShowcase, skillId: skill('Carpentry') },
    update: {},
  });
  const portfolio = {
    profileId: SEED_IDS.profile('ada'),
    postId: SEED_IDS.adaShowcase,
    title: 'Lekki fitted kitchen',
    description: 'Full kitchen fit-out for a 3-bedroom flat.',
    imageUrls: ['https://media.example.com/seed/ada-kitchen/after.webp'],
    isPinned: true,
  };
  await db.portfolioItem.upsert({
    where: { id: SEED_IDS.adaPortfolio },
    create: { id: SEED_IDS.adaPortfolio, ...portfolio },
    update: portfolio,
  });

  // Job (video post + structured job data)
  const jobPost = {
    userId: SEED_IDS.user('bola'),
    postType: 'job' as const,
    title: 'Hiring: Site Carpenter',
    videoUrl: 'https://media.example.com/seed/bola-job/720p.m3u8',
    videoThumbnailUrl: 'https://media.example.com/seed/bola-job/thumb.webp',
    videoDurationSeconds: 30,
    locationCity: 'Lekki',
    locationState: 'Lagos',
  };
  await db.post.upsert({
    where: { id: SEED_IDS.bolaJobPost },
    create: { id: SEED_IDS.bolaJobPost, ...jobPost },
    update: jobPost,
  });
  const job = {
    employerId: SEED_IDS.employer('bola'),
    postId: SEED_IDS.bolaJobPost,
    title: 'Site Carpenter',
    description: 'Roofing, formwork and interior finishing on residential sites in Lekki.',
    employmentType: 'full_time' as const,
    workArrangement: 'on_site' as const,
    salaryMin: 150000,
    salaryMax: 250000,
    salaryCurrency: 'NGN',
    salaryPeriod: 'monthly' as const,
    locationCity: 'Lekki',
    locationState: 'Lagos',
    experienceRequired: 2,
    openings: 2,
  };
  await db.job.upsert({
    where: { id: SEED_IDS.bolaJob },
    create: { id: SEED_IDS.bolaJob, ...job },
    update: job,
  });
  await db.jobSkill.upsert({
    where: { jobId_skillId: { jobId: SEED_IDS.bolaJob, skillId: skill('Carpentry') } },
    create: { jobId: SEED_IDS.bolaJob, skillId: skill('Carpentry') },
    update: {},
  });

  // Visual application: Ada applies with her showcase + portfolio, Bola moves it to reviewing
  const existing = await db.application.findUnique({ where: { id: SEED_IDS.adaApplication } });
  if (!existing) {
    await db.application.create({
      data: {
        id: SEED_IDS.adaApplication,
        jobId: SEED_IDS.bolaJob,
        applicantId: SEED_IDS.profile('ada'),
        coverMessage: 'I have 5 years of site and interior carpentry experience.',
        attachedPortfolioId: SEED_IDS.adaPortfolio,
        attachedPostIds: [SEED_IDS.adaShowcase],
      },
    });
    await transitionApplication(db, SEED_IDS.adaApplication, 'reviewing', SEED_IDS.user('bola'));
  }

  // Conversation unlocked by the application
  const [p1, p2] = [SEED_IDS.user('ada'), SEED_IDS.user('bola')].sort() as [string, string];
  await db.conversation.upsert({
    where: { id: SEED_IDS.adaBolaConversation },
    create: {
      id: SEED_IDS.adaBolaConversation,
      applicationId: SEED_IDS.adaApplication,
      participantOne: p1,
      participantTwo: p2,
    },
    update: {},
  });
  const messages = [
    { key: 'm1', senderId: SEED_IDS.user('bola'), content: 'Hi Ada, loved the kitchen video.' },
    { key: 'm2', senderId: SEED_IDS.user('ada'), content: 'Thank you! Happy to discuss the role.' },
  ];
  for (const [i, m] of messages.entries()) {
    await db.message.upsert({
      where: { id: seedId(`message:ada-bola:${m.key}`) },
      create: {
        id: seedId(`message:ada-bola:${m.key}`),
        conversationId: SEED_IDS.adaBolaConversation,
        senderId: m.senderId,
        content: m.content,
        createdAt: new Date(Date.UTC(2026, 0, 1, 9, i)),
      },
      update: {},
    });
  }

  // Interactions & notifications
  await db.follow.upsert({
    where: {
      followerId_followingId: {
        followerId: SEED_IDS.user('bola'),
        followingId: SEED_IDS.user('ada'),
      },
    },
    create: { followerId: SEED_IDS.user('bola'), followingId: SEED_IDS.user('ada') },
    update: {},
  });
  await db.save.upsert({
    where: { userId_postId: { userId: SEED_IDS.user('bola'), postId: SEED_IDS.adaShowcase } },
    create: { userId: SEED_IDS.user('bola'), postId: SEED_IDS.adaShowcase },
    update: {},
  });
  await db.notification.upsert({
    where: { id: seedId('notification:bola-new-application') },
    create: {
      id: seedId('notification:bola-new-application'),
      userId: SEED_IDS.user('bola'),
      type: 'application_received',
      title: 'New application',
      body: 'Ada Okafor applied for Site Carpenter.',
      entityType: 'application',
      entityId: SEED_IDS.adaApplication,
    },
    update: {},
  });
}
