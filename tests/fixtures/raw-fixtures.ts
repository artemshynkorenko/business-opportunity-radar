import type { RawFixtureContent } from '../../src/normalization/fixture-normalizer.js';
import type { Author } from '../../src/domain/index.js';

/**
 * Synthetic fixture data for deterministic testing.
 * Each fixture represents a realistic content piece from an online community.
 * No real people or businesses are represented.
 */

// ---------------------------------------------------------------------------
// Positive fixtures — should pass candidate detection
// ---------------------------------------------------------------------------

/** F01: Thai manufacturer seeking EU distributor (HIGH score target) */
export const F01_THAI_MANUFACTURER: RawFixtureContent = {
  id: 'f01-thai-manufacturer',
  authorId: 'author-somchai',
  communityId: 'r-internationalbusiness',
  text: `We have been manufacturing premium ceramic tableware in Chiang Mai, Thailand for 12 years. 
Our factory has a production capacity of 50,000 units per month with established quality certifications.
We are currently looking for an EU distributor or import partner who can handle customs clearance 
and has existing relationships with European retailers or wholesalers.
We export to Australia and Japan already but have not yet entered the European market.
Monthly revenue around $80k USD. Serious inquiries only, please no middlemen.`,
  title: 'Thai ceramic manufacturer seeking EU distribution partner',
  timestamp: '2024-01-15T08:30:00Z',
  permalink: 'https://fixture.test/r/internationalbusiness/f01',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'internationalbusiness', score: 47, comments: 12 },
};

export const A01_THAI_MANUFACTURER: Author = {
  id: 'author-somchai',
  sourceId: 'fixture',
  username: 'somchai_ceramics',
  displayName: 'Somchai Ceramics',
  profileUrl: 'https://fixture.test/u/somchai_ceramics',
  accountAgeDays: 820,
  karma: 1240,
  verified: false,
  bio: 'Factory owner, 12 years in ceramics manufacturing, Chiang Mai Thailand. Exporting to AU and JP.',
};

/** F02: Russian SaaS seeking European partner (HIGH score target) */
export const F02_RUSSIAN_SAAS: RawFixtureContent = {
  id: 'f02-russian-saas',
  authorId: 'author-dmitri',
  communityId: 'r-saas',
  text: `Our B2B fleet management software has 200+ paying customers in Russia and CIS countries.
We have been running for 4 years, profitable, ARR around €400k. 
We want to expand to European markets — primarily Germany, Netherlands, and Poland. 
Looking for a European business partner who understands the logistics/fleet industry 
and can help with local sales, compliance, and customer support.
Equity partnership possible for the right partner. We are not looking for an agency or reseller.`,
  title: 'Russian fleet management SaaS — seeking European partner for expansion',
  timestamp: '2024-01-20T14:00:00Z',
  permalink: 'https://fixture.test/r/saas/f02',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'saas', score: 89, comments: 31 },
};

export const A02_RUSSIAN_SAAS: Author = {
  id: 'author-dmitri',
  sourceId: 'fixture',
  username: 'dmitri_fleettech',
  displayName: 'Dmitri (FleetTech)',
  profileUrl: 'https://fixture.test/u/dmitri_fleettech',
  accountAgeDays: 1450,
  karma: 3200,
  verified: true,
  bio: 'Founder & CEO of FleetTech — B2B SaaS for fleet management. Russia/CIS focused, going global.',
};

/** F03: Chiang Mai restaurant seeking automation help (MEDIUM score target) */
export const F03_RESTAURANT_AUTOMATION: RawFixtureContent = {
  id: 'f03-restaurant-automation',
  authorId: 'author-anna',
  communityId: 'r-chiangmai',
  text: `Running a small restaurant/café in Chiang Mai with 3 locations. 
We manually handle reservations, inventory, staff scheduling and daily reports. 
It takes our manager 3 hours every day just to compile the numbers.
We're not a tech company and don't have budget for a full ERP system.
Is there anyone who can help automate some of these workflows? 
We've heard of n8n and Zapier but don't know where to start.
Budget is flexible for the right person who can show us real results.`,
  title: 'Looking for help automating restaurant operations — Chiang Mai',
  timestamp: '2024-01-22T10:15:00Z',
  permalink: 'https://fixture.test/r/chiangmai/f03',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'chiangmai', score: 23, comments: 8 },
};

export const A03_RESTAURANT: Author = {
  id: 'author-anna',
  sourceId: 'fixture',
  username: 'anna_cm_eats',
  displayName: 'Anna (CM Eats)',
  profileUrl: 'https://fixture.test/u/anna_cm_eats',
  accountAgeDays: 340,
  karma: 450,
  verified: false,
  bio: 'Running 3 restaurants in Chiang Mai. Food, hospitality, always learning.',
};

