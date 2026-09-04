import type {
  NormalizedContent,
  Author,
  Situation,
  Evidence,
  EvidenceSource,
  OpportunityType,
  BusinessStage,
  OpportunityScore,
  RelationshipConfidence,
} from '../domain/index.js';
import type { SituationExtractorInterface } from './situation-extractor-interface.js';

/**
 * Rule-based, deterministic situation extractor for MVP Core v0.1.
 * No LLM required. Every field is populated from text analysis.
 * Explicit vs inferred evidence is carefully distinguished.
 */
export class DeterministicSituationExtractor implements SituationExtractorInterface {
  extract(content: NormalizedContent, author: Author, _scanRunId: string): Situation {
    const text = content.text + (content.title ? ' ' + content.title : '');
    const lower = text.toLowerCase();
    const now = new Date();

    const evidence: Evidence[] = [];
    const geographies = this.extractGeographies(text, evidence);
    const businessStage = this.extractBusinessStage(lower, evidence);
    const needs = this.extractNeeds(lower, evidence);
    const assets = this.extractAssets(lower, evidence);
    const constraints = this.extractConstraints(lower, evidence);
    const opportunityTypes = this.extractOpportunityTypes(lower, evidence);
    const intent = this.extractIntent(lower);
    const timing = this.extractTiming(lower, evidence);
    const possibleUserRoles = this.derivePossibleUserRoles(opportunityTypes, needs);
    const possibleActions = this.derivePossibleActions(opportunityTypes, geographies);

    // Generate a title from content title or first 80 chars of text
    const title = content.title ?? text.substring(0, 80).replace(/\s+/g, ' ').trim();
    const summary = this.generateSummary(text, needs, opportunityTypes, geographies);

    // Placeholder scores — will be filled by the scorer
    const opportunityScore: OpportunityScore = {
      total: 0,
      breakdown: {},
      explanation: 'Pending scoring',
    };
    const relationshipConfidence: RelationshipConfidence = {
      score: 0,
      explanation: 'Pending scoring',
      factors: [],
    };

    return {
      situationId: `sit-${content.contentId}`,
      title,
      summary,
      authorId: author.id,
      businessId: undefined,
      sourceContentIds: [content.contentId],
      relatedContentIds: [],
      permalink: content.permalink,
      language: content.language ?? 'en',
      geographies,
      businessStage,
      assets,
      needs,
      constraints,
      intent,
      opportunityTypes,
      demandCapacitySignal: this.extractDemandCapacitySignal(lower),
      timing,
      evidence,
      opportunityScore,
      relationshipConfidence,
      possibleUserRoles,
      possibleActions,
      status: 'new',
      firstSeenAt: content.timestamp,
      lastSeenAt: content.timestamp,
      createdAt: now,
      updatedAt: now,
    };
  }

  // -------------------------------------------------------------------------
  // Geography extraction
  // -------------------------------------------------------------------------
  private extractGeographies(text: string, evidence: Evidence[]): string[] {
    const geoMap: Record<string, RegExp> = {
      Thailand: /\b(thailand|thai|bangkok|chiang mai|chiang rai|phuket)\b/i,
      Russia: /\b(russia|russian|moscow|saint.?petersburg|cis)\b/i,
      'Czech Republic': /\b(czech|czechia|prague|brno|ostrava)\b/i,
      EU: /\b(europe(an)?|eu market|european union|germany|france|netherlands|spain|italy|poland)\b/i,
      USA: /\b(usa|united states|us market|america)\b/i,
      SEA: /\b(southeast asia|sea|vietnam|indonesia|malaysia|singapore|philippines|myanmar)\b/i,
      China: /\b(china|chinese|guangzhou|shenzhen|beijing|shanghai)\b/i,
    };

    const geos: string[] = [];
    for (const [name, pattern] of Object.entries(geoMap)) {
      const match = pattern.exec(text);
      if (match) {
        geos.push(name);
        evidence.push({
          claim: `Geography: ${name}`,
          explicit: true,
          source: 'direct' as EvidenceSource,
          quote: match[0],
          confidence: 0.9,
        });
      }
    }

    return geos.length > 0 ? geos : ['Unknown'];
  }

