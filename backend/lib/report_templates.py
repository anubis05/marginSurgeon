"""
HTML report generators — 5 templates.
Port of src/lib/reportTemplates.ts.
"""

from __future__ import annotations

import html
from datetime import datetime
from typing import Any, Optional


def _esc(s: Optional[str]) -> str:
    if not s:
        return ""
    return html.escape(str(s), quote=True)


HEPHAE_LOGO_URL = "https://insights.ai.hephae.co/hephae_logo_blue.png"


def _shared_styles() -> str:
    return """
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #1e293b; line-height: 1.6; }
      .wrapper { max-width: 960px; margin: 0 auto; padding: 24px 20px 60px; }
      .header { background: linear-gradient(135deg, #0052CC 0%, #0ea5e9 100%); border-radius: 16px; padding: 28px 32px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
      .header h1 { font-size: 1.6rem; font-weight: 800; color: #fff; }
      .header .subtitle { font-size: 0.85rem; color: rgba(255,255,255,0.75); margin-top: 4px; }
      .header .badge { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; padding: 6px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
      .card-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; opacity: 0.6; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
      th { text-align: left; padding: 10px 14px; background: #f1f5f9; font-size: 0.7rem; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
      td { padding: 10px 14px; border-top: 1px solid #e2e8f0; }
      tr:hover td { background: #f8fafc; }
      .tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
      .footer { margin-top: 40px; text-align: center; font-size: 0.75rem; opacity: 0.35; }
      a { color: #0052CC; text-decoration: none; }
      a:hover { text-decoration: underline; }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .wrapper { animation: fadeIn 0.4s ease-out both; }
      .header  { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      .card:nth-child(1) { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.10s both; }
      .card:nth-child(2) { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.18s both; }
      .card:nth-child(3) { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.26s both; }
      .card:nth-child(4) { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.34s both; }
      .card:nth-child(5) { animation: fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
      tbody tr { animation: fadeInUp 0.4s ease-out both; }
      tbody tr:nth-child(1)  { animation-delay: 0.20s; }
      tbody tr:nth-child(2)  { animation-delay: 0.24s; }
      tbody tr:nth-child(3)  { animation-delay: 0.28s; }
      tbody tr:nth-child(4)  { animation-delay: 0.32s; }
      tbody tr:nth-child(5)  { animation-delay: 0.36s; }
      @media print { body { background: #fff; color: #1e293b; } .header { background: #0052CC !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>"""