/** F04: EU company entering Southeast Asian market (HIGH score target) */
export const F04_EU_SEA_ENTRY: RawFixtureContent = {
  id: 'f04-eu-sea-entry',
  authorId: 'author-prague-corp',
  communityId: 'r-asiaexpats',
  text: `Our Czech company manufactures industrial safety equipment. We have been established for 18 years 
with strong distribution across Europe. We are now entering Southeast Asia, starting with Thailand.
We need a local market-entry partner who knows the Thai industrial sector — 
ideally someone with existing relationships with Thai manufacturers or distributors in the safety equipment space.
We can offer exclusivity in Thailand for the right partner. 
We are serious, well-funded, and committed to the market for the long term.`,
  title: 'Czech industrial safety company seeking Thai market entry partner',
  timestamp: '2024-01-25T09:00:00Z',
  permalink: 'https://fixture.test/r/asiaexpats/f04',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'asiaexpats', score: 34, comments: 7 },
};

export const A04_EU_COMPANY: Author = {
  id: 'author-prague-corp',
  sourceId: 'fixture',
  username: 'safeguard_cz',
  displayName: 'SafeGuard Czech',
  profileUrl: 'https://fixture.test/u/safeguard_cz',
  accountAgeDays: 200,
  karma: 180,
  verified: false,
  bio: 'Czech manufacturer of industrial safety equipment. 18 years, EU-wide distribution, now expanding to Asia.',
};

/** F05: Thai factory owner seeking successor/partner (HIGH score target) */
export const F05_THAI_SUCCESSION: RawFixtureContent = {
  id: 'f05-thai-succession',
  authorId: 'author-khun-boon',
  communityId: 'r-thailand',
  text: `I have been running a small garment factory in Chiang Mai for 15 years. 
We employ 40 workers and have stable contracts with 3 European brands.
I am 58 years old and thinking about my retirement and succession plan over the next 3–5 years.
I am not necessarily looking to sell outright — I am open to a partner or successor who 
can learn the business, bring new energy and international connections, 
and eventually take over operations. 
The business is profitable (around 8M THB annual revenue). 
Would consider partial acquisition with gradual transition.`,
  title: 'Chiang Mai garment factory owner — succession planning, seeking partner',
  timestamp: '2024-01-28T07:45:00Z',
  permalink: 'https://fixture.test/r/thailand/f05',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'thailand', score: 61, comments: 28 },
};

export const A05_THAI_FACTORY: Author = {
  id: 'author-khun-boon',
  sourceId: 'fixture',
  username: 'boon_garments',
  displayName: 'Khun Boon',
  profileUrl: 'https://fixture.test/u/boon_garments',
  accountAgeDays: 1100,
  karma: 890,
  verified: false,
  bio: 'Factory owner, Chiang Mai. Garment manufacturing. 15 years in the business.',
};

// ---------------------------------------------------------------------------
// Negative fixtures — should be rejected by candidate detection
// ---------------------------------------------------------------------------

/** F06: Crypto pump content — should be rejected */
export const F06_CRYPTO_NOISE: RawFixtureContent = {
  id: 'f06-crypto-noise',
  authorId: 'author-cryptobro',
  communityId: 'r-cryptocurrency',
  text: `This altcoin is about to 100x! Everyone is sleeping on this gem.
Buy before it goes to the moon. Ape in now before the pump.
Bitcoin and ethereum are old news, this new token is the future.
Web3 defi is the only way to achieve financial freedom.
HODL and you'll thank me later. This blockchain project changes everything.`,
  title: 'HUGE crypto opportunity — do not miss this pump',
  timestamp: '2024-01-10T15:00:00Z',
  permalink: 'https://fixture.test/r/cryptocurrency/f06',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'cryptocurrency', score: 3, comments: 45 },
};

export const A06_CRYPTO: Author = {
  id: 'author-cryptobro',
  sourceId: 'fixture',
  username: 'moon_pumper_99',
  displayName: 'Crypto Moon',
  accountAgeDays: 45,
  karma: 12,
};

/** F07: Job seeking post — should be rejected */
export const F07_JOB_SEEKING: RawFixtureContent = {
  id: 'f07-job-seeking',
  authorId: 'author-job-seeker',
  communityId: 'r-forhire',
  text: `I am available and looking for a full-time position as a software developer.
I have 5 years of work experience in JavaScript and React.
My resume and CV are available on request. 
Open to work remotely or on-site. 
Seeking employment with a good company that values work-life balance.
Please reach out if you are hiring.`,
  title: '[FOR HIRE] Senior JavaScript Developer — 5 years experience',
  timestamp: '2024-01-12T11:00:00Z',
  permalink: 'https://fixture.test/r/forhire/f07',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'forhire', score: 1, comments: 0 },
};

