import type { ForecastResponse } from '@/components/Chatbot/types';

const LEVEL_COLORS: Record<string, string> = {
    'Low':    '#64748b',
    'Medium': '#f59e0b',
    'High':   '#10b981',
    'Very High': '#059669',
    'Closed': '#334155',
};

export function renderTrafficReportHtml(data: ForecastResponse, reportUrl: string): string {
    const { business, forecast, summary } = data;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const daysHtml = (forecast || []).map(day => {
        const slotsHtml = (day.slots || []).map(slot => {
            const bg = LEVEL_COLORS[slot.level] ?? '#334155';
            return `
            <div class="slot" title="${escHtml(slot.reason)}">
              <div class="slot-label">${escHtml(slot.label)}</div>
              <div class="slot-bar-wrap">
                <div class="slot-bar" style="height:${slot.score}%;background:${bg};"></div>
              </div>
              <div class="slot-score">${slot.score}</div>
              <div class="slot-level" style="color:${bg}">${escHtml(slot.level)}</div>
            </div>`;
        }).join('');

        const eventsHtml = (day.localEvents || []).map(e =>
            `<span class="event-tag">${escHtml(e)}</span>`
        ).join('');

        return `
        <div class="day-card">
          <div class="day-header">
            <div>
              <div class="day-name">${escHtml(day.dayOfWeek)}</div>
              <div class="day-date">${escHtml(day.date)}</div>
            </div>
            ${day.weatherNote ? `<div class="weather-note">🌤 ${escHtml(day.weatherNote)}</div>` : ''}
          </div>
          <div class="slots-row">${slotsHtml}</div>
          ${eventsHtml ? `<div class="events-row">${eventsHtml}</div>` : ''}
        </div>`;
    }).join('');

    const poisHtml = (business?.nearbyPOIs || []).map(poi =>
        `<div class="poi-item"><span class="poi-type">${escHtml(poi.type)}</span> ${escHtml(poi.name)}</div>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hephae Traffic Forecast — ${escHtml(business?.name)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --bg:#0f172a; --surface:#1e293b; --border:rgba(255,255,255,.08); --text:#f1f5f9; --muted:#94a3b8; --indigo:#818cf8; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,sans-serif; min-height:100vh; padding:2rem 1rem; }
  .container { max-width:900px; margin:0 auto; }
  .header { display:flex; justify-content:space-between; align-items:center; padding:1.5rem 2rem; background:var(--surface); border:1px solid var(--border); border-radius:1rem; margin-bottom:1.5rem; }
  .brand { font-size:.75rem; font-weight:700; letter-spacing:.1em; color:var(--muted); text-transform:uppercase; }
  .biz-name { font-size:1.5rem; font-weight:800; color:#4ade80; }
  .biz-sub { font-size:.85rem; color:var(--muted); margin-top:.25rem; }
  .day-card { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; padding:1.25rem 1.5rem; margin-bottom:1rem; }
  .day-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; }
  .day-name { font-size:1.1rem; font-weight:800; }
  .day-date { font-size:.75rem; color:var(--muted); }
  .weather-note { font-size:.75rem; color:var(--muted); text-align:right; max-width:200px; }
  .slots-row { display:grid; grid-template-columns:repeat(4,1fr); gap:.75rem; }
  .slot { text-align:center; }
  .slot-label { font-size:.65rem; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:.4rem; }
  .slot-bar-wrap { height:80px; display:flex; align-items:flex-end; justify-content:center; margin-bottom:.4rem; }
  .slot-bar { width:100%; border-radius:3px 3px 0 0; min-height:4px; transition:height .3s; }
  .slot-score { font-size:1rem; font-weight:800; }
  .slot-level { font-size:.65rem; font-weight:700; text-transform:uppercase; margin-top:.15rem; }
  .events-row { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.75rem; padding-top:.75rem; border-top:1px solid var(--border); }
  .event-tag { font-size:.72rem; padding:.2rem .6rem; border-radius:2rem; background:rgba(129,140,248,.15); color:var(--indigo); border:1px solid rgba(129,140,248,.2); }
  .summary-card { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; padding:1.25rem 1.5rem; margin-bottom:1rem; font-size:.9rem; color:var(--muted); line-height:1.6; }
  .summary-card strong { color:var(--text); }
  .poi-section { background:var(--surface); border:1px solid var(--border); border-radius:.75rem; padding:1.25rem 1.5rem; margin-bottom:1.5rem; }
  .poi-section h3 { font-size:.75rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin-bottom:.75rem; }
  .poi-item { font-size:.8rem; padding:.35rem 0; border-bottom:1px solid var(--border); display:flex; gap:.5rem; align-items:center; }
  .poi-item:last-child { border:none; }
  .poi-type { font-size:.65rem; padding:.15rem .5rem; border-radius:2rem; background:rgba(99,102,241,.15); color:var(--indigo); font-weight:700; flex-shrink:0; }
  .footer { text-align:center; padding:2rem; font-size:.75rem; color:var(--muted); }
  .share-link { display:inline-block; margin-top:.5rem; padding:.4rem 1rem; background:rgba(129,140,248,.15); border:1px solid rgba(129,140,248,.3); border-radius:2rem; color:var(--indigo); text-decoration:none; font-size:.75rem; }
  @media(max-width:600px) { .slots-row { grid-template-columns:repeat(2,1fr); } .header { flex-direction:column; gap:1rem; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="brand">Hephae Foot Traffic Forecast</div>
      <div class="biz-name">${escHtml(business?.name)}</div>
      <div class="biz-sub">${escHtml(business?.address || '')} · Generated ${date}</div>
    </div>
  </div>

  ${summary ? `<div class="summary-card"><strong>Executive Summary:</strong> ${escHtml(summary)}</div>` : ''}

  ${daysHtml}

  ${poisHtml ? `
  <div class="poi-section">
    <h3>Nearby Points of Interest</h3>
    ${poisHtml}
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