  // -------------------------------------------------------------------------
  // Business stage
  // -------------------------------------------------------------------------
  private extractBusinessStage(lower: string, evidence: Evidence[]): BusinessStage {
    if (/\b(established|years? in business|running for \d+|long.?standing|since \d{4})\b/.test(lower) ||
        /\bfor \d+ years\b/.test(lower) ||
        /\d+\s?years? (in business|of (operation|running|manufacturing|experience))\b/.test(lower)) {
      evidence.push({
        claim: 'Business is established',
        explicit: true,
        source: 'direct',
        confidence: 0.85,
      });
      return 'established';
    }
    if (/\b(growing|scaling|growth stage|series [ab]|funding round)\b/.test(lower)) {
      evidence.push({
        claim: 'Business is in growth stage',
        explicit: false,
        source: 'inferred',
        confidence: 0.6,
      });
      return 'growth';
    }
    if (/\b(early stage|just started|recently launched|new business|startup)\b/.test(lower)) {
      evidence.push({
        claim: 'Business is early-stage',
        explicit: false,
        source: 'inferred',
        confidence: 0.55,
      });
      return 'early';
    }
    if (/\b(idea|concept|thinking of|planning to start|want to build)\b/.test(lower)) {
      evidence.push({
        claim: 'Business is at idea stage',
        explicit: false,
        source: 'inferred',
        confidence: 0.5,
      });
      return 'idea';
    }
    return 'unknown';
  }

  // -------------------------------------------------------------------------
  // Needs extraction
  // -------------------------------------------------------------------------
  private extractNeeds(lower: string, evidence: Evidence[]): string[] {
    const needs: string[] = [];

    const needPatterns: Array<[string, RegExp]> = [
      ['EU distribution partner', /\b(eu|european).{0,30}(distribut|distribution|partner|reseller)/i],
      ['US market access', /\b(us|american|american market).{0,30}(access|entry|partner|distribution)/i],
      ['manufacturing/sourcing', /\b(manufactur|supplier|sourc|factory|oem|contract.{0,10}manufactur)/i],
      ['automation help', /\b(automat|n8n|zapier|workflow|manual process|repetitive)/i],
      ['business partner', /\b(business partner|co.?founder|partner(ship)?)\b/i],
      ['market entry support', /\b(market entry|enter(ing)? (the )?market|expand(ing)? to)\b/i],
      ['investor/capital', /\b(investor|investment|funding|capital|raise)\b/i],
      ['succession/buyer', /\b(successor|buyer|acquir|sell(ing)? (the )?business)\b/i],
      ['local operator', /\b(local (partner|operator|presence)|on.?the.?ground)\b/i],
      ['distribution network', /\b(distribution (network|channel|partner)|wholesale|reseller)\b/i],
    ];

    for (const [label, pattern] of needPatterns) {
      if (pattern.test(lower)) {
        needs.push(label);
        evidence.push({
          claim: `Need identified: ${label}`,
          explicit: /\b(looking for|need[s]?|seeking|want[s]?|require[s]?)\b/i.test(lower),
          source: 'direct',
          confidence: 0.75,
        });
      }
    }

    return needs;
  }

  // -------------------------------------------------------------------------
  // Assets extraction
  // -------------------------------------------------------------------------
  private extractAssets(lower: string, evidence: Evidence[]): string[] {
    const assets: string[] = [];

    const assetPatterns: Array<[string, RegExp]> = [
      ['manufacturing capability', /\b(manufactur|factory|production (line|capacity)|we produce|we make)/i],
      ['established customer base', /\b(customer base|existing client|loyal customer|established client)\b/i],
      ['distribution network', /\b(distribution network|established (channel|network|partner)|dealer network)\b/i],
      ['technology/software', /\b(software|saas|platform|app|technology|tech stack)\b/i],
      ['local market knowledge', /\b(local (knowledge|market|expertise|connections?)|know the market)\b/i],
      ['EU market access', /\b(eu (market )?access|eu (presence|footprint)|selling in (europe|eu))\b/i],
      ['Thailand market access', /\b(thai(land)? (market )?access|presence in thailand|operating in thailand)\b/i],
      ['Russia/CIS market access', /\b(russia|cis) (market |)(access|presence|operations?)\b/i],
      ['operational team', /\b(team of \d+|our team|experienced team|staff of)\b/i],
      ['proprietary product', /\b(our product|proprietary|own (brand|label|product))\b/i],
    ];

    for (const [label, pattern] of assetPatterns) {
      if (pattern.test(lower)) {
        assets.push(label);
        evidence.push({
          claim: `Asset identified: ${label}`,
          explicit: false,
          source: 'inferred',
          confidence: 0.65,
        });
      }
    }

    return assets;
  }

