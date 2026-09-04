import type { OpportunitySearchResult } from './opportunity-search-service.js';

/** Escape a string for safe insertion into HTML text/attributes. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLE = `
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem; line-height: 1.5; }
  h1 { font-size: 1.6rem; margin-bottom: .25rem; }
  .tagline { color: #666; margin-top: 0; }
  textarea { width: 100%; min-height: 6rem; font: inherit; padding: .75rem; box-sizing: border-box; border-radius: 8px; border: 1px solid #ccc; }
  .example { color: #888; font-size: .9rem; margin: .5rem 0 1rem; }
  button { font: inherit; padding: .6rem 1.1rem; border-radius: 8px; border: 0; background: #1d6fe0; color: #fff; cursor: pointer; }
  button.secondary { background: #444; }
  .status { border-left: 3px solid #1d6fe0; padding: .5rem .9rem; margin: 1rem 0; background: rgba(29,111,224,.06); }
  .card { border: 1px solid #ddd; border-radius: 10px; padding: 1rem; margin: 1rem 0; }
  .card h3 { margin: 0 0 .35rem; font-size: 1.05rem; }
  .meta { font-size: .82rem; color: #666; display: flex; gap: .75rem; flex-wrap: wrap; }
  .badge { background: #eef3fb; color: #1d6fe0; border-radius: 999px; padding: .1rem .6rem; font-size: .78rem; }
  .why { color: #555; font-size: .92rem; margin: .5rem 0; }
  a.threads { display: inline-block; margin-top: .4rem; }
  /* Neutral, high-contrast informational block (secondary connection notice).
     Light text on a dark slate surface — never white text on yellow. */
  .notice { background: #1f2430; color: #e8ebf2; border: 1px solid #333b4d; border-left: 3px solid #1d6fe0; padding: 1rem 1.1rem; border-radius: 8px; margin: 1.5rem 0; }
  .notice h2 { margin: 0 0 .35rem; font-size: 1.05rem; color: #fff; }
  .notice p { margin: 0 0 .75rem; color: #c7cede; font-size: .92rem; }
  .notice p.pending { color: #ffd479; }
  .notice button.secondary { background: #2f7ff0; color: #fff; }
`;

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export interface RenderHomeParams {
  threadsConnected: boolean;
  /** Previously entered intent to restore into the textarea (survives OAuth). */
  intent?: string;
  /**
   * True when the user pressed Discover while Threads was not connected. Shows a
   * short explanation that a connection is required; the intent is preserved.
   */
  pendingConnect?: boolean;
}

/**
 * The initial intent form.
 *
 * The intent textarea and the Discover button are NEVER disabled — the user can
 * describe what they want before connecting Threads. Threads connection is a
 * secondary, data-source requirement shown below the form. When the user tries
 * to Discover without a connection, their intent is preserved and carried
 * through the OAuth round trip so they never have to retype it.
 */
export function renderHome(params: RenderHomeParams): string {
  const intentValue = escapeHtml(params.intent ?? '');

  // The connect form carries the entered intent (hidden field) so it survives
  // the OAuth redirect and is restored automatically on return.
  const connectNotice = params.threadsConnected
    ? ''
    : `<div class="notice">
         <h2>Connect Threads to search public conversations</h2>
         <p>Radar uses your Threads connection to find conversations that may contain opportunities relevant to what you're looking for. Your Threads account is used for read-only access.</p>
         ${
           params.pendingConnect
             ? `<p class="pending">Connect Threads to run this search — we've kept what you typed.</p>`
             : ''
         }
         <form method="get" action="/auth/threads">
           <input type="hidden" name="intent" value="${intentValue}" />
           <button class="secondary" type="submit">Connect Threads</button>
         </form>
       </div>`;

  const body = `
    <h1>Discovery Radar</h1>
    <p class="tagline">Discover interesting people, conversations and possibilities.</p>

    <form method="post" action="/search">
      <label for="intent"><strong>What are you looking for?</strong></label>
      <p class="example">Example: "I’m looking for fellow silkworm-larvae enthusiasts in Thailand. Apparently, networking has gotten more interesting."</p>
      <textarea id="intent" name="intent" placeholder="Describe what you want to discover…">${intentValue}</textarea>
      <p><button type="submit">Discover</button></p>
    </form>
    <p class="example">You describe what you want to find. The Radar decides how to search for it — you never enter API keywords.</p>

    ${connectNotice}
  `;
  return layout('Discovery Radar', body);
}

/** Render the results page: the derived strategy, then opportunity cards. */
export function renderResults(result: OpportunitySearchResult): string {
  const familyItems = result.strategy.hypotheses.map((h) => `<li>${escapeHtml(h)}</li>`).join('');
  const queryItems = result.strategy.queries.map((q) => `<li><code>${escapeHtml(q)}</code></li>`).join('');

  const status = `
    <div class="status">
      <p><strong>Understanding your request…</strong></p>
      <p>Search strategy:</p>
      <ul>${familyItems}</ul>
      <p>Threads keyword queries the Radar derived (you did not type these):</p>
      <ul>${queryItems}</ul>
      <p>Searched Threads (RECENT) and processed ${result.contentFetched} retrieved post(s).</p>
    </div>`;

  const cards =
    result.opportunities.length === 0
      ? `<p>No opportunities matched this request in the current public results. Try describing your goal differently.</p>`
      : result.opportunities.map(renderCard).join('');

  const body = `
    <p><a href="/">← New search</a></p>
    <h1>Potential opportunities</h1>
    ${status}
    ${cards}
  `;
  return layout('Discovery Radar — Results', body);
}

function renderCard(o: OpportunitySearchResult['opportunities'][number]): string {
  const link =
    /^https?:\/\//.test(o.threadsUrl)
      ? `<a class="threads" href="${escapeHtml(o.threadsUrl)}" target="_blank" rel="noopener noreferrer">View on Threads →</a>`
      : `<span class="meta">Source: ${escapeHtml(o.threadsUrl)}</span>`;

  return `
    <div class="card">
      <h3>${escapeHtml(o.summary)}</h3>
      <div class="meta">
        <span class="badge">${escapeHtml(o.opportunityType)}</span>
        <span>Relevance: ${o.score}/100</span>
      </div>
      <p class="why">${escapeHtml(o.whyRelevant)}</p>
      ${link}
    </div>`;
}

/** A minimal error page. */
export function renderError(message: string): string {
  return layout(
    'Error — Discovery Radar',
    `<h1>Something went wrong</h1><p>${escapeHtml(message)}</p><p><a href="/">← Back</a></p>`
  );
}
