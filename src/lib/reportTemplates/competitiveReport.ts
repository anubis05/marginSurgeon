/**
 * Competitive analysis report template.
 *
 * The competitive payload shape comes from MarketPositioningAgent — it is
 * LLM-produced JSON so we access all fields defensively.
 */
export function renderCompetitiveReportHtml(payload: any, reportUrl: string): string {
    const identity  = payload.identity  || {};
    const comp      = payload.competitive || payload;   // handle both wrapped and unwrapped shapes
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Try common keys the LLM may return
    const marketSummary:  string   = comp.market_summary  || comp.summary        || '';
    const positioning:    string   = comp.positioning      || comp.your_position  || '';
    const strengths:      string[] = comp.strengths        || comp.your_strengths || [];
    const weaknesses:     string[] = comp.weaknesses       || comp.your_weaknesses|| [];
    const opportunities:  string[] = comp.opportunities    || [];
    const threats:        string[] = comp.threats          || [];
    const competitors:    any[]    = comp.competitors      || payload.identity?.competitors || [];
    const recommendations:string[] = comp.recommendations  || comp.strategic_recommendations || [];

    const listItems = (arr: string[]) =>
        arr.map(s => `<li>${escHtml(s)}</li>`).join('');

    const swotHtml = `
    <div class="swot-grid">
      ${strengths.length ? `<div class="swot-card s"><div class="swot-label">Strengths</div><ul>${listItems(strengths)}</ul></div>` : ''}
      ${weaknesses.length ? `<div class="swot-card w"><div class="swot-label">Weaknesses</div><ul>${listItems(weaknesses)}</ul></div>` : ''}
      ${opportunities.length ? `<div class="swot-card o"><div class="swot-label">Opportunities</div><ul>${listItems(opportunities)}</ul></div>` : ''}
      ${threats.length ? `<div class="swot-card t"><div class="swot-label">Threats</div><ul>${listItems(threats)}</ul></div>` : ''}
    </div>`;

    const competitorRows = competitors.map((c: any) => `
    <tr>
      <td class="comp-name"><a href="${escHtml(c.url)}" target="_blank" rel="noopener">${escHtml(c.name)}</a></td>
      <td>${escHtml(c.cuisineType || c.type || '—')}</td>
      <td class="num">${escHtml(c.priceRange || '—')}</td>
      <td class="hide-sm">${escHtml(c.address || '—')}</td>
      <td class="rec-col">${escHtml(c.reason || c.weakness || c.differentiation || '—')}</td>
    </tr>`).join('');

    const recsHtml = recommendations.map((r, i) => `
    <div class="rec-item">
      <span class="rec-num">${i + 1}</span>
      <span>${escHtml(r)}</span>
    </div>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hephae Competitive Report — ${escHtml(identity.name || 'Your Business')}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg:#0f172a; --surface:#1e293b; --border:rgba(255,255,255,.08); --text:#f1f5f9; --muted:#94a3b8; --indigo:#818cf8; --amber:#f59e0b; --red:#f87171; --green:#4ade80; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; min-height:100vh; padding:2rem 1rem; }
  a { color:var(--indigo); }
  .container { max-width:900px; margin:0 auto; }
  .header { padding:1.5rem 2rem; background:var(--surface); border:1px solid var(--border); border-radius:1rem; margin-bottom:1.5rem; }
  .brand { font-size:.75rem; font-weight:700; letter-spacing:.1em; color:var(--muted); text-transform:uppercase; }
  .biz-name { font-size:1.5rem; font-weight:800; color:var(--amber); margin-top:.25rem; }
  .biz-sub { font-size:.8rem; color:var(--muted); margin-top:.2rem; }
  .section { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; margin-bottom:1rem; overflow:hidden; }
  .section-header { padding:1rem 1.5rem; border-bottom:1px solid var(--border); font-weight:700; font-size:.875rem; letter-spacing:.03em; }
  .section-body { padding:1.25rem 1.5rem; font-size:.875rem; color:var(--muted); line-height:1.7; }
  /* SWOT */
  .swot-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; padding:1rem 1.5rem; }
  .swot-card { border-radius:.5rem; padding:1rem; }
  .swot-card.s { background:rgba(74,222,128,.07); border:1px solid rgba(74,222,128,.2); }
  .swot-card.w { background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.2); }
  .swot-card.o { background:rgba(99,102,241,.07); border:1px solid rgba(99,102,241,.2); }
  .swot-card.t { background:rgba(245,158,11,.07); border:1px solid rgba(245,158,11,.2); }
  .swot-label { font-size:.65rem; text-transform:uppercase; letter-spacing:.08em; font-weight:700; margin-bottom:.5rem; }
  .swot-card.s .swot-label { color:var(--green); }
  .swot-card.w .swot-label { color:var(--red); }
  .swot-card.o .swot-label { color:var(--indigo); }
  .swot-card.t .swot-label { color:var(--amber); }
  .swot-card ul { list-style:none; }
  .swot-card li { font-size:.8rem; padding:.2rem 0; border-bottom:1px solid rgba(255,255,255,.05); line-height:1.4; }
  .swot-card li:last-child { border:none; }
  /* Table */
  table { width:100%; border-collapse:collapse; font-size:.82rem; }
  thead tr { background:rgba(255,255,255,.04); }
  th { padding:.75rem 1rem; text-align:left; font-size:.65rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:700; }
  .num { text-align:right; }
  tr { border-top:1px solid var(--border); }
  td { padding:.75rem 1rem; vertical-align:top; }
  .comp-name { font-weight:600; }
  .rec-col { color:var(--muted); font-size:.78rem; max-width:220px; }
  .hide-sm { }
  /* Recommendations */
  .rec-item { display:flex; gap:1rem; padding:.85rem 1.5rem; border-top:1px solid var(--border); font-size:.85rem; line-height:1.5; }
  .rec-num { flex-shrink:0; width:1.5rem; height:1.5rem; border-radius:50%; background:rgba(245,158,11,.2); color:var(--amber); display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:800; margin-top:.1rem; }
  .footer { text-align:center; padding:2rem; font-size:.75rem; color:var(--muted); }
  .share-link { display:inline-block; margin-top:.5rem; padding:.4rem 1rem; background:rgba(129,140,248,.15); border:1px solid rgba(129,140,248,.3); border-radius:2rem; color:var(--indigo); text-decoration:none; font-size:.75rem; }
  @media(max-width:600px) { .swot-grid { grid-template-columns:1fr; } .hide-sm { display:none; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">Hephae Competitive Intelligence Report</div>
    <div class="biz-name">${escHtml(identity.name || 'Your Business')}</div>
    <div class="biz-sub">${escHtml(identity.address || '')} · Generated ${date}</div>
  </div>

  ${marketSummary ? `
  <div class="section">
    <div class="section-header">📊 Market Summary</div>
    <div class="section-body">${escHtml(marketSummary)}</div>
  </div>` : ''}

  ${positioning ? `
  <div class="section">
    <div class="section-header">🎯 Your Market Position</div>
    <div class="section-body">${escHtml(positioning)}</div>
  </div>` : ''}

  ${(strengths.length || weaknesses.length || opportunities.length || threats.length) ? `
  <div class="section">
    <div class="section-header">⚡ SWOT Analysis</div>
    ${swotHtml}
  </div>` : ''}

  ${competitors.length ? `
  <div class="section">
    <div class="section-header">🥊 Competitor Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Competitor</th>
          <th>Cuisine</th>
          <th class="num">Price</th>
          <th class="hide-sm">Address</th>
          <th>Why They Matter</th>
        </tr>
      </thead>
      <tbody>${competitorRows}</tbody>
    </table>
  </div>` : ''}

  ${recommendations.length ? `
  <div class="section">
    <div class="section-header">🚀 Strategic Recommendations</div>
    ${recsHtml}
  </div>` : ''}

  <div class="footer">
    <div>Powered by <strong>Hephae</strong> — AI Restaurant Intelligence · hephae.co</div>
    <a href="${reportUrl}" class="share-link">🔗 Share this report</a>
  </div>
</div>
</body>
</html>`;
}

function escHtml(s: string | undefined): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
