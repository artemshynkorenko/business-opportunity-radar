import type { RawFixtureContent } from '../../../src/normalization/fixture-normalizer.js';
import type { Author } from '../../../src/domain/index.js';

/**
 * Personalization evaluation set — SYNTHETIC.
 *
 * See ./README.md. This set validates deterministic architecture and the
 * personalization hypothesis ("the same situation can be a different opportunity
 * for different users"). It does NOT establish real-world precision/recall.
 *
 * Every fixture flows through the real pipeline. No detection/extraction/scoring/
 * matching logic is bypassed, and no scoring weights or thresholds are tuned.
 */

/** Evaluation categories. */
export type EvalCategory =
  | 'A-strong-artem'
  | 'B-strong-anton'
  | 'C-different-fit'
  | 'D-interest-no-capability'
  | 'E-poor-fit-both'
  | 'F-noise';

export interface EvalFixture {
  category: EvalCategory;
  /** Whether the current detector is expected to treat this as a candidate. */
  expectCandidate: boolean;
  /** Short human note on what this fixture is meant to exercise. */
  note: string;
  content: RawFixtureContent;
  author: Author;
}

function author(id: string, username: string, extra: Partial<Author> = {}): Author {
  return { id, sourceId: 'fixture', username, ...extra };
}

// ===========================================================================
// A. Strong Artem opportunities (5) — international trade / distribution /
//    market entry / partnership / automation, in Artem's priority geographies.
// ===========================================================================

