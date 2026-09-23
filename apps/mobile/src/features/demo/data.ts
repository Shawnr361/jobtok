// SAMPLE DATA — UI preview only.
// The feed, explore, talent profile and create-job screens are built ahead of their backends
// (profiles, showcases and jobs arrive in later Phase 1 steps). Everything here comes from the
// Stitch design suite and is replaced by API data when those steps land. Nothing is sent anywhere.
import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '../../components/primitives';

export const DEMO_NOTICE =
  'These are sample profiles for now. Real ones arrive when profiles and video uploads go live.';

export const images = {
  me: require('../../../assets/design/avatar-me.jpg'),
  soundDisc: require('../../../assets/design/sound-disc.jpg'),
  studioDesk: require('../../../assets/design/studio-desk.jpg'),
  josh: {
    avatar: require('../../../assets/design/josh-avatar.jpg'),
    cover: require('../../../assets/design/josh-cover.jpg'),
  },
  emeka: {
    avatar: require('../../../assets/design/emeka-avatar.jpg'),
    cover: require('../../../assets/design/emeka-cover.jpg'),
  },
  precious: {
    avatar: require('../../../assets/design/precious-avatar.jpg'),
    cover: require('../../../assets/design/precious-cover.jpg'),
  },
  amina: {
    avatar: require('../../../assets/design/amina-avatar.jpg'),
    cover: require('../../../assets/design/amina-editor-cover.jpg'),
  },
  tunde: {
    avatar: require('../../../assets/design/tunde-avatar.jpg'),
    cover: require('../../../assets/design/tunde-cover.jpg'),
  },
  pitches: {
    mockups: require('../../../assets/design/amina-pitch-mockups.jpg'),
    fintech: require('../../../assets/design/amina-fintech-figma.jpg'),
    designSystem: require('../../../assets/design/amina-design-system.jpg'),
    reel: require('../../../assets/design/amina-reel-edit.jpg'),
    podcast: require('../../../assets/design/amina-podcast.jpg'),
  },
} satisfies Record<string, unknown>;

export type Tone = 'primary' | 'secondary' | 'tertiary' | 'neutral';

export interface Skill {
  label: string;
  tone: Tone;
  icon?: IconName;
}

export interface Pitch {
  title: string;
  duration: string;
  views: string;
  image: ImageSourcePropType;
}

export interface Talent {
  id: string;
  name: string;
  handle: string;
  role: string;
  roleTone: 'primary' | 'secondary';
  verifiedTone: 'primary' | 'secondary';
  location: string;
  bio: string;
  avatar: ImageSourcePropType;
  cover: ImageSourcePropType;
  /** Explore card media label (e.g. "Video Resume") and its dot colour. */
  mediaLabel: string;
  mediaDot: string;
  badge: { label: string; color: string };
  skills: Skill[];
  cta: { label: string; icon: IconName; tone: 'primary' | 'secondary' };
  /** Explore filter tags. */
  tags: string[];
  // Feed overlay
  feed: {
    kind: string;
    kindIcon: IconName;
    rate?: string;
    pitch: string;
    availability: string;
    sound: string;
    match: number;
    likes: string;
    comments: string;
    saves: string;
    shares: string;
  };
  // Profile
  headline: string;
  status: string;
  stats: { followers: string; following: string; views: string; rating: string; reviews: number };
  verifiedSkills: Skill[];
  pitches: Pitch[];
  caseStudies: {
    kicker: string;
    title: string;
    tag: string;
    summary: string;
    meta: string;
    tone: Tone;
  }[];
  reviews: { initials: string; name: string; company: string; quote: string; meta: string }[];
}

const common = {
  pitches: [] as Pitch[],
  caseStudies: [] as Talent['caseStudies'],
  reviews: [] as Talent['reviews'],
};

