/**
 * Social Media Strategy single-page interactive HTML report.
 *
 * Features:
 * - Score dial with animated fill
 * - Platform channel cards (colour-coded by score)
 * - Competitor social table with threat-level bars
 * - Gap analysis pills
 * - Content pillar accordion (expandable)
 * - Quick wins checklist (interactive checkboxes)
 * - 30-day plan timeline
 * - Copy-to-clipboard share button
 */
import type { SocialStrategyReport, SocialChannelAudit, CompetitorSocialProfile, ContentPillar } from '@/lib/types';

function esc(s: string | undefined | null): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PLATFORM_COLORS: Record<string, string> = {
    Instagram: '#E1306C',
    TikTok:    '#010101',
    Facebook:  '#1877F2',
    YouTube:   '#FF0000',
    LinkedIn:  '#0A66C2',
    Yelp:      '#D32323',
};

function platformColor(p: string): string {
    return PLATFORM_COLORS[p] ?? '#6366f1';
}

function scoreColor(s: number): string {
    if (s >= 70) return '#4ade80';
    if (s >= 40) return '#fbbf24';
    return '#f87171';
}

function engagementBadge(level: string): string {
    const map: Record<string, string> = {
        none:   'background:#1e293b;color:#64748b',
        low:    'background:rgba(248,113,113,.15);color:#f87171',
        medium: 'background:rgba(251,191,36,.15);color:#fbbf24',
        high:   'background:rgba(74,222,128,.15);color:#4ade80',
    };
    return `<span style="padding:.2rem .6rem;border-radius:9999px;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;${map[level] ?? map.none}">${esc(level)}</span>`;
}

function channelCards(audits: SocialChannelAudit[]): string {
    return audits.map(a => {
        const color  = platformColor(a.platform);
        const sColor = scoreColor(a.score);
        const weaknesses = (a.weaknesses ?? []).map(w => `<li>${esc(w)}</li>`).join('');
        return `
<div class="channel-card" style="border-top:3px solid ${color}">
  <div class="ch-header">
    <div class="ch-platform" style="color:${color}">${esc(a.platform)}</div>
    <div class="ch-score" style="color:${sColor}">${a.score}<span style="font-size:.7rem;opacity:.6">/100</span></div>
  </div>
  <div class="ch-meta">
    ${a.estimatedFollowers ? `<span class="meta-pill">👥 ${esc(a.estimatedFollowers)}</span>` : ''}
    ${a.postingFrequency   ? `<span class="meta-pill">📅 ${esc(a.postingFrequency)}</span>`   : ''}
    ${engagementBadge(a.engagementLevel)}
  </div>
  ${a.topContentType ? `<div class="ch-content-type">🎬 ${esc(a.topContentType)}</div>` : ''}
  ${weaknesses ? `<ul class="ch-weaknesses">${weaknesses}</ul>` : ''}
  ${a.url ? `<a href="${esc(a.url)}" target="_blank" class="ch-link">View Profile →</a>` : ''}
</div>`;
    }).join('');
}

function competitorRows(profiles: CompetitorSocialProfile[]): string {
    return profiles.map(c => {
        const platforms = (c.platforms ?? []).map(p =>
            `<span class="comp-platform" style="background:${platformColor(p.platform)}22;color:${platformColor(p.platform)}">${esc(p.platform)}${p.estimatedFollowers ? ` ${esc(p.estimatedFollowers)}` : ''}</span>`
        ).join('');
        const threat = Math.min(10, Math.max(0, c.threatLevel ?? 0));
        return `
<tr>
  <td class="comp-name">${esc(c.name)}</td>
  <td><div class="comp-platforms">${platforms}</div></td>
  <td class="comp-total">${esc(c.totalEstimatedFollowers ?? '—')}</td>
  <td class="comp-strong">${esc(c.strongestPlatform ?? '—')}</td>
  <td>
    <div class="threat-bar-wrap">
      <div class="threat-bar" style="width:${threat * 10}%;background:${threat >= 7 ? '#f87171' : threat >= 4 ? '#fbbf24' : '#4ade80'}"></div>
    </div>
    <div class="threat-label">${threat}/10</div>
  </td>
</tr>`;
    }).join('');
}

