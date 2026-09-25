// SAMPLE DATA: UI preview only.
// The feed, explore, creator profile and create screens are built ahead of their backends
// (profiles, videos and projects arrive in later Phase 1 steps). Everything here is replaced by
// API data when those steps land. Nothing is sent anywhere.
import type { ImageSourcePropType } from 'react-native';
import type { IconName } from '../../components/primitives';

export const DEMO_NOTICE =
  'These are sample creators for now. Real ones arrive when video uploads go live.';

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
  works: {
    mockups: require('../../../assets/design/amina-pitch-mockups.jpg'),
    fintech: require('../../../assets/design/amina-fintech-figma.jpg'),
    designSystem: require('../../../assets/design/amina-design-system.jpg'),
    reel: require('../../../assets/design/amina-reel-edit.jpg'),
    podcast: require('../../../assets/design/amina-podcast.jpg'),
  },
} satisfies Record<string, unknown>;

/** Content categories: practical skills and creativity. */
export const CATEGORIES = [
  'Build & Make',
  'Skilled Trades',
  'Food',
  'Fashion',
  'Beauty',
  'Technology',
  'Engineering',
  'Creative',
  'Art',
  'Photography',
  'Videography',
  'Agriculture',
  'Automotive',
  'Electronics',
  'Home & Construction',
  'Crafts',
  'Health & Care',
  'Business',
  'Education',
  'Science',
  'Lifestyle Skills',
  'African Culture',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const exploreFilters = ['All', ...CATEGORIES] as const;

export type Tone = 'primary' | 'secondary' | 'tertiary' | 'neutral';

export interface Skill {
  label: string;
  tone: Tone;
  icon?: IconName;
}

/** A video on a creator's profile. */
export interface Work {
  title: string;
  duration: string;
  views: string;
  image: ImageSourcePropType;
}

/** Optional "Learn this" breakdown under a video. Keep it short. */
export interface Learn {
  tools: string[];
  materials?: string[];
  steps?: string[];
  tips: string[];
}

export interface Talent {
  id: string;
  name: string;
  handle: string;
  role: string;
  roleTone: 'primary' | 'secondary';
  verifiedTone: 'primary' | 'secondary';
  /** City level only. Never a precise address. */
  location: string;
  city: string;
  category: Category;
  bio: string;
  avatar: ImageSourcePropType;
  cover: ImageSourcePropType;
  /** Explore card media label (e.g. "Build video") and its dot colour. */
  mediaLabel: string;
  mediaDot: string;
  badge: { label: string; color: string };
  skills: Skill[];
  // Feed video
  feed: {
    icon: IconName;
    /** Says what is happening in the video. */
    title: string;
    caption: string;
    sound: string;
    likes: string;
    comments: string;
    saves: string;
    shares: string;
    learn?: Learn;
  };
  // Profile
  headline: string;
  /** Optional availability, shown quietly on the profile. */
  status?: string;
  stats: { followers: string; following: string; views: string; rating: string; reviews: number };
  topSkills: Skill[];
  works: Work[];
  projects: {
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
  works: [] as Work[],
  projects: [] as Talent['projects'],
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
    city: 'Lagos',
    category: 'Build & Make',
    bio: 'Carpenter in Lagos. I make dining sets, cabinets and studio furniture by hand, and I film the whole process.',
    avatar: images.josh.avatar,
    cover: images.josh.cover,
    mediaLabel: 'Build video',
    mediaDot: '#4cd7f6',
    badge: { label: 'Build & Make', color: '#4cd7f6' },
    skills: [
      { label: 'Carpentry', tone: 'neutral' },
      { label: 'Cabinetry', tone: 'neutral' },
      { label: 'Joinery', tone: 'primary' },
      { label: 'Furniture', tone: 'secondary' },
    ],
    feed: {
      icon: 'handyman',
      title: 'Watch me turn raw iroko into a dining table',
      caption: 'Day 3 of 5: planing, joinery and the first dry fit. Final result on Friday.',
      sound: 'Original sound • Workshop sounds',
      likes: '12.4K',
      comments: '842',
      saves: '1.2K',
      shares: '3.6K',
      learn: {
        tools: ['Hand plane', 'Chisels', 'Marking gauge', 'Clamps'],
        materials: ['Iroko boards', 'Wood glue', 'Danish oil'],
        steps: [
          'Plane every board flat and square.',
          'Mark and cut the mortise and tenon joints.',
          'Dry fit everything before any glue.',
          'Glue up, clamp and leave it overnight.',
        ],
        tips: ['Let new wood rest in your workshop for a week so it settles before you cut.'],
      },
    },
    headline: 'Carpenter | Dining sets, cabinets and studio furniture, built by hand in Lagos.',
    status: 'Taking furniture projects',
    stats: { followers: '21.8K', following: '96', views: '240K', rating: '4.8', reviews: 31 },
    topSkills: [
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
    city: 'Lagos',
    category: 'Creative',
    bio: 'Designer in Lagos. I show how brands and apps come together, from the first sketch to launch day.',
    avatar: images.emeka.avatar,
    cover: images.emeka.cover,
    mediaLabel: 'Process video',
    mediaDot: '#4cd7f6',
    badge: { label: 'Creative', color: '#4cd7f6' },
    skills: [
      { label: 'Branding', tone: 'neutral' },
      { label: 'Illustrator', tone: 'neutral' },
      { label: 'UI/UX', tone: 'primary' },
      { label: 'Figma', tone: 'secondary' },
    ],
    feed: {
      icon: 'design-services',
      title: 'How I designed a full brand in 3 days',
      caption: 'Logo, colours and packaging for a Lagos juice brand. Sketches to final files.',
      sound: 'Original sound • Studio lo-fi session',
      likes: '8.9K',
      comments: '512',
      saves: '944',
      shares: '1.8K',
      learn: {
        tools: ['Sketchbook', 'Illustrator', 'Figma'],
        steps: [
          'Sketch 20 rough ideas in 20 minutes.',
          'Pick three and draw them properly.',
          'Test the favourite in black and white, then add colour.',
        ],
        tips: ['If a logo works in black and white, it works everywhere.'],
      },
    },
    headline: 'Designer | Brands, mobile apps and social campaigns.',
    status: 'Open to collaborations',
    stats: { followers: '18.3K', following: '210', views: '97K', rating: '4.9', reviews: 22 },
    topSkills: [
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
    city: 'Port Harcourt',
    category: 'Health & Care',
    bio: 'Healthcare assistant in Port Harcourt. I share practical care tips for families and carers.',
    avatar: images.precious.avatar,
    cover: images.precious.cover,
    mediaLabel: 'How-to video',
    mediaDot: '#adc6ff',
    badge: { label: 'Health & Care', color: '#adc6ff' },
    skills: [
      { label: 'Patient Care', tone: 'neutral' },
      { label: 'First Aid', tone: 'neutral' },
      { label: 'CPR', tone: 'neutral' },
      { label: 'Senior Care', tone: 'tertiary' },
    ],
    feed: {
      icon: 'favorite',
      title: 'How to help someone stand up safely',
      caption:
        'Two simple moves that protect their back and yours. Save this if you care for someone at home.',
      sound: 'Original sound • Morning rounds',
      likes: '6.1K',
      comments: '301',
      saves: '712',
      shares: '980',
      learn: {
        tools: ['A sturdy chair', 'Gait belt (optional)'],
        steps: [
          'Ask them to shuffle forward to the edge of the seat.',
          'Feet flat and a little apart, nose over toes.',
          'Count together and stand on three.',
        ],
        tips: ['Never pull on their arms. Support them at the hips instead.'],
      },
    },
    headline: 'Healthcare assistant | Practical care tips for families and carers.',
    stats: { followers: '9.4K', following: '143', views: '61K', rating: '5.0', reviews: 17 },
    topSkills: [
      { label: 'Patient Care', tone: 'secondary', icon: 'favorite' },
      { label: 'CPR', tone: 'primary', icon: 'monitor-heart' },
      { label: 'First Aid', tone: 'neutral', icon: 'medical-services' },
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
    city: 'Lagos',
    category: 'Videography',
    bio: 'Video editor and motion artist in Lagos. Reels, documentaries and colour grading, with every trick explained.',
    avatar: images.amina.avatar,
    cover: images.amina.cover,
    mediaLabel: 'Before & after',
    mediaDot: '#d0bcff',
    badge: { label: 'Videography', color: '#acedff' },
    skills: [
      { label: 'Premiere Pro', tone: 'neutral' },
      { label: 'After Effects', tone: 'neutral' },
      { label: 'Sound Design', tone: 'neutral' },
      { label: 'Colour Grading', tone: 'primary' },
    ],
    feed: {
      icon: 'movie-edit',
      title: 'Before and after: grading a Lagos sunset',
      caption: 'Flat footage in, golden hour out. Here’s exactly what I changed, step by step.',
      sound: 'Original sound • Edit session mix',
      likes: '15.2K',
      comments: '1.1K',
      saves: '2.3K',
      shares: '4.4K',
      learn: {
        tools: ['DaVinci Resolve', 'Colour wheels', 'Scopes'],
        steps: [
          'Fix exposure first, then white balance.',
          'Warm the highlights and keep skin tones natural.',
          'Add a soft vignette to pull the eye in.',
        ],
        tips: ['Check skin tones on the vectorscope before you push the colours.'],
      },
    },
    headline: 'Video editor & motion artist | Reels, documentaries and colour grading.',
    status: 'Open to collaborations',
    stats: { followers: '34.2K', following: '128', views: '185K', rating: '4.9', reviews: 48 },
    topSkills: [
      { label: 'Video Editing', tone: 'secondary', icon: 'movie-edit' },
      { label: 'Colour Grading', tone: 'primary', icon: 'palette' },
      { label: 'Motion Graphics', tone: 'primary', icon: 'animation' },
      { label: 'Sound Design', tone: 'neutral', icon: 'graphic-eq' },
      { label: 'Storytelling', tone: 'neutral', icon: 'auto-stories' },
    ],
    works: [
      {
        title: 'Grading a Lagos sunset',
        duration: '0:45',
        views: '14.5K',
        image: images.works.mockups,
      },
      {
        title: 'Launch film for a banking app',
        duration: '1:20',
        views: '28.1K',
        image: images.works.fintech,
      },
      {
        title: 'Building a motion toolkit',
        duration: '0:32',
        views: '12.4K',
        image: images.works.designSystem,
      },
      {
        title: 'How I edit a reel that holds attention',
        duration: '0:58',
        views: '9.2K',
        image: images.works.reel,
      },
      {
        title: 'My editing setup, explained',
        duration: '1:45',
        views: '45.7K',
        image: images.works.podcast,
      },
    ],
    projects: [
      {
        kicker: 'Featured work',
        title: 'PayPulse launch film',
        tag: 'Fintech',
        summary:
          'Launch film and motion pack for a West African mobile wallet, cut for TV, YouTube and Reels.',
        meta: 'Launch film • Motion pack',
        tone: 'secondary',
      },
      {
        kicker: 'Brand story',
        title: 'Apex Logistics rebrand',
        tag: 'Logistics',
        summary: 'Brand launch video, motion graphics and short cut-downs for social.',
        meta: 'Brand video • Social edits',
        tone: 'primary',
      },
    ],
    reviews: [
      {
        initials: 'TK',
        name: 'Tunde Kupoluyi',
        company: 'Kora Growth Labs',
        quote:
          '"We found Amina’s colour-grading breakdown on JobTok and asked her to cut our launch film. Fast, sharp and a joy to work with."',
        meta: 'Worked together on a launch film • 3 weeks ago',
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
    city: 'Ibadan',
    category: 'Home & Construction',
    bio: 'Builder in Ibadan. I show how houses really get built, one stage at a time.',
    avatar: images.tunde.avatar,
    cover: images.tunde.cover,
    mediaLabel: 'Site diary',
    mediaDot: '#acedff',
    badge: { label: 'Construction', color: '#d8e2ff' },
    skills: [
      { label: 'Site Safety', tone: 'neutral' },
      { label: 'Concrete Work', tone: 'neutral' },
      { label: 'Project Planning', tone: 'neutral' },
      { label: 'Quality Checks', tone: 'neutral' },
    ],
    feed: {
      icon: 'engineering',
      title: 'Day 12: pouring the roof slab',
      caption: 'Formwork, rebar check and a 6am pour before the heat. Walk the site with me.',
      sound: 'Original sound • Site walkthrough',
      likes: '7.7K',
      comments: '403',
      saves: '1.0K',
      shares: '1.2K',
      learn: {
        tools: ['Poker vibrator', 'Spirit level', 'Tape measure'],
        materials: ['Concrete mix (1:2:4)', 'Y12 rebar', 'Formwork boards'],
        tips: ['Pour early in the morning so the concrete doesn’t dry out too fast in the heat.'],
      },
    },
    headline: 'Site supervisor & builder | Homes and commercial builds in Ibadan.',
    status: 'Building in Ibadan',
    stats: { followers: '12.6K', following: '88', views: '133K', rating: '4.8', reviews: 26 },
    topSkills: [
      { label: 'Site Safety', tone: 'secondary', icon: 'health-and-safety' },
      { label: 'Concrete Work', tone: 'primary', icon: 'foundation' },
      { label: 'Quality Checks', tone: 'neutral', icon: 'check-circle' },
    ],
  },
];

/** Feed order: the design's hero (Josh) first. */
export const feedTalents = [talents[0]!, talents[3]!, talents[1]!, talents[4]!, talents[2]!];

/** Explore order matches the design. */
export const exploreTalents = talents.filter((t) => t.id !== 'josh');

/** "12.4K" / "842" as a number, for sorting. */
export function countValue(count: string): number {
  const m = count.match(/^([\d.]+)(K?)$/);
  if (!m) return 0;
  return parseFloat(m[1]!) * (m[2] ? 1000 : 1);
}

/** Sample stand-in until real location preferences exist. */
export const SAMPLE_HOME_CITY = 'Lagos';

export function findTalent(id: string | undefined): Talent | undefined {
  return talents.find((t) => t.id === id);
}
