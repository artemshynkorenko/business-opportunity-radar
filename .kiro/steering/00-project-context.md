# Project Context

## Project
Business Opportunity Radar

## Purpose
A private AI-powered information discovery system that finds high-signal people, business opportunities, partnerships, market-entry opportunities, automation opportunities, projects, and emerging trends from public online conversations.

Core funnel:
signal → conversation → relationship → opportunity

## Current Phase
MVP Core v0.1.

The core is source-independent and validated with synthetic fixtures. Threads ingestion is now implemented (official Threads API, read-only keyword search) as the first real source adapter, kept isolated from the source-independent core. Reddit ingestion is not implemented yet.

## Primary Analytical Object
The primary analytical object is a Situation, not a Post.

Content is evidence. A Situation combines relevant content, author context, business context, needs, assets, timing, evidence, scores, and possible user actions.

## User Priority
1. Become partner in an existing business
2. International trade / distribution
3. Businesses entering new markets
4. Partnerships / JVs
5. Interesting business ideas
6. Automation opportunities
7. Manufacturers / suppliers
8. Entrepreneurial projects where help is needed
9. Emerging trends
10. Cofounder / business partner

## User Capabilities
- EU market access
- Russia/CIS market access
- Thailand access
- US market access
- entrepreneurial experience
- project launch and organization
- Czech export/import company
- US LLC
- remote/international business capability
- interest in automation and n8n

## Geographic Priority
Thailand 10, Russia/CIS 10, EU 8, SEA 8, USA 7, rest 5.

Geography is a multiplier, not a hard filter.

## Quality Principle
Optimize for signal quality, not volume.

The first milestone is 50–100 high-quality situations that can be manually evaluated.

## Important Constraints
- No scraping.
- Use official APIs only.
- No automated outreach.
- No automatic Reddit posting/commenting/messaging.
- No secrets in source code.
- Keep source-specific ingestion isolated from the core domain.
- Do not expand scope without explicit approval.