function pillars(ps: ContentPillar[]): string {
    return ps.map((p, i) => `
<div class="pillar-item">
  <div class="pillar-toggle" onclick="togglePillar(${i})">
    <div class="pillar-left">
      <span style="color:${platformColor(p.platform)};font-weight:800">${esc(p.platform)}</span>
      <span class="pillar-name">${esc(p.name)}</span>
      <span class="pillar-freq">${esc(p.postingFrequency)}</span>
    </div>
    <span class="pillar-arrow" id="pillar-icon-${i}">▶</span>
  </div>
  <div class="pillar-body" id="pillar-${i}">
    <div class="pillar-rationale">${esc(p.rationale)}</div>
    <div class="pillar-example"><strong>Example post idea:</strong><br>${esc(p.examplePrompt)}</div>
  </div>
</div>`).join('');
}

function quickWinItems(items: string[]): string {
    return items.map((w, i) => `
<label class="qw-item" for="qw-${i}">
  <input type="checkbox" id="qw-${i}" onchange="this.parentElement.classList.toggle('done',this.checked)">
  <span class="qw-text">${esc(w)}</span>
</label>`).join('');
}

function planTimeline(steps: string[]): string {
    return steps.map((s, i) => `
<div class="plan-step">
  <div class="plan-dot" style="background:${['#818cf8','#a78bfa','#c084fc','#e879f9'][i] ?? '#818cf8'}"></div>
  <div class="plan-content">
    <div class="plan-week">Week ${i + 1}</div>
    <div class="plan-text">${esc(s.replace(/^Week \d+:\s*/i, ''))}</div>
  </div>
</div>`).join('');
}

