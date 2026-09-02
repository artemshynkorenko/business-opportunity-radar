import type { NormalizedContent } from '../domain/index.js';
import type { CandidateDetectorInterface } from './candidate-detector-interface.js';
import type { CandidateResult } from './candidate-result.js';

/**
 * Signal definition: a named signal with patterns and a minimum match count
 * to avoid single-keyword false positives.
 */
interface SignalRule {
  name: string;
  /** Patterns are tested against lower-cased text. Match = at least one pattern hits. */
  patterns: RegExp[];
  /** How many patterns must match to count this signal */
  minMatches: number;
  weight: number; // contribution to overall confidence
}

/**
 * Noise rule: if ALL patterns match, the content is noise regardless of signal score.
 * This prevents strong negative signals (MLM, crypto, job seeking) from passing.
 */
interface NoiseRule {
  name: string;
  patterns: RegExp[];
  /** How many patterns must match to trigger noise rejection */
  minMatches: number;
}

/**
 * Rule-based candidate detector.
 *
 * Design: signal scoring, not keyword matching.
 * - Multiple signals accumulate confidence.
 * - Noise rules can veto regardless of positive signals.
 * - Single keyword hits are insufficient.
 */
export class RuleBasedCandidateDetector implements CandidateDetectorInterface {
  private readonly SIGNAL_THRESHOLD = 0.20; // minimum confidence to be a candidate
  private readonly MAX_CONFIDENCE = 1.0;

