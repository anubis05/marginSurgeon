# CLAUDE.md

This file provides guidance to any LLM (including Claude 3.5 Sonnet) working on this project as a reference for the latest MarginSurgeon architecture.

## Model Strategy (Gemini-First)

This project standardizes on **Google Gemini 2.5** for all core operations:
- **Gemini 2.5 Flash:** High-volume "workhorse" tasks (Scraping, OCR, Discovery, Initial Profiler).
- **Gemini 2.5 Pro:** Strategic synthesis and deep reasoning (Surgeon, Advisor, SEO Auditor).

## Core Architecture: The "High-Impact Funnel"

The pipeline follows a strict sequence to generate high-conviction "Surgical Intelligence" reports:
1.  **Funnel (Gemini Flash):** Broad menu scraping and identity discovery. It picks the **Top 5 High-Volatility Items** (Beef, Poultry, Seafood, Eggs, Dairy) for deep analysis.
2.  **Surgical Analysis (Gemini Pro):** Deep reasoning on those 5 items using USDA trends and neighborhood proxies.
3.  **Data Layer:** Firestore is used as a **Zip Code Knowledge Graph** for cross-prospect caching.

## Deterministic Math Requirement
- **Arithmetic Prohibition:** Do not perform calculations for "Annual Profit Leakage" or "Margin %" within the prompt. 
- **Action:** Extract the necessary variables (Prospect Price, Commodity Cost, Neighborhood Average) into a structured JSON. 
- **Logic:** These variables are piped into deterministic TypeScript functions in `src/lib/math/`. Your job is to interpret the *result* of those calculations.

## Model Configuration (`src/agents/config.ts`)
- `DEFAULT_FAST_MODEL` (Gemini 2.5 Flash): Scraping, Discovery, Vision.
- `STRATEGIC_LOGIC_MODEL` (Gemini 2.5 Pro): Surgeon, Advisor, SEO Auditor.
- `DEEP_ANALYST_MODEL` (Gemini 2.5 Pro): Complex SEO/Market positioning.

## MCP Integration
`mcp-servers/market-truth` provides:
- `get_usda_wholesale_prices`: Live commodity costs.
- `get_bls_cpi_data` / `get_fred_economic_indicators`: Macro trends.
- `get_weather_hourly`: Hourly precipitation probability (via Open-Meteo).
- `get_nearby_anchors`: Traffic anchors (via OpenStreetMap Overpass API).

## The "Sassy Advisor" Persona
- **Tone:** Professional, data-backed, but provocative and "sassy."
- **Focus:** Highlight the "Invisible Bleed"—the money the owner is losing right now.
- **Example:** "You're essentially giving away a free burger for every table of four on Friday nights. Here is the math to stop the bleed."

## Handling Gaps
- **Proxy Reasoning:** If Gemini Flash cannot find a specific competitor price, it provides a `Neighborhood Proxy`. Gemini Pro must use this to build a "Market Gravity" argument. "You are $3.00 under the neighborhood average for this zip code."

## Data Strategy
- Use `src/lib/data/standard_recipes.json` for "Standard Industry Benchmarks" to estimate COGS without internal recipes.
