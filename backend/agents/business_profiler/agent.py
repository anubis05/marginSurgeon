"""
ProfilerAgent — legacy slow-path business profiler using Playwright.
Port of src/agents/business-profiler/profiler.ts.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

logger = logging.getLogger(__name__)


class ProfilerAgent:
    @staticmethod
    async def profile(url: str) -> dict[str, Any]:
        """
        Profile a business website using Playwright.
        Extracts colors, logo, persona, and menu screenshot.

        Returns an EnrichedProfile dict.
        """
        browser = None
        try:
            from playwright.async_api import async_playwright

            pw = await async_playwright().__aenter__()
            browser = await pw.chromium.launch()
            context = await browser.new_context(
                ignore_https_errors=True,
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            )
            page = await context.new_page()
            await page.goto(url, wait_until="load", timeout=30000)
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")

            try:
                await page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass

            # Extract profile data
            result = await page.evaluate("""() => {
                const toHex = (color) => {
                    if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return null;
                    const m = color.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
                    if (!m) return color.startsWith('#') ? color : null;
                    const r = parseInt(m[1]).toString(16).padStart(2, '0');
                    const g = parseInt(m[2]).toString(16).padStart(2, '0');
                    const b = parseInt(m[3]).toString(16).padStart(2, '0');
                    return `#${r}${g}${b}`;
                };

                // Colors
                const headerEl = document.querySelector('header') || document.querySelector('nav') || document.querySelector('.navbar');
                let primaryColor = headerEl ? toHex(getComputedStyle(headerEl).backgroundColor) : null;
                if (!primaryColor) primaryColor = '#4f46e5';
                const bodyBg = toHex(getComputedStyle(document.body).backgroundColor);
                const secondaryColor = bodyBg || '#ffffff';

                // Logo
                const logoImg = document.querySelector('img[src*="logo"]') ||
                    document.querySelector('img[alt*="logo" i]') ||
                    document.querySelector('header img:first-of-type');
                const logoUrl = logoImg?.src || null;

                // Persona
                const bodyText = document.body.innerText.toLowerCase();
                let persona = 'Local Business';
                if (/artisanal|craft|organic|farm.to|hand.crafted/.test(bodyText)) persona = 'Modern Artisan';
                else if (/est\\.|family.owned|since \\d{4}|established/.test(bodyText)) persona = 'Classic Establishment';
                else if (/fast|quick|express|drive.through/.test(bodyText)) persona = 'Quick Service';
                else if (/fine dining|michelin|prix fixe/.test(bodyText)) persona = 'Fine Dining';

                return { primaryColor, secondaryColor, logoUrl, persona };
            }""")

            # Find and screenshot menu page
            menu_screenshot_base64 = None
            try:
                menu_link = await page.query_selector(
                    'a:has-text("Menu"), a:has-text("menu"), a[href*="menu"]'
                )
                if menu_link:
                    menu_href = await menu_link.get_attribute("href")
                    if menu_href:
                        if menu_href.startswith("/"):
                            from urllib.parse import urlparse
                            parsed = urlparse(url)
                            menu_href = f"{parsed.scheme}://{parsed.netloc}{menu_href}"

                        await page.goto(menu_href, wait_until="load", timeout=15000)
                        await page.wait_for_timeout(2000)
                        screenshot = await page.screenshot(type="jpeg", full_page=True, quality=80)
                        menu_screenshot_base64 = base64.b64encode(screenshot).decode("utf-8")
            except Exception as e:
                logger.warning(f"[ProfilerAgent] Menu screenshot failed: {e}")

            return {
                "officialUrl": url,
                "primaryColor": result.get("primaryColor", "#4f46e5"),
                "secondaryColor": result.get("secondaryColor", "#ffffff"),
                "logoUrl": result.get("logoUrl"),
                "persona": result.get("persona", "Local Business"),
                "menuScreenshotBase64": menu_screenshot_base64,
            }

        except Exception as e:
            logger.error(f"[ProfilerAgent] Failed to profile {url}: {e}")
            return {
                "officialUrl": url,
                "primaryColor": "#4f46e5",
                "secondaryColor": "#ffffff",
                "persona": "Local Business",
            }
        finally:
            if browser:
                await browser.close()