export const talents: Talent[] = [
  {
    ...common,
    id: 'josh',
    name: 'Josh Akindele',
    handle: '@josh_techworks',
    role: 'Carpenter & Woodworker',
    roleTone: 'secondary',
    verifiedTone: 'primary',
    location: 'Lagos, Nigeria',
    bio: 'Carpentry & woodwork, 5+ years experience. I build bespoke dining sets, renovate luxury cabinetry, and fabricate custom studio furniture.',
    avatar: images.josh.avatar,
    cover: images.josh.cover,
    mediaLabel: 'Workshop Reel',
    mediaDot: '#4cd7f6',
    badge: { label: '5+ yrs exp', color: '#4cd7f6' },
    skills: [
      { label: 'Carpentry', tone: 'neutral' },
      { label: 'Cabinetry', tone: 'neutral' },
      { label: 'Joinery', tone: 'primary' },
      { label: 'Furniture', tone: 'secondary' },
    ],
    cta: { label: 'View Profile', icon: 'arrow-forward', tone: 'primary' },
    tags: ['For You', 'Skilled Trade', 'Freelance'],
    feed: {
      kind: 'Skilled Worker',
      kindIcon: 'handyman',
      rate: '$35/hr',
      pitch:
        "Carpentry & woodwork, 5+ years experience. I build bespoke dining sets, renovate luxury cabinetry, and fabricate custom studio furniture. Let's build together! 🔨✨",
      availability: 'Available for Hire',
      sound: 'Original Sound • Workshop ASMR & Acoustic Grooves',
      match: 98,
      likes: '12.4K',
      comments: '842',
      saves: '1.2K',
      shares: '3.6K',
    },
    headline: 'Master carpenter | Bespoke furniture, cabinetry & studio fit-outs across Lagos.',
    status: 'Available for Hire',
    stats: { followers: '21.8K', following: '96', views: '240K', rating: '4.8', reviews: 31 },
    verifiedSkills: [
      { label: 'Carpentry', tone: 'secondary', icon: 'handyman' },
      { label: 'Cabinetry', tone: 'primary', icon: 'widgets' },
      { label: 'Finishing', tone: 'neutral', icon: 'auto-fix-high' },
    ],
  },
  {
    ...common,
    id: 'emeka',
    name: 'Emeka Digital',
    handle: '@emeka_digital',
    role: 'Graphic & Product Designer',
    roleTone: 'primary',
    verifiedTone: 'primary',
    location: 'Lagos, Nigeria',
    bio: 'Creativity meets results. 5+ years experience in branding, mobile UI/UX, and viral social media design. Ready for hire!',
    avatar: images.emeka.avatar,
    cover: images.emeka.cover,
    mediaLabel: 'Video Resume',
    mediaDot: '#4cd7f6',
    badge: { label: '5+ yrs exp', color: '#4cd7f6' },
    skills: [
      { label: 'Design', tone: 'neutral' },
      { label: 'Photoshop', tone: 'neutral' },
      { label: 'Illustrator', tone: 'neutral' },
      { label: 'UI/UX', tone: 'primary' },
      { label: 'Figma', tone: 'secondary' },
    ],
    cta: { label: 'View Profile', icon: 'arrow-forward', tone: 'primary' },
    tags: ['For You', 'Tech & Design', 'Full-time', 'Remote'],
    feed: {
      kind: 'Designer',
      kindIcon: 'design-services',
      rate: '$28/hr',
      pitch:
        'Creativity meets results. 5+ years in branding, mobile UI/UX and viral social design. Here are the three launches I am proudest of.',
      availability: 'Open to Remote',
      sound: 'Original Sound • Studio Lo-fi Session',
      match: 91,
      likes: '8.9K',
      comments: '512',
      saves: '944',
      shares: '1.8K',
    },
    headline: 'Graphic & product designer | Brand systems, mobile UI and social campaigns.',
    status: 'Open to Offers (Remote)',
    stats: { followers: '18.3K', following: '210', views: '97K', rating: '4.9', reviews: 22 },
    verifiedSkills: [
      { label: 'UI/UX Design', tone: 'primary', icon: 'design-services' },
      { label: 'Branding', tone: 'secondary', icon: 'auto-awesome' },
      { label: 'Figma', tone: 'neutral', icon: 'draw' },
    ],
  },
  {
    ...common,
    id: 'precious',
    name: 'Precious Care',
    handle: '@precious_cares',
    role: 'Healthcare Assistant',
    roleTone: 'secondary',
    verifiedTone: 'secondary',
    location: 'Port Harcourt, Nigeria',
    bio: 'Caring, highly professional and ready to help. 3+ years experience in patient care, rehabilitation, and assisted daily living support.',
    avatar: images.precious.avatar,
    cover: images.precious.cover,
    mediaLabel: 'Care Video Pitch',
    mediaDot: '#adc6ff',
    badge: { label: 'Available Now', color: '#adc6ff' },
    skills: [
      { label: 'Patient Care', tone: 'neutral' },
      { label: 'First Aid', tone: 'neutral' },
      { label: 'CPR Certified', tone: 'neutral' },
      { label: 'Senior Care', tone: 'tertiary' },
    ],
    cta: { label: 'Contact / Apply', icon: 'chat', tone: 'secondary' },
    tags: ['For You', 'Full-time'],
    feed: {
      kind: 'Healthcare',
      kindIcon: 'favorite',
      pitch:
        'Caring, highly professional and ready to help. 3+ years in patient care, rehabilitation and assisted daily living support.',
      availability: 'Available Now',
      sound: 'Original Sound • Morning Rounds',
      match: 87,
      likes: '6.1K',
      comments: '301',
      saves: '712',
      shares: '980',
    },
    headline: 'Healthcare assistant | Patient care, rehabilitation and assisted living.',
    status: 'Available Now',
    stats: { followers: '9.4K', following: '143', views: '61K', rating: '5.0', reviews: 17 },
    verifiedSkills: [
      { label: 'Patient Care', tone: 'secondary', icon: 'favorite' },
      { label: 'CPR Certified', tone: 'primary', icon: 'verified-user' },
      { label: 'First Aid', tone: 'neutral', icon: 'check-circle' },
    ],
  },
  {
    id: 'amina',
    name: 'Amina Bello',
    handle: '@amina_creates',
    role: 'Video Editor & Motion Artist',
    roleTone: 'primary',
    verifiedTone: 'primary',
    location: 'Lagos, Nigeria',
    bio: 'Specializing in TikTok/Reels pacing, YouTube documentaries, and color grading. Over 50M organic client views generated.',
    avatar: images.amina.avatar,
    cover: images.amina.cover,
    mediaLabel: '2024 Reel',
    mediaDot: '#d0bcff',
    badge: { label: 'Freelance / FT', color: '#acedff' },
    skills: [
      { label: 'Premiere Pro', tone: 'neutral' },
      { label: 'After Effects', tone: 'neutral' },
      { label: 'Sound Design', tone: 'neutral' },
      { label: 'Color Grading', tone: 'primary' },
    ],
    cta: { label: 'View Reel', icon: 'visibility', tone: 'primary' },
    tags: ['For You', 'Tech & Design', 'Freelance', 'Remote'],
    feed: {
      kind: 'Creative Pro',
      kindIcon: 'movie-edit',
      rate: '$40/hr',
      pitch:
        "Reels pacing, documentary edits and colour grading. My clients' videos have 50M+ organic views. Here's my 60-second showreel.",
      availability: 'Open to Offers',
      sound: 'Original Sound • Showreel Mix 2024',
      match: 94,
      likes: '15.2K',
      comments: '1.1K',
      saves: '2.3K',
      shares: '4.4K',
    },
    headline:
      'Creative Director & Product Designer | 5+ years crafting high-converting brand stories & kinetic digital interfaces.',
    status: 'Open to Offers (Remote & Hybrid)',
    stats: { followers: '34.2K', following: '128', views: '185K', rating: '4.9', reviews: 48 },
    verifiedSkills: [
      { label: 'UI/UX Design', tone: 'primary', icon: 'design-services' },
      { label: 'Branding', tone: 'secondary', icon: 'auto-awesome' },
      { label: 'Figma', tone: 'neutral', icon: 'draw' },
      { label: 'Video Editing', tone: 'secondary', icon: 'movie-edit' },
      { label: 'Motion Graphics', tone: 'primary', icon: 'animation' },
      { label: 'Design Systems', tone: 'neutral', icon: 'widgets' },
    ],
    pitches: [
      {
        title: '60s Elevator Pitch',
        duration: '0:45',
        views: '14.5K',
        image: images.pitches.mockups,
      },
      {
        title: 'Fintech App Redesign',
        duration: '1:20',
        views: '28.1K',
        image: images.pitches.fintech,
      },
      {
        title: 'Design System 2.0',
        duration: '0:32',
        views: '12.4K',
        image: images.pitches.designSystem,
      },
      {
        title: 'Viral Ad Reel breakdown',
        duration: '0:58',
        views: '9.2K',
        image: images.pitches.reel,
      },
      {
        title: 'Why Hire Me (Q&A)',
        duration: '1:45',
        views: '45.7K',
        image: images.pitches.podcast,
      },
    ],
    caseStudies: [
      {
        kicker: 'Featured Project',
        title: 'PayPulse Mobile Wallet',
        tag: 'Fintech',
        summary:
          'Full end-to-end UX architecture and design system for a West African neobank resulting in a 42% boost in onboarding completion.',
        meta: '8 Screen Flows • Prototype Included',
        tone: 'secondary',
      },
      {
        kicker: 'Brand Evolution',
        title: 'Apex Logistics Rebrand',
        tag: 'B2B SaaS',
        summary:
          'Multi-platform rebrand including marketing launch video, design tokens, and web application UI components.',
        meta: 'Visual Identity • Webflow',
        tone: 'primary',
      },
    ],
    reviews: [
      {
        initials: 'TK',
        name: 'Tunde Kupoluyi',
        company: 'CEO, Kora Growth Labs',
        quote:
          '"Amina was recruited via JobTok after we watched her 60-second UX teardown video. Her turnaround speed and visual finesse exceeded all expectations. 10/10 hire!"',
        meta: 'Hired for Contract • 3 weeks ago',
      },
    ],
  },
  {
    ...common,
    id: 'tunde',
    name: 'Tunde Ade',
    handle: '@tunde_builds',
    role: 'Site Supervisor & Builder',
    roleTone: 'secondary',
    verifiedTone: 'secondary',
    location: 'Ibadan, Nigeria',
    bio: 'Hands-on site supervisor with 7+ years delivering commercial and residential developments on-time, strictly adhering to safety standards.',
    avatar: images.tunde.avatar,
    cover: images.tunde.cover,
    mediaLabel: 'On-Site Walkthrough',
    mediaDot: '#acedff',
    badge: { label: 'Certified Pro', color: '#d8e2ff' },
    skills: [
      { label: 'Site Safety', tone: 'neutral' },
      { label: 'Carpentry', tone: 'neutral' },
      { label: 'Project Mgmt', tone: 'neutral' },
      { label: 'Quality Control', tone: 'neutral' },
    ],
    cta: { label: 'Connect', icon: 'handshake', tone: 'primary' },
    tags: ['Skilled Trade', 'Full-time'],
    feed: {
      kind: 'Site Supervisor',
      kindIcon: 'engineering',
      rate: '$1.5K/mo',
      pitch:
        'Seven years running commercial and residential builds. On time, on budget and safety first. Walk the site with me.',
      availability: 'Available for Hire',
      sound: 'Original Sound • Site Walkthrough',
      match: 89,
      likes: '7.7K',
      comments: '403',
      saves: '1.0K',
      shares: '1.2K',
    },
    headline: 'Site supervisor & builder | Commercial and residential developments, safety-first.',
    status: 'Available for Hire',
    stats: { followers: '12.6K', following: '88', views: '133K', rating: '4.8', reviews: 26 },
    verifiedSkills: [
      { label: 'Site Safety', tone: 'secondary', icon: 'verified-user' },
      { label: 'Project Mgmt', tone: 'primary', icon: 'work' },
      { label: 'Quality Control', tone: 'neutral', icon: 'check-circle' },
    ],
  },
];

/** Feed order: the design's hero (Josh) first. */
export const feedTalents = [talents[0]!, talents[3]!, talents[1]!, talents[4]!, talents[2]!];

/** Explore order matches the design. */
export const exploreTalents = talents.filter((t) => t.id !== 'josh');

export function findTalent(id: string | undefined): Talent | undefined {
  return talents.find((t) => t.id === id);
}

export const exploreFilters = [
  'All',
  'Remote',
  'Full-time',
  'Freelance',
  'Skilled Trade',
  'Tech & Design',
];
