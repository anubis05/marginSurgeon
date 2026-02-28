import type { SurgicalReport } from '@/lib/types';

export function renderSurgeonReportHtml(report: SurgicalReport, reportUrl: string): string {
    const { identity, menu_items, strategic_advice, overall_score, generated_at } = report;
    const totalLeakage = menu_items.reduce((s, i) => s + i.price_leakage, 0);
    const topLeaks = [...menu_items]
        .filter(i => i.price_leakage > 0)
        .sort((a, b) => b.price_leakage - a.price_leakage);
    const maxLeakage = topLeaks[0]?.price_leakage || 1;
    const scoreColor = overall_score >= 80 ? '#4ade80' : overall_score >= 60 ? '#fbbf24' : '#f87171';
    const date = new Date(generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const rowsHtml = topLeaks.map(item => {
        const barPct = Math.round((item.price_leakage / maxLeakage) * 100);
        return `
        <tr class="item-row" onclick="this.classList.toggle('expanded')">
          <td class="item-name">
            <span class="item-toggle">▶</span>
            ${escHtml(item.item_name)}
            <div class="item-rationale">${escHtml(item.rationale)}</div>
          </td>
          <td class="num">$${item.competitor_benchmark.toFixed(2)}</td>
          <td class="num">$${item.current_price.toFixed(2)}</td>
          <td class="num rec">$${item.recommended_price.toFixed(2)}</td>
          <td class="num leak">
            +$${item.price_leakage.toFixed(2)}
            <div class="bar-wrap"><div class="bar" style="width:${barPct}%"></div></div>
          </td>
        </tr>`;
    }).join('');

    const adviceHtml = (strategic_advice || []).map((tip, i) => `
        <div class="advice-item">
          <span class="advice-num">${i + 1}</span>
          <span>${escHtml(tip)}</span>
        </div>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hephae Margin Surgery — ${escHtml(identity.name)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f172a; --surface: #1e293b; --border: rgba(255,255,255,.08);
    --text: #f1f5f9; --muted: #94a3b8;
    --red: #f87171; --green: #4ade80; --amber: #fbbf24; --indigo: #818cf8;
  }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; min-height: 100vh; padding: 2rem 1rem; }
  a { color: var(--indigo); }
  .container { max-width: 900px; margin: 0 auto; }
  /* Header */
  .header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2rem;
    background: var(--surface); border: 1px solid var(--border); border-radius: 1rem; margin-bottom: 1.5rem; }
  .brand { font-size: .75rem; font-weight: 700; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; margin-bottom: .25rem; }
  .biz-name { font-size: 1.5rem; font-weight: 800; color: ${escHtml(identity.primaryColor || '#818cf8')}; }
  .biz-persona { font-size: .85rem; color: var(--muted); margin-top: .25rem; }
  .score-ring { text-align: center; }
  .score-val { font-size: 2.5rem; font-weight: 900; color: ${scoreColor}; line-height: 1; }
  .score-label { font-size: .65rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
  /* Stat cards */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: .75rem; padding: 1.25rem 1.5rem; }
  .stat-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: .5rem; }
  .stat-val { font-size: 2rem; font-weight: 800; }
  .stat-val.red { color: var(--red); }
  .stat-val.green { color: var(--green); }
  /* Table */
  .section { background: var(--surface); border: 1px solid var(--border); border-radius: .75rem; margin-bottom: 1.5rem; overflow: hidden; }
  .section-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); font-weight: 700; font-size: .9rem; letter-spacing: .03em; }
  table { width: 100%; border-collapse: collapse; font-size: .85rem; }
  thead tr { background: rgba(255,255,255,.04); }
  th { padding: .75rem 1rem; text-align: left; font-size: .65rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); font-weight: 700; }
  .num { text-align: right; }
  .item-row { cursor: pointer; border-top: 1px solid var(--border); transition: background .15s; }
  .item-row:hover { background: rgba(255,255,255,.03); }
  .item-row.expanded { background: rgba(99,102,241,.06); }
  td { padding: .75rem 1rem; vertical-align: middle; }
  .item-name { font-weight: 600; }
  .item-toggle { font-size: .6rem; color: var(--muted); margin-right: .5rem; transition: transform .2s; }
  .item-row.expanded .item-toggle { transform: rotate(90deg); display: inline-block; }
  .item-rationale { display: none; font-size: .75rem; color: var(--muted); font-weight: 400; margin-top: .4rem; line-height: 1.4; }
  .item-row.expanded .item-rationale { display: block; }
  .rec { color: var(--green); font-weight: 700; }
  .leak { color: var(--red); font-weight: 700; white-space: nowrap; }
  .bar-wrap { background: rgba(248,113,113,.15); border-radius: 2px; height: 3px; margin-top: .35rem; }
  .bar { background: var(--red); height: 100%; border-radius: 2px; }
  /* Advice */
  .advice-item { display: flex; gap: 1rem; padding: .85rem 1.5rem; border-top: 1px solid var(--border); font-size: .85rem; line-height: 1.5; }
  .advice-num { flex-shrink: 0; width: 1.5rem; height: 1.5rem; border-radius: 50%; background: rgba(129,140,248,.2); color: var(--indigo); display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 800; margin-top: .1rem; }
  /* Footer */
  .footer { text-align: center; padding: 2rem; font-size: .75rem; color: var(--muted); }
  .share-link { display: inline-block; margin-top: .5rem; padding: .4rem 1rem; background: rgba(129,140,248,.15); border: 1px solid rgba(129,140,248,.3); border-radius: 2rem; color: var(--indigo); text-decoration: none; font-size: .75rem; }
  @media (max-width: 600px) { .header { flex-direction: column; gap: 1rem; } th.hide-sm, td.hide-sm { display: none; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="brand">Hephae Margin Surgery Report</div>
      <div class="biz-name">${escHtml(identity.name)}</div>
      ${identity.persona ? `<div class="biz-persona">${escHtml(identity.persona)}</div>` : ''}
      <div class="biz-persona" style="margin-top:.5rem">Generated ${date}</div>
    </div>
    <div class="score-ring">
      <div class="score-val">${overall_score}</div>
      <div class="score-label">Surgical Score</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Total Profit Leakage / Cycle</div>
      <div class="stat-val red">$${totalLeakage.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Items Analyzed</div>
      <div class="stat-val">${menu_items.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Underpriced Items</div>
      <div class="stat-val red">${topLeaks.length}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">📋 Surgical Breakdown — click any row to expand rationale</div>
    <table>
      <thead>
        <tr>
          <th>Menu Item</th>
          <th class="num hide-sm">Market Benchmark</th>
          <th class="num">Current Price</th>
          <th class="num">Recommended</th>
          <th class="num">Leakage</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  ${strategic_advice?.length ? `
  <div class="section">
    <div class="section-header">🎯 Strategic Advice</div>
    ${adviceHtml}
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