export function renderSocialStrategyReportHtml(report: SocialStrategyReport, reportUrl: string): string {
    const { business, overallScore, executiveSummary, channelAudits, competitorProfiles,
        gapAnalysis, contentPillars, quickWins, thirtyDayPlan, generatedAt } = report;

    const date = new Date(generatedAt ?? Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const sColor = scoreColor(overallScore ?? 0);

    const gapPills = (gapAnalysis ?? []).map(g =>
        `<div class="gap-pill">${esc(g)}</div>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hephae Social Strategy — ${esc(business?.name)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#0f172a; --surface:#1e293b; --surface2:#162032;
    --border:rgba(255,255,255,.07); --text:#f1f5f9; --muted:#94a3b8;
    --indigo:#818cf8; --amber:#f59e0b; --red:#f87171; --green:#4ade80; --purple:#a78bfa;
  }
  body { background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,sans-serif; min-height:100vh; padding:2rem 1rem; }
  a { color:var(--indigo); text-decoration:none; }
  .container { max-width:960px; margin:0 auto; }

  /* Header */
  .header { padding:1.75rem 2rem; background:var(--surface); border:1px solid var(--border); border-radius:1rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
  .header-left .brand { font-size:.7rem; font-weight:700; letter-spacing:.1em; color:var(--muted); text-transform:uppercase; }
  .header-left .biz-name { font-size:1.5rem; font-weight:800; color:var(--purple); margin-top:.25rem; }
  .header-left .biz-sub { font-size:.8rem; color:var(--muted); margin-top:.2rem; }
  .score-circle { flex-shrink:0; width:80px; height:80px; border-radius:50%; border:4px solid ${sColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .score-num { font-size:1.5rem; font-weight:900; color:${sColor}; line-height:1; }
  .score-lbl { font-size:.55rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; margin-top:.15rem; }

  /* Sections */
  .section { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; margin-bottom:1rem; overflow:hidden; }
  .sh { padding:1rem 1.5rem; border-bottom:1px solid var(--border); font-weight:700; font-size:.875rem; letter-spacing:.03em; display:flex; align-items:center; gap:.5rem; }
  .sb { padding:1.25rem 1.5rem; font-size:.875rem; color:var(--muted); line-height:1.7; }

  /* Channel cards */
  .channels-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:.75rem; padding:1rem 1.5rem; }
  .channel-card { background:var(--surface2); border:1px solid var(--border); border-radius:.75rem; padding:1rem; }
  .ch-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:.6rem; }
  .ch-platform { font-size:.9rem; font-weight:800; }
  .ch-score { font-size:1.25rem; font-weight:900; }
  .ch-meta { display:flex; flex-wrap:wrap; gap:.35rem; margin-bottom:.5rem; }
  .meta-pill { background:rgba(255,255,255,.06); border-radius:9999px; padding:.2rem .6rem; font-size:.65rem; color:var(--muted); }
  .ch-content-type { font-size:.75rem; color:var(--muted); margin:.4rem 0; }
  .ch-weaknesses { list-style:none; margin-top:.4rem; }
  .ch-weaknesses li { font-size:.72rem; color:#f87171; padding:.15rem 0; border-bottom:1px solid rgba(255,255,255,.04); }
  .ch-weaknesses li:last-child { border:none; }
  .ch-link { display:inline-block; margin-top:.5rem; font-size:.7rem; color:var(--indigo); }

  /* Competitor table */
  table { width:100%; border-collapse:collapse; font-size:.82rem; }
  thead tr { background:rgba(255,255,255,.04); }
  th { padding:.75rem 1rem; text-align:left; font-size:.65rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:700; }
  tr { border-top:1px solid var(--border); }
  td { padding:.75rem 1rem; vertical-align:middle; }
  .comp-name { font-weight:700; color:var(--text); }
  .comp-platforms { display:flex; flex-wrap:wrap; gap:.3rem; }
  .comp-platform { padding:.2rem .5rem; border-radius:4px; font-size:.65rem; font-weight:700; }
  .comp-total { font-weight:600; color:var(--purple); }
  .comp-strong { color:var(--muted); font-size:.8rem; }
  .threat-bar-wrap { background:rgba(255,255,255,.06); border-radius:9999px; height:6px; width:80px; overflow:hidden; }
  .threat-bar { height:100%; border-radius:9999px; transition:width .6s; }
  .threat-label { font-size:.65rem; color:var(--muted); margin-top:.2rem; }

  /* Gap analysis */
  .gap-pills { display:flex; flex-direction:column; gap:.5rem; padding:1rem 1.5rem; }
  .gap-pill { background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.2); border-radius:.5rem; padding:.75rem 1rem; font-size:.82rem; color:#fca5a5; line-height:1.5; }
  .gap-pill::before { content:"⚠ "; }

  /* Content pillars */
  .pillar-item { border-top:1px solid var(--border); }
  .pillar-item:first-child { border:none; }
  .pillar-toggle { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; cursor:pointer; user-select:none; }
  .pillar-toggle:hover { background:rgba(255,255,255,.02); }
  .pillar-left { display:flex; align-items:center; gap:.75rem; flex-wrap:wrap; }
  .pillar-name { font-weight:600; font-size:.875rem; }
  .pillar-freq { font-size:.7rem; color:var(--muted); background:rgba(255,255,255,.05); padding:.15rem .5rem; border-radius:9999px; }
  .pillar-arrow { color:var(--muted); font-size:.7rem; transition:transform .2s; }
  .pillar-body { display:none; padding:.5rem 1.5rem 1.25rem; }
  .pillar-body.open { display:block; }
  .pillar-rationale { font-size:.82rem; color:var(--muted); margin-bottom:.75rem; line-height:1.6; }
  .pillar-example { background:rgba(129,140,248,.06); border:1px solid rgba(129,140,248,.2); border-radius:.5rem; padding:.75rem 1rem; font-size:.8rem; color:#c7d2fe; line-height:1.6; }

  /* Quick wins */
  .qw-list { display:flex; flex-direction:column; gap:.4rem; padding:1rem 1.5rem; }
  .qw-item { display:flex; align-items:flex-start; gap:.75rem; padding:.75rem; border-radius:.5rem; background:rgba(74,222,128,.04); border:1px solid rgba(74,222,128,.1); cursor:pointer; transition:opacity .2s; }
  .qw-item.done { opacity:.45; text-decoration:line-through; }
  .qw-item input { margin-top:.15rem; accent-color:var(--green); cursor:pointer; flex-shrink:0; }
  .qw-text { font-size:.82rem; line-height:1.5; }

  /* 30-day plan */
  .plan-timeline { padding:1.25rem 1.5rem; display:flex; flex-direction:column; gap:0; }
  .plan-step { display:flex; gap:1rem; padding:.75rem 0; position:relative; }
  .plan-step::after { content:''; position:absolute; left:9px; top:2rem; bottom:0; width:2px; background:rgba(255,255,255,.07); }
  .plan-step:last-child::after { display:none; }
  .plan-dot { width:20px; height:20px; border-radius:50%; flex-shrink:0; margin-top:.15rem; }
  .plan-week { font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:.25rem; }
  .plan-text { font-size:.85rem; color:var(--text); line-height:1.55; }

  /* Footer */
  .footer { text-align:center; padding:2rem; font-size:.75rem; color:var(--muted); }
  .share-btn { display:inline-flex; align-items:center; gap:.4rem; margin-top:.6rem; padding:.45rem 1.1rem; background:rgba(167,139,250,.12); border:1px solid rgba(167,139,250,.3); border-radius:2rem; color:var(--purple); font-size:.75rem; cursor:pointer; transition:background .2s; }
  .share-btn:hover { background:rgba(167,139,250,.22); }
  .copied { color:var(--green) !important; border-color:var(--green) !important; }

  @media(max-width:600px) {
    .channels-grid { grid-template-columns:1fr; }
    .header { flex-direction:column; }
    .hide-sm { display:none; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="brand">Hephae · Social Media Strategy Report</div>
      <div class="biz-name">${esc(business?.name)}</div>
      <div class="biz-sub">${esc(business?.address ?? '')} · ${esc(date)}</div>
    </div>
    <div class="score-circle">
      <div class="score-num">${overallScore ?? '—'}</div>
      <div class="score-lbl">Score</div>
    </div>
  </div>

  <!-- Executive Summary -->
  <div class="section">
    <div class="sh">📊 Executive Summary</div>
    <div class="sb">${esc(executiveSummary)}</div>
  </div>

  <!-- Channel audits -->
  ${(channelAudits ?? []).length ? `
  <div class="section">
    <div class="sh">📱 Channel-by-Channel Audit</div>
    <div class="channels-grid">${channelCards(channelAudits)}</div>
  </div>` : ''}

  <!-- Competitor social profiles -->
  ${(competitorProfiles ?? []).length ? `
  <div class="section">
    <div class="sh">🥊 Competitor Social Landscape</div>
    <table>
      <thead>
        <tr>
          <th>Competitor</th>
          <th>Active Platforms</th>
          <th>Est. Total</th>
          <th class="hide-sm">Top Platform</th>
          <th>Threat</th>
        </tr>
      </thead>
      <tbody>${competitorRows(competitorProfiles)}</tbody>
    </table>
  </div>` : ''}

  <!-- Gap analysis -->
  ${(gapAnalysis ?? []).length ? `
  <div class="section">
    <div class="sh">⚡ Gap Analysis</div>
    <div class="gap-pills">${gapPills}</div>
  </div>` : ''}

  <!-- Content pillars -->
  ${(contentPillars ?? []).length ? `
  <div class="section">
    <div class="sh">🎯 Content Pillars</div>
    ${pillars(contentPillars)}
  </div>` : ''}

  <!-- Quick wins -->
  ${(quickWins ?? []).length ? `
  <div class="section">
    <div class="sh">⚡ Quick Wins — Do This Week</div>
    <div class="qw-list">${quickWinItems(quickWins)}</div>
  </div>` : ''}

  <!-- 30-day plan -->
  ${(thirtyDayPlan ?? []).length ? `
  <div class="section">
    <div class="sh">🗓 30-Day Action Plan</div>
    <div class="plan-timeline">${planTimeline(thirtyDayPlan)}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>Powered by <strong>Hephae</strong> — AI Restaurant Intelligence · hephae.co</div>
    <button class="share-btn" onclick="copyLink()">🔗 Copy Report Link</button>
  </div>

</div>

<script>
  function togglePillar(i) {
    const body = document.getElementById('pillar-' + i);
    const icon = document.getElementById('pillar-icon-' + i);
    const open = body.classList.toggle('open');
    icon.textContent = open ? '▼' : '▶';
    icon.style.transform = open ? 'rotate(0deg)' : '';
  }
  function copyLink() {
    navigator.clipboard.writeText(${JSON.stringify(reportUrl)}).then(() => {
      const btn = document.querySelector('.share-btn');
      btn.classList.add('copied');
      btn.textContent = '✓ Link Copied!';
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '🔗 Copy Report Link'; }, 2500);
    });
  }
</script>
</body>
</html>`;
}