  // -------------------------------------------------------------------------
  // Constraints
  // -------------------------------------------------------------------------
  private extractConstraints(lower: string, evidence: Evidence[]): string[] {
    const constraints: string[] = [];

    const constraintPatterns: Array<[string, RegExp]> = [
      ['limited budget', /\b(limited budget|bootstrap|no funding|self.?funded|low budget)\b/i],
      ['language barrier', /\b(language barrier|don.t speak|no (english|thai|russian|german))\b/i],
      ['no local presence', /\b(no (local|on.?site|physical) (presence|office|team))\b/i],
      ['regulatory constraints', /\b(regulation|compliance|import (duty|tax|restriction)|customs)\b/i],
      ['time constraint', /\b(urgent|asap|need.{0,10}quickly|time.?sensitive|deadline)\b/i],
      ['capacity constraint', /\b(capacity (limit|constraint|issue)|can.t (scale|handle|cope))\b/i],
    ];

    for (const [label, pattern] of constraintPatterns) {
      if (pattern.test(lower)) {
        constraints.push(label);
        evidence.push({
          claim: `Constraint identified: ${label}`,
          explicit: false,
          source: 'contextual',
          confidence: 0.6,
        });
      }
    }

    return constraints;
  }

  // -------------------------------------------------------------------------
  // Opportunity types
  // -------------------------------------------------------------------------
  private extractOpportunityTypes(lower: string, _evidence: Evidence[]): OpportunityType[] {
    const types: OpportunityType[] = [];

    if (/\b(partner(ship)?|joint venture|jv)\b/.test(lower)) types.push('partnership');
    if (/\b(distribut|resell|wholesale|dealer|channel)/.test(lower)) types.push('distribution');
    if (/\b(market.?entry|enter.{0,20}market|expand.{0,20}(to|into))\b/.test(lower)) types.push('market-entry');
    if (/\b(sourc|manufactur|supplier|factory|oem)/.test(lower)) types.push('sourcing');
    if (/\b(automat|workflow|n8n|zapier|manual process)/.test(lower)) types.push('automation');
    if (/\b(acqui(re|sition)|buy.{0,10}business)\b/.test(lower)) types.push('acquisition');
    if (/\b(succession|successor|stepping down|exit|retire)\b/.test(lower)) types.push('succession');
    if (/\b(invest|funding|capital|raise)\b/.test(lower)) types.push('investment');
    if (/\b(project|side project|build(ing)?|startup)\b/.test(lower)) types.push('project');
    if (/\b(co.?found|cofounder|business partner)\b/.test(lower)) types.push('cofounder');
    if (/\b(trend|growing demand|emerging|market gap)\b/.test(lower)) types.push('emerging-trend');

    return types.length > 0 ? [...new Set(types)] : ['other'];
  }

  // -------------------------------------------------------------------------
  // Intent
  // -------------------------------------------------------------------------
  private extractIntent(lower: string): string {
    if (/\b(sell(ing)? (the )?business|exit|succession)\b/.test(lower)) {
      return 'Exit / find successor';
    }
    if (/\b(expand|enter.{0,20}market|grow.{0,20}(internationally|globally))\b/.test(lower)) {
      return 'Expand to new markets';
    }
    if (/\b(find.{0,20}(partner|co.?founder)|partner(ship)?)\b/.test(lower)) {
      return 'Find business partner';
    }
    if (/\b(distribut|resell|channel partner)\b/.test(lower)) {
      return 'Build distribution';
    }
    if (/\b(automat|improve.{0,20}(process|workflow|operation))\b/.test(lower)) {
      return 'Automate operations';
    }
    if (/\b(sourc|manufactur|find.{0,20}supplier)\b/.test(lower)) {
      return 'Source / manufacture';
    }
    return 'Business opportunity';
  }

