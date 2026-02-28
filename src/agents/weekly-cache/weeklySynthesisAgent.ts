/**
 * weeklySynthesisAgent — cross-domain LLM synthesis of all raw weekly data.
 *
 * Takes the five raw data payloads (weather, events, venues, commodities, macro)
 * and produces a WeeklySynthesis document. Uses DEEP_ANALYST_MODEL because this
 * is a batch job where quality matters more than latency.
 *
 * The agentHints fields are the key consumer-facing output: they are injected
 * directly into on-demand agent system prompts to skip redundant reasoning.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentModels } from '../config';
import type { ZipRawData, WeeklySynthesis, BLSRegion } from '@/lib/types';

function mondayOfCurrentWeek(): string {
    const d = new Date();
    const day = d.getDay();               // 0=Sun … 6=Sat
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

export async function synthesizeWeeklyData(
    zipCode: string,
    region: BLSRegion,
    raw: ZipRawData
): Promise<WeeklySynthesis> {
    if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: AgentModels.DEEP_ANALYST_MODEL,
        systemInstruction: 'You are a weekly market intelligence analyst. Return only strict JSON.',
    });

    const prompt = `
You are analyzing a week of local market data for zip code ${zipCode} (region: ${region}).

## RAW DATA

### WEATHER (7-day NWS forecast)
${JSON.stringify(raw.weather, null, 2)}

### EVENTS (upcoming local events)
${JSON.stringify(raw.events, null, 2)}

### NEARBY VENUES (Foursquare places within 1.5km)
${JSON.stringify(raw.venues, null, 2)}

### COMMODITY PRICES (BLS retail prices)
${JSON.stringify(raw.commodities, null, 2)}

### MACROECONOMIC INDICATORS (BLS CPI + FRED)
${JSON.stringify(raw.macroeconomic, null, 2)}

## YOUR TASK
Synthesize all of the above into a single WeeklySynthesis JSON document.

Return ONLY valid JSON matching this exact structure (no markdown fences):
{
  "zipCode": "${zipCode}",
  "weekOf": "${mondayOfCurrentWeek()}",
  "synthesizedAt": "${new Date().toISOString()}",
  "trafficOutlook": {
    "overallRating": "slow|moderate|strong|exceptional",
    "peakDay": "day name",
    "riskWindows": ["e.g. Wednesday lunch"],
    "boostWindows": ["e.g. Saturday evening"],
    "keyDrivers": ["plain English explanation of top 3 factors"],
    "weeklyHeadline": "one sentence executive summary"
  },
  "commodityAlerts": [
    {
      "commodity": "Eggs",
      "severity": "info|warning|critical",
      "inflationRate": 23.4,
      "suggestedPriceAdjustment": "$0.50–$1.25",
      "affectedMenuCategories": ["Breakfast", "Brunch"],
      "actionBullet": "Ready-to-display action string"
    }
  ],
  "economicContext": {
    "consumerPressure": "low|moderate|high",
    "priceIncreaseSafety": "safe_large|safe_small|cautious|avoid",
    "unemploymentRate": 4.1,
    "cpiYoY": 3.2,
    "headline": "One sentence economic context for restaurant owners"
  },
  "competitorLandscape": {
    "totalVenuesInRadius": 18,
    "saturationLevel": "low|medium|high",
    "dominantCuisines": ["Italian", "American"],
    "whiteSpaceOpportunities": ["No fast-casual pizza within 0.5mi"],
    "averagePricePoint": "$12–$18 entrees",
    "threatLevel": "low|medium|high",
    "headline": "One sentence competitive positioning summary"
  },
  "weeklyBullets": [
    "4–6 ready-to-display bullet points for any UI"
  ],
  "agentHints": {
    "forecaster": "Specific guidance for the foot traffic forecaster agent (key events, weather impacts, peak windows)",
    "surgeon": "Specific guidance for the margin surgeon agent (which commodities to focus on, magnitude of adjustments)",
    "advisor": "Specific guidance for the strategic advisor agent (consumer confidence, competitive positioning)",
    "seo": "Specific guidance for the SEO auditor agent (local competition level, differentiation opportunities)"
  }
}

Rules:
- commodityAlerts: only include commodities with inflation_rate > 5% or where trend30Day contains significant movement
- weeklyBullets: 4–6 bullets, action-oriented, ready to display in a restaurant owner dashboard
- agentHints: be specific and quantitative where possible (mention exact % changes, specific events)
`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    });

    const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text) as WeeklySynthesis;
}