const A1: EvalFixture = {
  category: 'A-strong-artem',
  expectCandidate: true,
  note: 'Thai manufacturer seeking EU distributor — Artem geo + distribution capability.',
  content: {
    id: 'ea1-thai-eu-distributor',
    authorId: 'ea1',
    text: `We manufacture organic coconut-based cosmetics in Chiang Mai, Thailand — 6 years, our own
factory, all export certifications in place. We already ship to Japan and Australia. We now want to
reach European retailers but we don't have anyone on the ground who understands EU customs and
distribution. Looking for a distribution partner in the EU who can take our line to market.`,
    title: 'Thai cosmetics manufacturer — need an EU distribution partner',
    timestamp: '2026-02-01T08:00:00Z',
    permalink: 'https://fixture.test/eval/ea1',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ea1', 'coco_cm', { accountAgeDays: 700, karma: 900, bio: 'Cosmetics factory, Chiang Mai.' }),
};

const A2: EvalFixture = {
  category: 'A-strong-artem',
  expectCandidate: true,
  note: 'SEA SaaS wants EU market entry — market-entry partner, Artem EU access.',
  content: {
    id: 'ea2-sea-eu-market-entry',
    authorId: 'ea2',
    text: `Our logistics scheduling platform is used by 150 paying businesses across Vietnam and
Thailand. Profitable, four years in. We're ready to expand into the European market but the
regulatory and sales landscape there is unfamiliar to us. We'd like to team up with someone who
knows the EU market and can help us establish a local presence.`,
    title: 'SEA logistics SaaS expanding to Europe — seeking a market-entry partner',
    timestamp: '2026-02-02T09:00:00Z',
    permalink: 'https://fixture.test/eval/ea2',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ea2', 'sea_logi', { accountAgeDays: 1300, karma: 2100, verified: true }),
};

const A3: EvalFixture = {
  category: 'A-strong-artem',
  expectCandidate: true,
  note: 'EU brand wants a Thailand market partner — Artem Thailand access.',
  content: {
    id: 'ea3-eu-thailand-partner',
    authorId: 'ea3',
    text: `German kitchenware brand, 20 years established, strong EU distribution. We're entering the
Thai market and need a local partner who understands Thai retail and can open doors with
distributors in Bangkok and Chiang Mai. Exclusivity on the table for the right partner.`,
    title: 'German kitchenware brand entering Thailand — local partner wanted',
    timestamp: '2026-02-03T10:00:00Z',
    permalink: 'https://fixture.test/eval/ea3',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ea3', 'kuche_de', { accountAgeDays: 500, karma: 400 }),
};

const A4: EvalFixture = {
  category: 'A-strong-artem',
  expectCandidate: true,
  note: 'Russia/CIS supplier seeking EU distribution — Artem Russia/CIS + EU.',
  content: {
    id: 'ea4-russia-eu-distribution',
    authorId: 'ea4',
    text: `We produce industrial fasteners in Russia and supply across the CIS. Demand from European
buyers keeps coming in but we have no distribution channel there and no EU trading entity. We're
after a distributor or import partner who can handle the European side — customs, warehousing,
reselling to EU manufacturers.`,
    title: 'Russian fastener producer — need EU import/distribution partner',
    timestamp: '2026-02-04T11:00:00Z',
    permalink: 'https://fixture.test/eval/ea4',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ea4', 'cis_fastener', { accountAgeDays: 950, karma: 700 }),
};

const A5: EvalFixture = {
  category: 'A-strong-artem',
  expectCandidate: true,
  note: 'Operational automation opportunity — Artem automation capability. Intent expressed naturally.',
  content: {
    id: 'ea5-automation-ops',
    authorId: 'ea5',
    text: `Our wholesale distribution business has grown fast and honestly our back office can't keep
up. Every order gets re-typed into three different systems by hand, invoicing eats an entire day a
week, and stock reports are always late. It's costing us real money and mistakes. We'd pay well for
someone who can untangle these workflows and automate the repetitive parts.`,
    title: 'Wholesale distributor drowning in manual back-office work',
    timestamp: '2026-02-05T12:00:00Z',
    permalink: 'https://fixture.test/eval/ea5',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ea5', 'wholesale_ops', { accountAgeDays: 620, karma: 540 }),
};

// ===========================================================================
// B. Strong Anton opportunities (5) — filmmaking / food / motorcycles framed
//    as genuine partnership / project / operator opportunities.
// ===========================================================================

const B1: EvalFixture = {
  category: 'B-strong-anton',
  expectCandidate: true,
  note: 'Filmmaker seeking a production partner/producer for a project.',
  content: {
    id: 'eb1-film-producer',
    authorId: 'eb1',
    text: `I'm a documentary director with two festival films behind me. I have a new feature-length
project scripted and partly storyboarded, but I can't take it further alone. I'm looking for a
producing partner to come on board — someone to help structure the production, line up collaborators
and shepherd it from pre-production to delivery.`,
    title: 'Documentary director seeking a producing partner for a new feature',
    timestamp: '2026-02-06T08:00:00Z',
    permalink: 'https://fixture.test/eval/eb1',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('eb1', 'doc_director', { accountAgeDays: 800, karma: 1300 }),
};

const B2: EvalFixture = {
  category: 'B-strong-anton',
  expectCandidate: true,
  note: 'Film project seeking a production collaboration/partner. Non-keyword intent.',
  content: {
    id: 'eb2-film-collab',
    authorId: 'eb2',
    text: `We're a small production collective with gear and a crew but our slate has outgrown what we
can deliver on our own. We'd like to join forces with another team or an operator who can take
ownership of production management on upcoming shoots. Open to a proper working partnership, not
one-off freelance.`,
    title: 'Production collective looking to team up on an expanding slate',
    timestamp: '2026-02-07T09:00:00Z',
    permalink: 'https://fixture.test/eval/eb2',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('eb2', 'prod_collective', { accountAgeDays: 500, karma: 600 }),
};

const B3: EvalFixture = {
  category: 'B-strong-anton',
  expectCandidate: true,
  note: 'Food business partnership / expansion project.',
  content: {
    id: 'eb3-food-partnership',
    authorId: 'eb3',
    text: `We run a specialty ramen spot that's been packed since we opened two years ago. Regulars
keep asking us to open a second location and we have a landlord offer on the table. We're looking for
a business partner to help us expand — someone hands-on who wants to build the second site with us,
not just invest passively.`,
    title: 'Popular ramen shop seeking a partner to open a second location',
    timestamp: '2026-02-08T10:00:00Z',
    permalink: 'https://fixture.test/eval/eb3',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('eb3', 'ramen_two', { accountAgeDays: 730, karma: 800 }),
};

const B4: EvalFixture = {
  category: 'B-strong-anton',
  expectCandidate: true,
  note: 'Motorcycle-related business partnership.',
  content: {
    id: 'eb4-moto-partnership',
    authorId: 'eb4',
    text: `I've been building a custom motorcycle workshop and small parts brand for three years. The
brand side is growing faster than I can handle next to the workshop. I'm looking for a business
partner who wants to help run and grow the parts business — someone who can take ownership of
operations while I focus on the builds.`,
    title: 'Custom motorcycle brand owner seeking a business partner',
    timestamp: '2026-02-09T11:00:00Z',
    permalink: 'https://fixture.test/eval/eb4',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('eb4', 'moto_customs', { accountAgeDays: 900, karma: 950 }),
};

const B5: EvalFixture = {
  category: 'B-strong-anton',
  expectCandidate: true,
  note: 'Creative project seeking an operator/partner. Cofounder-style signal.',
  content: {
    id: 'eb5-creative-operator',
    authorId: 'eb5',
    text: `I'm launching a supper-club-meets-film-screening series that's had three sold-out nights.
It's clearly got legs but I'm the only one running it and it's becoming a real project. I'd like to
find a cofounder or operating partner to build this into something proper with me.`,
    title: 'Sold-out supper-club/film series looking for a cofounder',
    timestamp: '2026-02-10T12:00:00Z',
    permalink: 'https://fixture.test/eval/eb5',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('eb5', 'supper_reels', { accountAgeDays: 300, karma: 250 }),
};

// ===========================================================================
// C. Different user fits (5) — same situation, sharply different value per
//    profile. Each is a real opportunity; the profiles value it differently.
// ===========================================================================

const C1: EvalFixture = {
  category: 'C-different-fit',
  expectCandidate: true,
  note: 'Thai food manufacturer seeking EU distributor: strong for Artem (trade/EU/Thailand); Anton interested (food) but cannot distribute.',
  content: {
    id: 'ec1-thai-food-eu-distributor',
    authorId: 'ec1',
    text: `Family-run Thai sauce and paste manufacturer near Bangkok, 10 years, HACCP certified, our
own production line. We supply supermarkets across Thailand and want to get onto European shelves.
We need a distribution partner in the EU who can import, warehouse and place our products with
retailers.`,
    title: 'Thai sauce manufacturer seeking an EU distribution partner',
    timestamp: '2026-02-11T08:00:00Z',
    permalink: 'https://fixture.test/eval/ec1',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ec1', 'thai_sauces', { accountAgeDays: 1000, karma: 1500 }),
};

const C2: EvalFixture = {
  category: 'C-different-fit',
  expectCandidate: true,
  note: 'Motorcycle manufacturer seeking European distributor: strong for Artem (distribution/EU); Anton interested (motorcycles) but no distribution capability. THIS is the key req-5/req-6 case.',
  content: {
    id: 'ec2-moto-eu-distributor',
    authorId: 'ec2',
    text: `We are a Thai motorcycle manufacturer producing electric scooters for urban markets. Strong
sales across Southeast Asia, our own assembly plant, 8 years in operation. We're looking for a
European distributor to bring our models into the EU — someone who can handle homologation, import
and dealer relationships.`,
    title: 'Thai e-motorcycle manufacturer looking for a European distributor',
    timestamp: '2026-02-12T09:00:00Z',
    permalink: 'https://fixture.test/eval/ec2',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ec2', 'thai_escoot', { accountAgeDays: 1200, karma: 1800, verified: true }),
};

const C3: EvalFixture = {
  category: 'C-different-fit',
  expectCandidate: true,
  note: 'Restaurant automation: strong for Artem (automation); Anton interested (food) but no automation capability.',
  content: {
    id: 'ec3-restaurant-automation',
    authorId: 'ec3',
    text: `We run a group of five cafés and the admin is out of control — reservations, rotas,
supplier orders and daily reporting all done by hand. Our manager loses hours to it every day. We
want someone to automate the repetitive workflows so the team can focus on the food and the guests.`,
    title: 'Café group wants to automate its manual back-office',
    timestamp: '2026-02-13T10:00:00Z',
    permalink: 'https://fixture.test/eval/ec3',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ec3', 'cafe_group', { accountAgeDays: 640, karma: 500 }),
};

const C4: EvalFixture = {
  category: 'C-different-fit',
  expectCandidate: true,
  note: 'Film-equipment rental business seeking a partner: Anton interested (filmmaking) + it is a business partnership; Artem values it less (outside trade/geo focus).',
  content: {
    id: 'ec4-film-rental-partner',
    authorId: 'ec4',
    text: `I own a film and camera equipment rental house that's been steady for years. I want to grow
it into events and production services but I need a partner to run that new side of the business with
me. Looking for someone who knows the production world and wants a real stake.`,
    title: 'Camera rental house owner seeking a partner to expand into production services',
    timestamp: '2026-02-14T11:00:00Z',
    permalink: 'https://fixture.test/eval/ec4',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ec4', 'rental_house', { accountAgeDays: 1500, karma: 1600 }),
};

const C5: EvalFixture = {
  category: 'C-different-fit',
  expectCandidate: true,
  note: 'Russia/CIS software seeking EU partner: strong for Artem; low relevance for Anton (no interest, no capability).',
  content: {
    id: 'ec5-cis-software-eu-partner',
    authorId: 'ec5',
    text: `Our analytics product has a solid paying customer base across Russia and the CIS. We're
profitable and want to move into European markets, but we need a partner there for sales and
compliance. Equity partnership is possible for someone who knows the EU B2B software space.`,
    title: 'CIS analytics software seeking an EU expansion partner',
    timestamp: '2026-02-15T12:00:00Z',
    permalink: 'https://fixture.test/eval/ec5',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ec5', 'cis_analytics', { accountAgeDays: 1100, karma: 1400, verified: true }),
};

// ===========================================================================
// D. Interest but no capability (5) — Anton's interest is clearly relevant, but
//    the requested role is one there is NO evidence Anton can perform. These
//    must NOT translate into a capability match for Anton.
// ===========================================================================

const D1: EvalFixture = {
  category: 'D-interest-no-capability',
  expectCandidate: true,
  note: 'Motorcycle brand needs a DISTRIBUTOR — Anton interested, but distribution is not his capability.',
  content: {
    id: 'ed1-moto-needs-distributor',
    authorId: 'ed1',
    text: `Established motorcycle accessory brand with strong online sales. We're looking for a
distributor who can get our products into physical dealerships across a new region — someone with an
existing dealer network and import experience.`,
    title: 'Motorcycle accessory brand seeking a distributor with a dealer network',
    timestamp: '2026-02-16T08:00:00Z',
    permalink: 'https://fixture.test/eval/ed1',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ed1', 'moto_acc', { accountAgeDays: 800, karma: 900 }),
};

const D2: EvalFixture = {
  category: 'D-interest-no-capability',
  expectCandidate: true,
  note: 'Food manufacturer needs a manufacturing/sourcing partner — Anton interested, cannot manufacture.',
  content: {
    id: 'ed2-food-needs-manufacturer',
    authorId: 'ed2',
    text: `Our snack brand is selling out and we can't keep up with demand. We need a co-manufacturer
or contract manufacturing partner with food-grade capacity who can produce to our recipe at volume
and consistent quality.`,
    title: 'Snack brand seeking a contract manufacturer to scale production',
    timestamp: '2026-02-17T09:00:00Z',
    permalink: 'https://fixture.test/eval/ed2',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ed2', 'snack_brand', { accountAgeDays: 400, karma: 350 }),
};

const D3: EvalFixture = {
  category: 'D-interest-no-capability',
  expectCandidate: true,
  note: 'Film project needs financing/investor — Anton interested, not an investor.',
  content: {
    id: 'ed3-film-needs-financing',
    authorId: 'ed3',
    text: `Feature film fully packaged — cast attached, locations locked, crew ready. We're seeking
investment to close the remaining production budget. Looking for an investor or financing partner who
understands film and wants a stake in the returns.`,
    title: 'Packaged feature film seeking a financing partner / investor',
    timestamp: '2026-02-18T10:00:00Z',
    permalink: 'https://fixture.test/eval/ed3',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ed3', 'feature_fin', { accountAgeDays: 600, karma: 700 }),
};

const D4: EvalFixture = {
  category: 'D-interest-no-capability',
  expectCandidate: true,
  note: 'Motorcycle tour operator needs a sourcing/supplier partner — Anton interested, not a supplier.',
  content: {
    id: 'ed4-moto-tours-supplier',
    authorId: 'ed4',
    text: `We run motorcycle adventure tours and want to launch our own branded riding gear. We need a
manufacturer/supplier who can produce quality protective gear to our specs at a workable minimum
order quantity.`,
    title: 'Motorcycle tour company seeking a gear manufacturer/supplier',
    timestamp: '2026-02-19T11:00:00Z',
    permalink: 'https://fixture.test/eval/ed4',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ed4', 'moto_tours', { accountAgeDays: 1000, karma: 1100 }),
};

const D5: EvalFixture = {
  category: 'D-interest-no-capability',
  expectCandidate: true,
  note: 'Food hall needs a market-entry operator abroad — Anton interested, no market-entry capability/geo.',
  content: {
    id: 'ed5-food-market-entry',
    authorId: 'ed5',
    text: `Successful street-food hall concept, three sites at home. We want to enter the Middle
Eastern market and need a local partner who can handle market entry — permits, real estate and local
operations — in that region.`,
    title: 'Street-food hall concept seeking a market-entry partner in the Middle East',
    timestamp: '2026-02-20T12:00:00Z',
    permalink: 'https://fixture.test/eval/ed5',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ed5', 'food_hall', { accountAgeDays: 900, karma: 1000 }),
};

// ===========================================================================
// E. Interesting but poor fit for both (5) — genuine opportunity signal, but in
//    a domain/role neither profile is strongly aligned to.
// ===========================================================================

const E1: EvalFixture = {
  category: 'E-poor-fit-both',
  expectCandidate: true,
  note: 'Biotech lab equipment sourcing — real signal, neither Artem nor Anton aligned.',
  content: {
    id: 'ee1-biotech-sourcing',
    authorId: 'ee1',
    text: `Biotech startup here. We need a sourcing partner who can help us procure specialized lab
equipment and reagents from certified suppliers, and manage the import logistics. Ongoing
relationship, technical domain knowledge essential.`,
    title: 'Biotech startup seeking a specialized lab-equipment sourcing partner',
    timestamp: '2026-02-21T08:00:00Z',
    permalink: 'https://fixture.test/eval/ee1',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ee1', 'biotech_lab', { accountAgeDays: 500, karma: 400 }),
};

const E2: EvalFixture = {
  category: 'E-poor-fit-both',
  expectCandidate: true,
  note: 'Offshore wind maintenance JV — real signal, neither profile aligned.',
  content: {
    id: 'ee2-wind-jv',
    authorId: 'ee2',
    text: `Marine services firm seeking a joint-venture partner for offshore wind turbine maintenance
contracts. You'd bring certified technicians and vessel access; we bring the contracts and local
permits. Serious operators only.`,
    title: 'Offshore wind maintenance — seeking a JV partner with vessels and technicians',
    timestamp: '2026-02-22T09:00:00Z',
    permalink: 'https://fixture.test/eval/ee2',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ee2', 'marine_svc', { accountAgeDays: 1200, karma: 1300 }),
};

const E3: EvalFixture = {
  category: 'E-poor-fit-both',
  expectCandidate: true,
  note: 'Dental clinic chain succession — real signal, neither profile aligned.',
  content: {
    id: 'ee3-dental-succession',
    authorId: 'ee3',
    text: `Owner of a three-clinic dental group, planning retirement. I'm open to a successor or
partner who can take over clinical operations over a two-year transition. Profitable and
well-established; clinical background required.`,
    title: 'Dental clinic group owner seeking a clinical successor/partner',
    timestamp: '2026-02-23T10:00:00Z',
    permalink: 'https://fixture.test/eval/ee3',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ee3', 'dental_group', { accountAgeDays: 1400, karma: 1200 }),
};

const E4: EvalFixture = {
  category: 'E-poor-fit-both',
  expectCandidate: true,
  note: 'Commercial fishing cooperative sourcing — real signal, neither profile aligned.',
  content: {
    id: 'ee4-fishing-sourcing',
    authorId: 'ee4',
    text: `Fishing cooperative looking for a procurement partner to secure cold-chain logistics and
buyers for our daily catch. We have the supply; we need someone with cold-storage and export
channels for seafood.`,
    title: 'Fishing cooperative seeking a cold-chain procurement/export partner',
    timestamp: '2026-02-24T11:00:00Z',
    permalink: 'https://fixture.test/eval/ee4',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ee4', 'fish_coop', { accountAgeDays: 700, karma: 600 }),
};

const E5: EvalFixture = {
  category: 'E-poor-fit-both',
  expectCandidate: true,
  note: 'Mining equipment distribution — real signal, neither profile aligned.',
  content: {
    id: 'ee5-mining-distribution',
    authorId: 'ee5',
    text: `Heavy mining equipment maker seeking a regional distribution partner with a service network
for after-sales support. Long sales cycles, technical product; you need existing relationships with
mining operators.`,
    title: 'Mining equipment maker seeking a technical distribution partner',
    timestamp: '2026-02-25T12:00:00Z',
    permalink: 'https://fixture.test/eval/ee5',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ee5', 'mining_eq', { accountAgeDays: 1300, karma: 1500 }),
};

// ===========================================================================
// F. Noise / negative (5) — expected to be rejected by the detector.
// ===========================================================================

const F1: EvalFixture = {
  category: 'F-noise',
  expectCandidate: false,
  note: 'Generic motivation.',
  content: {
    id: 'ef1-motivation',
    authorId: 'ef1',
    text: `Rise and grind! The entrepreneur mindset separates winners from everyone else. Wake up at
5am, hustle harder, believe in yourself, manifest your dreams. Success mindset is built through the
daily grind. Discipline beats motivation every time.`,
    title: 'Your mindset is everything — rise and grind',
    timestamp: '2026-02-26T06:00:00Z',
    permalink: 'https://fixture.test/eval/ef1',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ef1', 'grindset', { accountAgeDays: 60, karma: 20 }),
};

const F2: EvalFixture = {
  category: 'F-noise',
  expectCandidate: false,
  note: 'Get-rich-quick / passive income.',
  content: {
    id: 'ef2-get-rich',
    authorId: 'ef2',
    text: `Make $5000 a day from home easily! Passive income secret the banks don't want you to know.
Financial freedom fast — I'll show you the trick. Get rich quick with this simple system, no
experience needed.`,
    title: 'Make $5000/day from home — passive income secret',
    timestamp: '2026-02-27T07:00:00Z',
    permalink: 'https://fixture.test/eval/ef2',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ef2', 'cash_daily', { accountAgeDays: 20, karma: 3 }),
};

const F3: EvalFixture = {
  category: 'F-noise',
  expectCandidate: false,
  note: 'MLM.',
  content: {
    id: 'ef3-mlm',
    authorId: 'ef3',
    text: `Join our network marketing family! Build your downline, recruit your team, and earn
commission on every level. Multi-level marketing gives you the freedom to be your own boss. Our
upline earns five figures a month. DM to join.`,
    title: 'Network marketing opportunity — build your downline',
    timestamp: '2026-02-28T08:00:00Z',
    permalink: 'https://fixture.test/eval/ef3',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ef3', 'downline_boss', { accountAgeDays: 40, karma: 8 }),
};

const F4: EvalFixture = {
  category: 'F-noise',
  expectCandidate: false,
  note: 'Career/job seeking.',
  content: {
    id: 'ef4-job-seeking',
    authorId: 'ef4',
    text: `[FOR HIRE] I'm looking for a full-time job as a marketing manager. 7 years of work
experience, resume and CV available on request. Open to remote roles. Seeking employment with a
company that offers growth. Please reach out if you're hiring.`,
    title: '[FOR HIRE] Marketing manager, 7 years experience, seeking employment',
    timestamp: '2026-03-01T09:00:00Z',
    permalink: 'https://fixture.test/eval/ef4',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ef4', 'seeking_role', { accountAgeDays: 150, karma: 60 }),
};

const F5: EvalFixture = {
  category: 'F-noise',
  expectCandidate: false,
  note: 'Generic AI hype / crypto blend.',
  content: {
    id: 'ef5-ai-crypto-hype',
    authorId: 'ef5',
    text: `AI is going to change EVERYTHING and this new crypto token is how you profit from it! Web3
plus AI is the future. This altcoin will 100x when the AI hype hits — buy the dip, ape in, to the
moon. Don't sleep on the next big blockchain gem.`,
    title: 'AI + crypto = the future — do not miss this 100x token',
    timestamp: '2026-03-02T10:00:00Z',
    permalink: 'https://fixture.test/eval/ef5',
    language: 'en',
    contentType: 'post',
    metadata: {},
  },
  author: author('ef5', 'ai_moon', { accountAgeDays: 25, karma: 4 }),
};

// ===========================================================================
// Aggregate
// ===========================================================================

export const EVAL_FIXTURES: EvalFixture[] = [
  A1, A2, A3, A4, A5,
  B1, B2, B3, B4, B5,
  C1, C2, C3, C4, C5,
  D1, D2, D3, D4, D5,
  E1, E2, E3, E4, E5,
  F1, F2, F3, F4, F5,
];

/** Convenience lookups used by tests. */
export const EVAL_BY_ID: Record<string, EvalFixture> = Object.fromEntries(
  EVAL_FIXTURES.map((f) => [f.content.id, f])
);

export function evalByCategory(category: EvalCategory): EvalFixture[] {
  return EVAL_FIXTURES.filter((f) => f.category === category);
}

/** The key personalization case: Thai motorcycle manufacturer → European distributor. */
export const MOTORCYCLE_EU_DISTRIBUTOR_ID = 'ec2-moto-eu-distributor';
