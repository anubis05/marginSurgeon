import type { SeoReport } from '@/lib/types';

const SEVERITY_META: Record<string, { icon: string; color: string }> = {
    Critical: { icon: '🔴', color: '#f87171' },
    Warning:  { icon: '🟡', color: '#fbbf24' },
    Info:     { icon: '🔵', color: '#60a5fa' },
};

export function renderSeoReportHtml(report: SeoReport, reportUrl: string): string {
    const { overallScore, summary, url, sections } = report;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const scoreColor = overallScore >= 80 ? '#4ade80' : overallScore >= 60 ? '#fbbf24' : '#f87171';
    const domain = (() => { try { return new URL(url).hostname; } catch { return url; } })();

    const sectionsHtml = (sections || []).map((sec, i) => {
        const secScore = sec.score ?? 0;
        const secColor = secScore >= 70 ? '#4ade80' : secScore >= 40 ? '#fbbf24' : '#f87171';
        const recsHtml = (sec.recommendations || []).map(rec => {
            const meta = SEVERITY_META[rec.severity] ?? SEVERITY_META.Info;
            return `
            <div class="rec-item">
              <div class="rec-header">
                <span class="rec-icon">${meta.icon}</span>
                <span class="rec-title" style="color:${meta.color}">${escHtml(rec.title)}</span>
              </div>
              <div class="rec-desc">${escHtml(rec.description)}</div>
              ${rec.action ? `<div class="rec-action">→ ${escHtml(rec.action)}</div>` : ''}
            </div>`;
        }).join('');

        return `
        <div class="section-card">
          <div class="section-toggle" onclick="toggleSection(${i})">
            <div class="section-left">
              <span class="toggle-icon" id="icon-${i}">▶</span>
              <div>
                <div class="section-title">${escHtml(sec.title)}</div>
                ${sec.description ? `<div class="section-desc">${escHtml(sec.description)}</div>` : ''}
              </div>
            </div>
            <div class="section-score-wrap">
              <div class="section-score" style="color:${secColor}">${secScore}</div>
              <div class="score-bar-bg"><div class="score-bar" style="width:${secScore}%;background:${secColor}"></div></div>
            </div>
          </div>
          <div class="section-recs" id="recs-${i}" style="display:none">
            ${recsHtml || '<div class="no-recs">No recommendations — this area is in good shape.</div>'}
          </div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hephae SEO Audit — ${escHtml(domain)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg:#0f172a; --surface:#1e293b; --border:rgba(255,255,255,.08); --text:#f1f5f9; --muted:#94a3b8; --indigo:#818cf8; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; min-height:100vh; padding:2rem 1rem; }
  .container { max-width:900px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding:1.5rem 2rem; background:var(--surface); border:1px solid var(--border); border-radius:1rem; margin-bottom:1.5rem; }
  .brand { font-size:.75rem; font-weight:700; letter-spacing:.1em; color:var(--muted); text-transform:uppercase; }
  .site-name { font-size:1.4rem; font-weight:800; color:var(--indigo); }
  .site-sub { font-size:.8rem; color:var(--muted); margin-top:.25rem; }
  .score-ring { text-align:center; min-width:80px; }
  .score-big { font-size:2.5rem; font-weight:900; color:${scoreColor}; line-height:1; }
  .score-lbl { font-size:.65rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
  .summary-card { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; padding:1.25rem 1.5rem; margin-bottom:1.5rem; font-size:.875rem; color:var(--muted); line-height:1.7; }
  .section-card { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; margin-bottom:.75rem; overflow:hidden; }
  .section-toggle { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; cursor:pointer; gap:1rem; transition:background .15s; }
  .section-toggle:hover { background:rgba(255,255,255,.03); }
  .section-left { display:flex; align-items:flex-start; gap:.75rem; }
  .toggle-icon { font-size:.6rem; color:var(--muted); flex-shrink:0; margin-top:.25rem; transition:transform .2s; }
  .section-title { font-weight:700; font-size:.95rem; }
  .section-desc { font-size:.75rem; color:var(--muted); margin-top:.2rem; }
  .section-score-wrap { text-align:right; flex-shrink:0; }
  .section-score { font-size:1.5rem; font-weight:800; line-height:1; }
  .score-bar-bg { background:rgba(255,255,255,.08); border-radius:2px; height:4px; width:80px; margin-top:.35rem; }
  .score-bar { height:100%; border-radius:2px; }
  .section-recs { border-top:1px solid var(--border); padding:.75rem 1.5rem; }
  .rec-item { padding:.85rem 0; border-bottom:1px solid var(--border); }
  .rec-item:last-child { border:none; }
  .rec-header { display:flex; align-items:center; gap:.5rem; margin-bottom:.35rem; }
  .rec-icon { font-size:.85rem; }
  .rec-title { font-weight:700; font-size:.875rem; }
  .rec-desc { font-size:.8rem; color:var(--muted); line-height:1.5; margin-bottom:.35rem; }
  .rec-action { font-size:.78rem; color:#a5b4fc; font-style:italic; }
  .no-recs { font-size:.8rem; color:var(--muted); padding:.5rem 0; }
  .footer { text-align:center; padding:2rem; font-size:.75rem; color:var(--muted); }
  .share-link { display:inline-block; margin-top:.5rem; padding:.4rem 1rem; background:rgba(129,140,248,.15); border:1px solid rgba(129,140,248,.3); border-radius:2rem; color:var(--indigo); text-decoration:none; font-size:.75rem; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="brand">Hephae SEO Audit Report</div>
      <div class="site-name">${escHtml(domain)}</div>
      <div class="site-sub"><a href="${escHtml(url)}" target="_blank" rel="noopener">${escHtml(url)}</a> · Audited ${date}</div>
    </div>
    <div class="score-ring">
      <div class="score-big">${overallScore}</div>
      <div class="score-lbl">SEO Score</div>
    </div>
  </div>

  ${summary ? `<div class="summary-card">${escHtml(summary)}</div>` : ''}

  ${sectionsHtml}

  <div class="footer">
    <div>Powered by <strong>Hephae</strong> — AI Restaurant Intelligence · hephae.co</div>
    <a href="${reportUrl}" class="share-link">🔗 Share this report</a>
  </div>
</div>
<script>
function toggleSection(i) {
  var recs = document.getElementById('recs-' + i);
  var icon = document.getElementById('icon-' + i);
  if (!recs || !icon) return;
  var open = recs.style.display !== 'none';
  recs.style.display = open ? 'none' : 'block';
  icon.style.transform = open ? '' : 'rotate(90deg)';
}
</script>
</body>
</html>`;
}

function escHtml(s: string | undefined): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