  // -------------------------------------------------------------------------
  // Timing
  // -------------------------------------------------------------------------
  private extractTiming(lower: string, evidence: Evidence[]): string | undefined {
    if (/\b(urgent|asap|immediately|right away|as soon as possible)\b/.test(lower)) {
      evidence.push({
        claim: 'Urgent timing expressed',
        explicit: true,
        source: 'direct',
        confidence: 0.9,
      });
      return 'Urgent';
    }
    if (/\b(within (a |the )?(month|quarter|year)|soon|this (year|quarter))\b/.test(lower)) {
      evidence.push({
        claim: 'Near-term timing expressed',
        explicit: true,
        source: 'direct',
        confidence: 0.75,
      });
      return 'Near-term';
    }
    if (/\b(planning|future|eventually|long.?term)\b/.test(lower)) {
      return 'Long-term';
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Demand–capacity signal
  // -------------------------------------------------------------------------
  private extractDemandCapacitySignal(lower: string): string | undefined {
    if (/\b(more (orders?|demand|requests?|clients?) than (we can|capacity))\b/.test(lower)) {
      return 'Demand exceeds capacity';
    }
    if (/\b(can.t (find|source|get)|shortage of|lack of (supply|manufacturer|supplier))\b/.test(lower)) {
      return 'Supply gap identified';
    }
    if (/\b(under.?utilized|spare capacity|extra capacity|have capacity for more)\b/.test(lower)) {
      return 'Excess capacity available';
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Possible user roles
  // -------------------------------------------------------------------------
  private derivePossibleUserRoles(
    opportunityTypes: OpportunityType[],
    needs: string[]
  ): string[] {
    const roles = new Set<string>();

    if (opportunityTypes.includes('distribution') || needs.includes('EU distribution partner')) {
      roles.add('distributor');
    }
    if (opportunityTypes.includes('market-entry') || needs.includes('market entry support')) {
      roles.add('market-entry-partner');
    }
    if (opportunityTypes.includes('partnership') || needs.includes('business partner')) {
      roles.add('partner');
    }
    if (opportunityTypes.includes('sourcing') || needs.includes('manufacturing/sourcing')) {
      roles.add('sourcing-partner');
    }
    if (opportunityTypes.includes('automation') || needs.includes('automation help')) {
      roles.add('automation-implementer');
    }
    if (opportunityTypes.includes('acquisition') || opportunityTypes.includes('succession')) {
      roles.add('partner');
    }
    if (opportunityTypes.includes('project') || opportunityTypes.includes('cofounder')) {
      roles.add('project-partner');
    }
    if (roles.size === 0) {
      roles.add('connector');
    }

    return [...roles];
  }

  // -------------------------------------------------------------------------
  // Possible actions
  // -------------------------------------------------------------------------
  /**
   * Generic, situation-level possibilities implied by the opportunity types.
   *
   * These describe what the SITUATION invites in general terms. They are NOT
   * recommendations tailored to any specific user's capabilities — user-specific
   * offers/next-actions belong to personalized matching and card generation.
   */
  private derivePossibleActions(
    opportunityTypes: OpportunityType[],
    _geographies: string[]
  ): string[] {
    const actions: string[] = [];

    if (opportunityTypes.includes('distribution')) {
      actions.push('Discuss a distribution arrangement');
    }
    if (opportunityTypes.includes('market-entry')) {
      actions.push('Explore market-entry support and local presence');
    }
    if (opportunityTypes.includes('partnership')) {
      actions.push('Discuss partnership structure');
    }
    if (opportunityTypes.includes('sourcing')) {
      actions.push('Discuss sourcing / manufacturing options');
    }
    if (opportunityTypes.includes('automation')) {
      actions.push('Discuss process automation opportunities');
    }
    if (opportunityTypes.includes('succession') || opportunityTypes.includes('acquisition')) {
      actions.push('Explore an acquisition/succession discussion');
    }
    if (actions.length === 0) {
      actions.push('Research further and engage in conversation');
    }

    return actions;
  }

  // -------------------------------------------------------------------------
  // Summary generation
  // -------------------------------------------------------------------------
  private generateSummary(
    text: string,
    needs: string[],
    opportunityTypes: OpportunityType[],
    geographies: string[]
  ): string {
    const geoStr = geographies.filter((g) => g !== 'Unknown').join(', ') || 'unknown location';
    const typeStr = opportunityTypes.slice(0, 2).join(', ') || 'opportunity';
    const needStr = needs.slice(0, 2).join(', ') || 'unspecified needs';
    const snippet = text.substring(0, 150).replace(/\s+/g, ' ').trim();

    return `${typeStr} in ${geoStr}: ${needStr}. "${snippet}..."`;
  }
}
