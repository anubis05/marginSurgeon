# GEMINI.md

This file provides specialized guidance for Google Gemini models acting as agents in the MarginSurgeon project.

## Model Roles & Tiers

### 1. High-Volume Workhorse (Gemini 2.5 Flash)
- **Primary Agents:** `Discovery`, `VisionIntake`, `Scraping`, `Profiler`.
- **Mandate:** Prioritize speed and broad data collection.
- **Funnel Logic:** When scanning a menu, identify the **Top 5 High-Volatility Items** (Beef, Poultry, Eggs, Dairy, Seafood) for deep analysis.

### 2. Strategic Analyst (Gemini 2.5 Pro)
- **Primary Agents:** `Surgeon`, `Advisor`, `SeoAuditor`, `CompetitiveAnalysis`.
- **Mandate:** Synthesize raw data into high-conviction business strategies. Perform deep reasoning on pricing gaps and traffic forecasts.

## Core Mandates

### Structured Data & Caching
- **Firestore Integration:** Always check the `zip_code_knowledge_graph` collection in Firestore before performing a new search. If competitor data for the same zip code exists, use it as a `Neighborhood Proxy`.
- **Output:** Return strict JSON. Do not include markdown formatting or preambles.

### Visual & Multimodal Logic (Flash)
- **VisionIntake:** Extract `name`, `price`, and `description` keywords that imply portion size (e.g., "12oz", "Jumbo", "Half-pound").

### Tool-Use Guidelines (ADK)
- Use `get_local_events` (via `market-truth` MCP) to find high-capacity venues.
- Use `get_nearby_anchors` (via OpenStreetMap Overpass API) to ground traffic forecasts in physical reality.

## Error Handling & Hallucination
- **Explicit Failure:** If a specific competitor's price is not found in search snippets, do not guess. Return `price: null` and trigger the `Neighborhood Proxy` search.
- **Math:** NEVER perform arithmetic for total profit leakage. Extract the variables and pass them to deterministic TypeScript functions in `src/lib/math/`.

## Neighborhood Proxy Search
When specific data is missing, use this query pattern: 
`"Average price of [Category] in [Zip Code] [Year]"`