  private readonly signalRules: SignalRule[] = [
    // --- Business needs / pain ---
    {
      name: 'business-need',
      patterns: [
        /\b(looking for|searching for|need[s]?|seeking|want[s]? to find)\b.{0,40}(partner|distributor|supplier|manufacturer|investor|client|customer)/i,
        /\b(business need|operational challenge|bottleneck|pain point|struggle[sd]? with|can't (find|get|scale))\b/i,
        /\b(we need|i need).{0,30}(help|partner|solution|supplier|someone)\b/i,
      ],
      minMatches: 1,
      weight: 0.3,
    },
    // --- Partnership requests ---
    {
      name: 'partnership-request',
      patterns: [
        /\b(partner(ship)?|joint venture|jv|collaboration|co.?found)\b/i,
        /\b(looking for (a |an )?(business |strategic )?partner)\b/i,
        /\b(open to (partnership|collaboration|joint))\b/i,
        /\b(want[s]? to partner|interested in (partnering|collaboration))\b/i,
      ],
      minMatches: 1,
      weight: 0.25,
    },
    // --- Market entry ---
    {
      name: 'market-entry',
      patterns: [
        /\b(enter(ing)?|expand(ing)?|launch(ing)?).{0,30}(market|country|region|europe|asia|thailand|russia|us market|eu market)\b/i,
        /\b(market (entry|expansion|penetration))\b/i,
        /\b(export(ing)?|import(ing)?).{0,20}(to|from|into)\b/i,
        /\b(distributor|distribution network|sales channel).{0,30}(in|for|across)\b/i,
      ],
      minMatches: 1,
      weight: 0.25,
    },
    // --- Sourcing / manufacturing ---
    {
      name: 'sourcing',
      patterns: [
        /\b(manufactur|supplier|sourc|oem|private label|contract manufactur|factory)/i,
        /\b(looking for (a |an )?(manufacturer|supplier|factory|producer))\b/i,
        /\b(produce[sd]?|production capacity|wholesale|bulk order)\b/i,
      ],
      minMatches: 1,
      weight: 0.2,
    },
    // --- Automation pain ---
    {
      name: 'automation-pain',
      patterns: [
        /\b(automat(e|ion|ing)|manual(ly)?|repetitive|time.?consuming|inefficien)/i,
        /\b(spend[s]? .{0,20}hours?|waste[sd]? time|too much time on|takes? .{0,20}hours?)\b/i,
        /\b(workflow|process improvement|n8n|zapier|make\.com|no.?code)\b/i,
      ],
      minMatches: 2,
      weight: 0.2,
    },
    // --- Acquisition / succession ---
    {
      name: 'acquisition-succession',
      patterns: [
        /\b(sell(ing)? (the |my |our )?(business|company|shop|factory|operation))\b/i,
        /\b(acqui(re|sition)|buy(ing)? (a |the )?business|succession|exit strategy|stepping down|retire)\b/i,
        /\b(looking for (a |an )?(buyer|successor|new owner|acquirer))\b/i,
      ],
      minMatches: 1,
      weight: 0.35,
    },
    // --- Existing business with traction ---
    {
      name: 'existing-business-traction',
      patterns: [
        /\b(\d+\s?(year|yr)s? (in business|of operation|old company|running))\b/i,
        /\b(established|revenue|profit|clients?|customer base|turnover|annual sales)\b/i,
        /\b(we (currently|already|have been)|our company|our business)\b/i,
      ],
      minMatches: 2,
      weight: 0.2,
    },
    // --- Emerging demand / trend ---
    {
      name: 'emerging-demand',
      patterns: [
        /\b(growing demand|increasing (interest|requests?)|trend(ing)?|market (gap|opportunity))\b/i,
        /\b(we('ve| have) (seen|noticed|received) (more|increased|growing))\b/i,
        /\b(more and more (people|businesses|companies)|rising demand)\b/i,
      ],
      minMatches: 1,
      weight: 0.15,
    },
    // --- Project / operator needs ---
    {
      name: 'project-operator',
      patterns: [
        /\b(project (partner|help|support|collaboration))\b/i,
        /\b(need[s]? (someone|a person|an operator|a co.?founder).{0,30}(to|who|with))\b/i,
        /\b(building (something|a product|a service|a business)|side project|startup idea)\b/i,
      ],
      minMatches: 1,
      weight: 0.15,
    },
  ];

  private readonly noiseRules: NoiseRule[] = [
    {
      name: 'mlm',
      patterns: [
        /\b(mlm|multi.?level marketing|downline|upline|recruit|commission.based earning)\b/i,
        /\b(amway|herbalife|avon|forever living|network marketing opportunity)\b/i,
      ],
      minMatches: 1,
    },
    {
      name: 'crypto-web3',
      patterns: [
        /\b(crypto|bitcoin|ethereum|nft|web3|defi|token sale|ico|pump|altcoin|blockchain invest)\b/i,
        /\b(100x|moon|lambo|hodl|to the moon|buy the dip|ape in)\b/i,
      ],
      minMatches: 2,
    },
    {
      name: 'job-seeking',
      patterns: [
        /\b(looking for (a |an )?(job|position|role|employment|work opportunity))\b/i,
        /\b(resume|cv|curriculum vitae|years? of (work )?experience|open to (work|opportunities|roles))\b/i,
        /\b(hire me|i am (available|looking)|seeking (employment|full.?time|part.?time))\b/i,
      ],
      minMatches: 1,
    },
    {
      name: 'motivational',
      patterns: [
        /\b(hustle|grind|you can do it|believe in yourself|mindset|manifest|law of attraction)\b/i,
        /\b(wake up early|6am|morning routine|success mindset|entrepreneur mindset)\b/i,
      ],
      minMatches: 3,
    },
    {
      name: 'get-rich-scheme',
      patterns: [
        /\b(get rich (quick|fast|easy|overnight)|passive income (secret|hack|trick))\b/i,
        /\b(make \$\d+k? (a day|per day|daily|weekly) (from home|online|easily))\b/i,
        /\b(financial freedom (in \d+|fast|quickly|secret))\b/i,
      ],
      minMatches: 1,
    },
    {
      name: 'generic-announcement',
      patterns: [
        /\b(just launched|proud to announce|excited to share|thrilled to introduce)\b/i,
        /\b(check (out|us out)|follow (us|me)|subscribe|sign up for (our|my) newsletter)\b/i,
      ],
      minMatches: 3,
    },
  ];

  detect(content: NormalizedContent): CandidateResult {
    const text = this.buildSearchText(content);

    // --- Check noise rules first ---
    for (const noiseRule of this.noiseRules) {
      const matches = noiseRule.patterns.filter((p) => p.test(text)).length;
      if (matches >= noiseRule.minMatches) {
        return {
          isCandidate: false,
          signalTypes: [],
          confidence: 0,
          reasons: [`Rejected: noise signal '${noiseRule.name}' matched (${matches} patterns)`],
        };
      }
    }

    // --- Score positive signals ---
    const triggeredSignals: string[] = [];
    const reasons: string[] = [];
    let totalWeight = 0;

    for (const rule of this.signalRules) {
      const matches = rule.patterns.filter((p) => p.test(text)).length;
      if (matches >= rule.minMatches) {
        triggeredSignals.push(rule.name);
        reasons.push(`Signal '${rule.name}' matched (${matches}/${rule.patterns.length} patterns)`);
        totalWeight += rule.weight;
      }
    }

    const confidence = Math.min(totalWeight, this.MAX_CONFIDENCE);
    const isCandidate = confidence >= this.SIGNAL_THRESHOLD;

    if (!isCandidate && triggeredSignals.length === 0) {
      reasons.push('No meaningful opportunity signals detected');
    }

    return {
      isCandidate,
      signalTypes: triggeredSignals,
      confidence,
      reasons,
    };
  }

  private buildSearchText(content: NormalizedContent): string {
    const parts: string[] = [content.text];
    if (content.title) parts.push(content.title);
    return parts.join(' ');
  }
}