export const A07_JOB_SEEKER: Author = {
  id: 'author-job-seeker',
  sourceId: 'fixture',
  username: 'devseekjob',
  displayName: 'Dev Looking',
  accountAgeDays: 120,
  karma: 55,
};

/** F08: Generic motivational post — should be rejected */
export const F08_MOTIVATIONAL: RawFixtureContent = {
  id: 'f08-motivational',
  authorId: 'author-hustler',
  communityId: 'r-entrepreneur',
  text: `Wake up early and grind every single day. The entrepreneur mindset is everything.
Hustle harder than everyone else and you will succeed. Believe in yourself always.
The morning routine of the most successful people includes waking up at 6am.
Manifest your goals and the law of attraction will bring them to you.
Success mindset is not born, it is built through discipline and the grind.`,
  title: 'The mindset of successful entrepreneurs — wake up, hustle, repeat',
  timestamp: '2024-01-14T06:00:00Z',
  permalink: 'https://fixture.test/r/entrepreneur/f08',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'entrepreneur', score: 5, comments: 2 },
};

export const A08_HUSTLER: Author = {
  id: 'author-hustler',
  sourceId: 'fixture',
  username: 'grind_hustle_win',
  displayName: 'Hustle King',
  accountAgeDays: 90,
  karma: 34,
};

// ---------------------------------------------------------------------------
// Additional positive fixture for E2E
// ---------------------------------------------------------------------------

/** F09: EU company looking for Thai sourcing partner */
export const F09_EU_SOURCING: RawFixtureContent = {
  id: 'f09-eu-sourcing',
  authorId: 'author-european-buyer',
  communityId: 'r-sourcing',
  text: `We are a European e-commerce company looking to source handmade textile products from Thailand.
We currently buy from China but want to diversify our supply chain into Southeast Asia.
Looking for a sourcing agent or local partner in Thailand who can help us find manufacturers,
negotiate prices, handle quality control, and manage shipping to Europe.
We have existing relationships with European retailers and our own webshop.
This would be an ongoing relationship for consistent monthly orders.`,
  title: 'European e-commerce company seeking Thai sourcing partner',
  timestamp: '2024-02-01T10:00:00Z',
  permalink: 'https://fixture.test/r/sourcing/f09',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'sourcing', score: 29, comments: 6 },
};

export const A09_EU_BUYER: Author = {
  id: 'author-european-buyer',
  sourceId: 'fixture',
  username: 'eu_ecom_buyer',
  displayName: 'EU Ecom Sourcing',
  accountAgeDays: 280,
  karma: 330,
  verified: false,
  bio: 'European e-commerce buyer. Sourcing from Asia. Always looking for quality suppliers.',
};

/** F10: MLM noise — should be rejected */
export const F10_MLM_NOISE: RawFixtureContent = {
  id: 'f10-mlm-noise',
  authorId: 'author-mlm',
  communityId: 'r-entrepreneur',
  text: `Amazing network marketing opportunity! Join our downline and start earning commission.
You can recruit your own team and earn from their sales too.
Multi-level marketing is the best way to achieve financial freedom.
No experience needed. Just recruit and earn. Our upline makes $10k/month.`,
  title: 'Network marketing opportunity — join our team',
  timestamp: '2024-01-16T09:00:00Z',
  permalink: 'https://fixture.test/r/entrepreneur/f10',
  language: 'en',
  contentType: 'post',
  metadata: { subreddit: 'entrepreneur', score: 0, comments: 1 },
};

export const A10_MLM: Author = {
  id: 'author-mlm',
  sourceId: 'fixture',
  username: 'mlm_team_builder',
  displayName: 'Network Builder',
  accountAgeDays: 30,
  karma: 5,
};

// ---------------------------------------------------------------------------
// F11: Unknown author — used for author-resolution failure tests
// ---------------------------------------------------------------------------

export const F11_UNKNOWN_AUTHOR: RawFixtureContent = {
  id: 'f11-unknown-author',
  authorId: 'author-nonexistent',  // not in AUTHOR_MAP
  communityId: 'r-test',
  text: 'We are looking for a business partner to expand our manufacturing operations in Southeast Asia.',
  title: 'Seeking business partner for SEA expansion',
  timestamp: '2024-02-10T10:00:00Z',
  permalink: 'https://fixture.test/r/test/f11',
  language: 'en',
  contentType: 'post',
  metadata: {},
};