def _page_wrap(title: str, business_name: str, generated_at: str, body: str) -> str:
    try:
        dt = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        date_str = dt.strftime("%B %d, %Y")
    except Exception:
        date_str = generated_at

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{_esc(title)} — {_esc(business_name)}</title>
  {_shared_styles()}
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div>
        <h1>{_esc(business_name)}</h1>
        <div class="subtitle">{_esc(title)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="badge">Generated {_esc(date_str)}</div>
        <img src="{HEPHAE_LOGO_URL}" alt="Hephae" style="height:28px;opacity:0.9;filter:brightness(0) invert(1)" />
      </div>
    </div>
    {body}
    <div class="footer" style="display:flex;align-items:center;justify-content:center;gap:8px">
      <img src="{HEPHAE_LOGO_URL}" alt="Hephae" style="height:16px;opacity:0.35" />
      <span>Powered by Hephae &nbsp;&middot;&nbsp; hephae.co</span>
    </div>
  </div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# 1. Profile Report
# ---------------------------------------------------------------------------


def build_profile_report(profile: dict[str, Any]) -> str:
    now = datetime.utcnow().isoformat()

    social_links = profile.get("socialLinks") or {}
    social_rows = "".join(
        f'<tr><td style="opacity:.6;text-transform:capitalize">{_esc(k)}</td>'
        f'<td><a href="{_esc(v)}" target="_blank">{_esc(v)}</a></td></tr>'
        for k, v in social_links.items()
        if v
    )

    competitors = profile.get("competitors") or []
    competitor_rows = "".join(
        f'<tr><td>{_esc(c.get("name"))}</td>'
        f'<td><a href="{_esc(c.get("url"))}" target="_blank">{_esc(c.get("url"))}</a></td>'
        f'<td style="opacity:.7">{_esc(c.get("reason", ""))}</td></tr>'
        for c in competitors
    )

    name = profile.get("name", "")
    body = f"""
      <div class="card">
        <div class="card-title">Business Identity</div>
        <table>
          <tr><td style="opacity:.6;width:140px">Name</td><td><strong>{_esc(name)}</strong></td></tr>
          {"" if not profile.get("address") else f'<tr><td style="opacity:.6">Address</td><td>{_esc(profile.get("address"))}</td></tr>'}
          {"" if not profile.get("officialUrl") else f'<tr><td style="opacity:.6">Website</td><td><a href="{_esc(profile.get("officialUrl"))}" target="_blank">{_esc(profile.get("officialUrl"))}</a></td></tr>'}
          {"" if not profile.get("phone") else f'<tr><td style="opacity:.6">Phone</td><td>{_esc(profile.get("phone"))}</td></tr>'}
          {"" if not profile.get("email") else f'<tr><td style="opacity:.6">Email</td><td>{_esc(profile.get("email"))}</td></tr>'}
          {"" if not profile.get("hours") else f'<tr><td style="opacity:.6">Hours</td><td>{_esc(profile.get("hours"))}</td></tr>'}
          {"" if not profile.get("googleMapsUrl") else f'<tr><td style="opacity:.6">Maps</td><td><a href="{_esc(profile.get("googleMapsUrl"))}" target="_blank">Open in Google Maps</a></td></tr>'}
        </table>
      </div>

      {"" if not social_rows else f'''
      <div class="card">
        <div class="card-title">Social Presence</div>
        <table>{social_rows}</table>
      </div>'''}

      {"" if not competitor_rows else f'''
      <div class="card">
        <div class="card-title">Local Competitors</div>
        <table>
          <thead><tr><th>Name</th><th>URL</th><th>Why Competing</th></tr></thead>
          <tbody>{competitor_rows}</tbody>
        </table>
      </div>'''}
    """

    return _page_wrap("Business Profile", name, now, body)


# ---------------------------------------------------------------------------
# 2. Margin Report
# ---------------------------------------------------------------------------


def build_margin_report(report: dict[str, Any]) -> str:
    menu_items = report.get("menu_items", [])
    total_leakage = sum(i.get("price_leakage", 0) for i in menu_items)
    top_leaks = sorted(
        [i for i in menu_items if i.get("price_leakage", 0) > 0],
        key=lambda x: x.get("price_leakage", 0),
        reverse=True,
    )

    overall_score = report.get("overall_score", 0)
    score_color = "#4ade80" if overall_score > 80 else "#facc15" if overall_score > 60 else "#f87171"

    rows = ""
    for item in top_leaks:
        leak = item.get("price_leakage", 0)
        leak_color = "#f87171" if leak > 2 else "#fbbf24"
        rows += f"""<tr>
          <td>{_esc(item.get("item_name"))}</td>
          <td style="opacity:.65">${item.get("current_price", 0):.2f}</td>
          <td style="opacity:.65">${item.get("competitor_benchmark", 0):.2f}</td>
          <td style="color:#4ade80;font-weight:700">${item.get("recommended_price", 0):.2f}</td>
          <td style="color:{leak_color};font-weight:700;font-family:monospace">+${leak:.2f}</td>
          <td style="font-size:.75rem;opacity:.7">{_esc(item.get("rationale", ""))}</td>
        </tr>"""

    advice_items = "".join(
        f'<li style="padding:12px 16px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:10px;font-size:.875rem;margin-bottom:10px">"{_esc(tip)}"</li>'
        for tip in (report.get("strategic_advice") or [])
    )

    identity = report.get("identity", {})
    body = f"""
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="card" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.25)">
          <div class="card-title" style="color:#fca5a5">Detected Profit Leakage</div>
          <div style="font-size:2.4rem;font-weight:900;color:#fff">${total_leakage:,.0f}<span style="font-size:1rem;opacity:.5;font-weight:400"> / cycle</span></div>
        </div>
        <div class="card" style="background:rgba(99,102,241,0.1);border-color:rgba(99,102,241,0.25);text-align:center">
          <div class="card-title">Surgical Score</div>
          <div style="font-size:3rem;font-weight:900;color:{score_color}">{overall_score}<span style="font-size:1.2rem;opacity:.5;font-weight:400">/100</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Surgical Breakdown</div>
        <table>
          <thead><tr><th>Item</th><th>Current</th><th>Market Avg</th><th>Recommended</th><th>Leakage</th><th>Rationale</th></tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>

      {"" if not advice_items else f'''
      <div class="card" style="background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.2)">
        <div class="card-title" style="color:#a5b4fc">Strategic Advice</div>
        <ul style="list-style:none">{advice_items}</ul>
      </div>'''}
    """

    return _page_wrap(
        "Margin Surgery Report",
        identity.get("name", "Business"),
        report.get("generated_at", datetime.utcnow().isoformat()),
        body,
    )


# ---------------------------------------------------------------------------
# 3. Traffic Report
# ---------------------------------------------------------------------------


def build_traffic_report(forecast: dict[str, Any]) -> str:
    now = datetime.utcnow().isoformat()

    level_color = {
        "Very High": "#4ade80",
        "High": "#86efac",
        "Medium": "#facc15",
        "Low": "#94a3b8",
        "Closed": "#475569",
    }

    day_cards = ""
    for day in (forecast.get("forecast") or []):
        slot_cells = ""
        for slot in day.get("slots", []):
            bg = level_color.get(slot.get("level", ""), "#94a3b8")
            slot_cells += f"""<td style="text-align:center;padding:10px 6px">
              <div style="font-size:.7rem;opacity:.6;margin-bottom:4px">{_esc(slot.get("label"))}</div>
              <div style="background:{bg};color:#0f172a;font-weight:800;border-radius:8px;padding:6px 4px;font-size:.85rem">{slot.get("score", 0)}</div>
              <div style="font-size:.65rem;opacity:.5;margin-top:3px">{_esc(slot.get("level"))}</div>
            </td>"""

        events = day.get("localEvents") or []
        events_str = " &middot; ".join(_esc(e) for e in events) if events else ""

        day_cards += f"""
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div>
              <strong style="font-size:1rem">{_esc(day.get("dayOfWeek"))}</strong>
              <span style="opacity:.5;margin-left:8px;font-size:.85rem">{_esc(day.get("date"))}</span>
            </div>
            <span style="font-size:.78rem;opacity:.6">{_esc(day.get("weatherNote"))}</span>
          </div>
          <table style="width:100%"><tr>{slot_cells}</tr></table>
          {"" if not events_str else f'<div style="margin-top:12px;font-size:.78rem;opacity:.6">Events: {events_str}</div>'}
        </div>"""

    business = forecast.get("business") or {}
    pois = (business.get("nearbyPOIs") or [])[:10]
    poi_rows = "".join(
        f'<tr><td>{_esc(p.get("name"))}</td><td style="opacity:.6">{_esc(p.get("type"))}</td></tr>'
        for p in pois
    )

    body = f"""
      <div class="card" style="background:rgba(74,222,128,0.08);border-color:rgba(74,222,128,0.2);margin-bottom:20px">
        <div class="card-title" style="color:#86efac">Executive Summary</div>
        <p style="font-size:.9rem;line-height:1.65">{_esc(forecast.get("summary"))}</p>
      </div>

      <div style="margin-bottom:8px;font-size:.75rem;opacity:.5;text-transform:uppercase;letter-spacing:.08em">3-Day Traffic Forecast</div>
      {day_cards}

      {"" if not poi_rows else f'''
      <div class="card">
        <div class="card-title">Nearby Traffic Anchors</div>
        <table><thead><tr><th>Location</th><th>Type</th></tr></thead><tbody>{poi_rows}</tbody></table>
      </div>'''}
    """

    return _page_wrap("Foot Traffic Forecast", business.get("name", "Business"), now, body)


# ---------------------------------------------------------------------------
# 4. SEO Report
# ---------------------------------------------------------------------------


def _score_bar(score: float) -> str:
    color = "#4ade80" if score >= 80 else "#facc15" if score >= 60 else "#f87171"
    return f"""<div style="display:flex;align-items:center;gap:12px">
      <div style="flex:1;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden">
        <div style="width:{score}%;height:100%;background:{color};border-radius:999px"></div>
      </div>
      <span style="font-weight:800;color:{color};width:36px;text-align:right">{int(score)}</span>
    </div>"""


def build_seo_report(report: dict[str, Any]) -> str:
    now = datetime.utcnow().isoformat()

    severity_color = {"Critical": "#f87171", "Warning": "#fbbf24", "Info": "#60a5fa"}

    sections_html = ""
    for section in (report.get("sections") or []):
        rec_items = ""
        for rec in (section.get("recommendations") or []):
            color = severity_color.get(rec.get("severity", ""), "#94a3b8")
            rec_items += f"""<div style="padding:12px 16px;border-left:3px solid {color};background:#f8fafc;border-radius:0 8px 8px 0;margin-bottom:8px">
              <div style="font-size:.72rem;font-weight:700;color:{color};margin-bottom:4px">{_esc(rec.get("severity"))}: {_esc(rec.get("title"))}</div>
              <div style="font-size:.84rem;opacity:.8">{_esc(rec.get("description"))}</div>
              {"" if not rec.get("action") else f'<div style="font-size:.78rem;color:#4f46e5;margin-top:6px">&rarr; {_esc(rec.get("action"))}</div>'}
            </div>"""

        sections_html += f"""
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <strong>{_esc(section.get("title"))}</strong>
          </div>
          {_score_bar(section.get("score", 0))}
          {"" if not section.get("description") else f'<p style="font-size:.84rem;opacity:.7;margin-top:12px">{_esc(section.get("description"))}</p>'}
          {"" if not rec_items else f'<div style="margin-top:14px">{rec_items}</div>'}
        </div>"""

    overall = report.get("overallScore", 0)
    overall_color = "#4ade80" if overall >= 80 else "#facc15" if overall >= 60 else "#f87171"

    body = f"""
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="card" style="background:rgba(139,92,246,0.1);border-color:rgba(139,92,246,0.25)">
          <div class="card-title">Overall SEO Score</div>
          <div style="font-size:3rem;font-weight:900;color:{overall_color}">{overall}<span style="font-size:1.2rem;opacity:.5;font-weight:400">/100</span></div>
        </div>
        <div class="card">
          <div class="card-title">Audited URL</div>
          <a href="{_esc(report.get('url'))}" target="_blank" style="word-break:break-all">{_esc(report.get('url'))}</a>
          <div style="margin-top:10px;font-size:.84rem;opacity:.7">{_esc(report.get('summary'))}</div>
        </div>
      </div>

      {sections_html}
    """

    return _page_wrap("SEO Deep Audit", report.get("url", ""), now, body)


# ---------------------------------------------------------------------------
# 5. Competitive Report
# ---------------------------------------------------------------------------


def build_competitive_report(result: dict[str, Any], identity: dict[str, str]) -> str:
    now = datetime.utcnow().isoformat()

    def threat_color(level: int) -> str:
        return "#f87171" if level >= 8 else "#fbbf24" if level >= 5 else "#4ade80"

    competitor_cards = ""
    for comp in (result.get("competitor_analysis") or []):
        color = threat_color(comp.get("threat_level", 0))
        competitor_cards += f"""
        <div class="card" style="flex:1;min-width:260px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
            <strong style="color:#a5b4fc;font-size:1rem">{_esc(comp.get("name"))}</strong>
            <span style="font-size:.75rem;padding:3px 10px;border-radius:999px;background:{color}22;color:{color};border:1px solid {color}44;font-weight:700">Threat {comp.get("threat_level", "?")}/10</span>
          </div>
          <div style="margin-bottom:10px">
            <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;opacity:.5;margin-bottom:6px">Key Strength</div>
            <div style="font-size:.84rem;padding:10px;background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.15);border-radius:8px">{_esc(comp.get("key_strength"))}</div>
          </div>
          <div>
            <div style="font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;opacity:.5;margin-bottom:6px">Exploitable Weakness</div>
            <div style="font-size:.84rem;padding:10px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.15);border-radius:8px">{_esc(comp.get("key_weakness"))}</div>
          </div>
        </div>"""

    advantage_items = "".join(
        f'<li style="padding:12px 16px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:10px;font-size:.875rem;margin-bottom:8px">{_esc(adv)}</li>'
        for adv in (result.get("strategic_advantages") or [])
    )

    body = f"""
      <div class="card" style="background:rgba(251,146,60,0.08);border-color:rgba(251,146,60,0.2);margin-bottom:20px">
        <div class="card-title" style="color:#fed7aa">Executive Summary</div>
        <p style="font-size:.9rem;line-height:1.65">{_esc(result.get("market_summary"))}</p>
      </div>

      <div style="margin-bottom:8px;font-size:.75rem;opacity:.5;text-transform:uppercase;letter-spacing:.08em">Rival Positioning Radar</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px">{competitor_cards}</div>

      {"" if not advantage_items else f'''
      <div class="card" style="background:rgba(99,102,241,0.06);border-color:rgba(99,102,241,0.15)">
        <div class="card-title" style="color:#a5b4fc">Strategic Advantages to Leverage</div>
        <ul style="list-style:none">{advantage_items}</ul>
      </div>'''}
    """

    return _page_wrap("Competitive Market Strategy", identity.get("name", "Business"), now, body)
