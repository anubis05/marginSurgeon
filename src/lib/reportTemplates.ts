import { EnrichedProfile } from '@/agents/types';
import { SurgicalReport, SeoReport } from './types';
import { ForecastResponse } from '@/components/Chatbot/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function sharedStyles(): string {
    return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
      .wrapper { max-width: 960px; margin: 0 auto; padding: 24px 20px 60px; }
      .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 28px 32px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
      .header h1 { font-size: 1.6rem; font-weight: 800; color: #fff; }
      .header .subtitle { font-size: 0.85rem; color: rgba(255,255,255,0.75); margin-top: 4px; }
      .header .badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; padding: 6px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
      .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; margin-bottom: 20px; }
      .card-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; opacity: 0.6; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 10px 14px; background: rgba(255,255,255,0.05); font-size: 0.7rem; text-transform: uppercase; letter-spacing: .06em; opacity: 0.55; }
      td { padding: 10px 14px; border-top: 1px solid rgba(255,255,255,0.06); }
      tr:hover td { background: rgba(255,255,255,0.03); }
      .tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
      .footer { margin-top: 40px; text-align: center; font-size: 0.75rem; opacity: 0.35; }
      a { color: #818cf8; text-decoration: none; }
      a:hover { text-decoration: underline; }
      @media print { body { background: #fff; color: #1e293b; } .header { background: #4f46e5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>`;
}

function pageWrap(title: string, businessName: string, generatedAt: string, body: string): string {
    const date = new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} — ${escHtml(businessName)}</title>
  ${sharedStyles()}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div>
        <h1>${escHtml(businessName)}</h1>
        <div class="subtitle">${escHtml(title)}</div>
      </div>
      <div class="badge">Generated ${escHtml(date)}</div>
    </div>
    ${body}
    <div class="footer">Powered by Hephae Hub &nbsp;·&nbsp; hephae.co</div>
  </div>
</body>
</html>`;
}

function escHtml(str: string | undefined | null): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// 1. Profile Report
// ---------------------------------------------------------------------------

export function buildProfileReport(profile: EnrichedProfile): string {
    const now = new Date().toISOString();

    const socialRows = Object.entries(profile.socialLinks || {})
        .filter(([, v]) => v)
        .map(([k, v]) => `<tr><td style="opacity:.6;text-transform:capitalize">${escHtml(k)}</td><td><a href="${escHtml(v)}" target="_blank">${escHtml(v)}</a></td></tr>`)
        .join('');

    const competitorRows = (profile.competitors || [])
        .map(c => `<tr>
          <td>${escHtml(c.name)}</td>
          <td><a href="${escHtml(c.url)}" target="_blank">${escHtml(c.url)}</a></td>
          <td style="opacity:.7">${escHtml(c.reason || '')}</td>
        </tr>`)
        .join('');

    const body = `
      <div class="card">
        <div class="card-title">Business Identity</div>
        <table>
          <tr><td style="opacity:.6;width:140px">Name</td><td><strong>${escHtml(profile.name)}</strong></td></tr>
          ${profile.address ? `<tr><td style="opacity:.6">Address</td><td>${escHtml(profile.address)}</td></tr>` : ''}
          ${profile.officialUrl ? `<tr><td style="opacity:.6">Website</td><td><a href="${escHtml(profile.officialUrl)}" target="_blank">${escHtml(profile.officialUrl)}</a></td></tr>` : ''}
          ${profile.phone ? `<tr><td style="opacity:.6">Phone</td><td>${escHtml(profile.phone)}</td></tr>` : ''}
          ${profile.email ? `<tr><td style="opacity:.6">Email</td><td>${escHtml(profile.email)}</td></tr>` : ''}
          ${profile.hours ? `<tr><td style="opacity:.6">Hours</td><td>${escHtml(profile.hours)}</td></tr>` : ''}
          ${profile.googleMapsUrl ? `<tr><td style="opacity:.6">Maps</td><td><a href="${escHtml(profile.googleMapsUrl)}" target="_blank">Open in Google Maps</a></td></tr>` : ''}
        </table>
      </div>

      ${socialRows ? `
      <div class="card">
        <div class="card-title">Social Presence</div>
        <table>${socialRows}</table>
      </div>` : ''}

      ${competitorRows ? `
      <div class="card">
        <div class="card-title">Local Competitors</div>
        <table>
          <thead><tr><th>Name</th><th>URL</th><th>Why Competing</th></tr></thead>
          <tbody>${competitorRows}</tbody>
        </table>
      </div>` : ''}
    `;

    return pageWrap('Business Profile', profile.name, now, body);
}

// ---------------------------------------------------------------------------
// 2. Margin Report
// ---------------------------------------------------------------------------

export function buildMarginReport(report: SurgicalReport): string {
    const totalLeakage = report.menu_items.reduce((s, i) => s + i.price_leakage, 0);
    const topLeaks = report.menu_items
        .filter(i => i.price_leakage > 0)
        .sort((a, b) => b.price_leakage - a.price_leakage);

    const scoreColor = report.overall_score > 80 ? '#4ade80' : report.overall_score > 60 ? '#facc15' : '#f87171';

    const rows = topLeaks.map(item => {
        const leakColor = item.price_leakage > 2 ? '#f87171' : '#fbbf24';
        return `<tr>
          <td>${escHtml(item.item_name)}</td>
          <td style="opacity:.65">$${item.current_price.toFixed(2)}</td>
          <td style="opacity:.65">$${item.competitor_benchmark.toFixed(2)}</td>
          <td style="color:#4ade80;font-weight:700">$${item.recommended_price.toFixed(2)}</td>
          <td style="color:${leakColor};font-weight:700;font-family:monospace">+$${item.price_leakage.toFixed(2)}</td>
          <td style="font-size:.75rem;opacity:.7">${escHtml(item.rationale || '')}</td>
        </tr>`;
    }).join('');

    const adviceItems = (report.strategic_advice || [])
        .map(tip => `<li style="padding:12px 16px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:10px;font-size:.875rem;margin-bottom:10px">"${escHtml(tip)}"</li>`)
        .join('');

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="card" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.25)">
          <div class="card-title" style="color:#fca5a5">Detected Profit Leakage</div>
          <div style="font-size:2.4rem;font-weight:900;color:#fff">$${totalLeakage.toLocaleString()}<span style="font-size:1rem;opacity:.5;font-weight:400"> / cycle</span></div>
        </div>
        <div class="card" style="background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.25);text-align:center">
          <div class="card-title">Surgical Score</div>
          <div style="font-size:3rem;font-weight:900;color:${scoreColor}">${report.overall_score}<span style="font-size:1.2rem;opacity:.5;font-weight:400">/100</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Surgical Breakdown</div>
        <table>
          <thead><tr><th>Item</th><th>Current</th><th>Market Avg</th><th>Recommended</th><th>Leakage</th><th>Rationale</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      ${adviceItems ? `
      <div class="card" style="background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2)">
        <div class="card-title" style="color:#a5b4fc">Strategic Advice</div>
        <ul style="list-style:none">${adviceItems}</ul>
      </div>` : ''}
    `;

    return pageWrap('Margin Surgery Report', report.identity.name, report.generated_at, body);
}

// ---------------------------------------------------------------------------
// 3. Traffic Report
// ---------------------------------------------------------------------------

export function buildTrafficReport(forecast: ForecastResponse): string {
    const now = new Date().toISOString();

    const levelColor: Record<string, string> = {
        'Very High': '#4ade80',
        'High': '#86efac',
        'Medium': '#facc15',
        'Low': '#94a3b8',
        'Closed': '#475569',
    };

    const dayCards = (forecast.forecast || []).map(day => {
        const slotCells = day.slots.map(slot => {
            const bg = levelColor[slot.level] || '#94a3b8';
            return `<td style="text-align:center;padding:10px 6px">
              <div style="font-size:.7rem;opacity:.6;margin-bottom:4px">${escHtml(slot.label)}</div>
              <div style="background:${bg};color:#0f172a;font-weight:800;border-radius:8px;padding:6px 4px;font-size:.85rem">${slot.score}</div>
              <div style="font-size:.65rem;opacity:.5;margin-top:3px">${escHtml(slot.level)}</div>
            </td>`;
        }).join('');

        return `
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div>
              <strong style="font-size:1rem">${escHtml(day.dayOfWeek)}</strong>
              <span style="opacity:.5;margin-left:8px;font-size:.85rem">${escHtml(day.date)}</span>
            </div>
            <span style="font-size:.78rem;opacity:.6">${escHtml(day.weatherNote)}</span>
          </div>
          <table style="width:100%"><tr>${slotCells}</tr></table>
          ${day.localEvents?.length ? `<div style="margin-top:12px;font-size:.78rem;opacity:.6">Events: ${day.localEvents.map(escHtml).join(' · ')}</div>` : ''}
        </div>`;
    }).join('');

    const poiRows = (forecast.business?.nearbyPOIs || [])
        .slice(0, 10)
        .map(poi => `<tr>
          <td>${escHtml(poi.name)}</td>
          <td style="opacity:.6">${escHtml(poi.type)}</td>
        </tr>`)
        .join('');

    const body = `
      <div class="card" style="background:rgba(74,222,128,0.08);border-color:rgba(74,222,128,0.2);margin-bottom:20px">
        <div class="card-title" style="color:#86efac">Executive Summary</div>
        <p style="font-size:.9rem;line-height:1.65">${escHtml(forecast.summary)}</p>
      </div>

      <div style="margin-bottom:8px;font-size:.75rem;opacity:.5;text-transform:uppercase;letter-spacing:.08em">3-Day Traffic Forecast</div>
      ${dayCards}

      ${poiRows ? `
      <div class="card">
        <div class="card-title">Nearby Traffic Anchors</div>
        <table><thead><tr><th>Location</th><th>Type</th></tr></thead><tbody>${poiRows}</tbody></table>
      </div>` : ''}
    `;

    return pageWrap('Foot Traffic Forecast', forecast.business?.name || 'Business', now, body);
}

// ---------------------------------------------------------------------------
// 4. SEO Report
// ---------------------------------------------------------------------------

export function buildSeoReport(report: SeoReport): string {
    const now = new Date().toISOString();

    const scoreBar = (score: number) => {
        const color = score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#f87171';
        return `<div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden">
            <div style="width:${score}%;height:100%;background:${color};border-radius:999px"></div>
          </div>
          <span style="font-weight:800;color:${color};width:36px;text-align:right">${score}</span>
        </div>`;
    };

    const severityColor: Record<string, string> = { Critical: '#f87171', Warning: '#fbbf24', Info: '#60a5fa' };

    const sections = (report.sections || []).map(section => {
        const recItems = (section.recommendations || []).map(rec => {
            const color = severityColor[rec.severity] || '#94a3b8';
            return `<div style="padding:12px 16px;border-left:3px solid ${color};background:rgba(255,255,255,0.03);border-radius:0 8px 8px 0;margin-bottom:8px">
              <div style="font-size:.72rem;font-weight:700;color:${color};margin-bottom:4px">${escHtml(rec.severity)}: ${escHtml(rec.title)}</div>
              <div style="font-size:.84rem;opacity:.8">${escHtml(rec.description)}</div>
              ${rec.action ? `<div style="font-size:.78rem;color:#818cf8;margin-top:6px">→ ${escHtml(rec.action)}</div>` : ''}
            </div>`;
        }).join('');

        return `
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <strong>${escHtml(section.title)}</strong>
          </div>
          ${scoreBar(section.score)}
          ${section.description ? `<p style="font-size:.84rem;opacity:.7;margin-top:12px">${escHtml(section.description)}</p>` : ''}
          ${recItems ? `<div style="margin-top:14px">${recItems}</div>` : ''}
        </div>`;
    }).join('');

    const overallColor = report.overallScore >= 80 ? '#4ade80' : report.overallScore >= 60 ? '#facc15' : '#f87171';

    const body = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="card" style="background:rgba(139,92,246,0.1);border-color:rgba(139,92,246,0.25)">
          <div class="card-title">Overall SEO Score</div>
          <div style="font-size:3rem;font-weight:900;color:${overallColor}">${report.overallScore}<span style="font-size:1.2rem;opacity:.5;font-weight:400">/100</span></div>
        </div>
        <div class="card">
          <div class="card-title">Audited URL</div>
          <a href="${escHtml(report.url)}" target="_blank" style="word-break:break-all">${escHtml(report.url)}</a>
          <div style="margin-top:10px;font-size:.84rem;opacity:.7">${escHtml(report.summary)}</div>
        </div>
      </div>

      ${sections}
    `;

    return pageWrap('SEO Deep Audit', report.url, now, body);
}

// ---------------------------------------------------------------------------
// 5. Competitive Report
// ---------------------------------------------------------------------------

export function buildCompetitiveReport(result: any, identity: { name: string }): string {
    const now = new Date().toISOString();

    const threatColor = (level: number) => level >= 8 ? '#f87171' : level >= 5 ? '#fbbf24' : '#4ade80';

    const competitorCards = (result.competitor_analysis || []).map((comp: any) => {
        const color = threatColor(comp.threat_level || 0);
        return `
        <div class="card" style="flex:1;min-width:260px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
            <strong style="color:#a5b4fc;font-size:1rem">${escHtml(comp.name)}</strong>
            <span style="font-size:.75rem;padding:3px 10px;border-radius:999px;background:${color}22;color:${color};border:1px solid ${color}44;font-weight:700">Threat ${comp.threat_level || '?'}/10</span>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;opacity:.5;margin-bottom:6px">Key Strength</div>
            <div style="font-size:.84rem;padding:10px;background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.15);border-radius:8px">${escHtml(comp.key_strength)}</div>
          </div>
          <div>
            <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;opacity:.5;margin-bottom:6px">Exploitable Weakness</div>
            <div style="font-size:.84rem;padding:10px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.15);border-radius:8px">${escHtml(comp.key_weakness)}</div>
          </div>
        </div>`;
    }).join('');

    const advantageItems = (result.strategic_advantages || [])
        .map((adv: string) => `<li style="padding:12px 16px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:10px;font-size:.875rem;margin-bottom:8px">⚡ ${escHtml(adv)}</li>`)
        .join('');

    const body = `
      <div class="card" style="background:rgba(251,146,60,0.08);border-color:rgba(251,146,60,0.2);margin-bottom:20px">
        <div class="card-title" style="color:#fed7aa">Executive Summary</div>
        <p style="font-size:.9rem;line-height:1.65">${escHtml(result.market_summary)}</p>
      </div>

      <div style="margin-bottom:8px;font-size:.75rem;opacity:.5;text-transform:uppercase;letter-spacing:.08em">Rival Positioning Radar</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px">${competitorCards}</div>

      ${advantageItems ? `
      <div class="card" style="background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.15)">
        <div class="card-title" style="color:#a5b4fc">Strategic Advantages to Leverage</div>
        <ul style="list-style:none">${advantageItems}</ul>
      </div>` : ''}
    `;

    return pageWrap('Competitive Market Strategy', identity.name, now, body);
}
