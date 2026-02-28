/**
 * Social Media Auditor agents
 *
 * SocialAuditorAgent      — deep-dives the TARGET business's own social presence
 * CompetitorSocialAgent   — profiles each competitor's social channels
 * SocialStrategistAgent   — synthesises both audits into a SocialStrategyReport
 */
import { AgentModels } from '../config';
import { LlmAgent, FunctionTool } from '@google/adk';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Shared grounded search tool ───────────────────────────────────────────────

const SocialSearchTool = new FunctionTool({
    name: 'socialSearch',
    description: 'Execute a Google Search to find social media follower counts, posting frequency, engagement rates, or content styles for a business or platform.',
    parameters: z.object({
        query: z.string().describe('e.g. "Bosphorus Nutley NJ Instagram followers engagement"')
    }),
    execute: async ({ query }) => {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({
                model: AgentModels.DEFAULT_FAST_MODEL,
                tools: [{ googleSearch: {} } as any]
            });
            const result = await model.generateContent(
                `Search and return exact numeric social media data (follower counts, post frequency, engagement rates) for: ${query}`
            );
            return { result: result.response.text() };
        } catch (e: any) {
            return { error: 'Search failed.' };
        }
    }
});

// ── Agent 1: Target business social auditor ───────────────────────────────────

export const SocialAuditorAgent = new LlmAgent({
    name: 'SocialAuditorAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are a Social Media Analyst specialising in restaurant brands.
You will receive a business name, address, official URL, and any known social media links.

YOUR TASK:
Use the 'socialSearch' tool to audit EACH platform this business uses (and check for platforms they might be missing).
For each platform found, determine:
  - Approximate follower / subscriber count
  - Posting frequency (daily / weekly / sporadic)
  - Dominant content type (food photography, Reels, Stories, UGC, etc.)
  - Engagement level: none | low | medium | high
  - 1-2 specific weaknesses (e.g. "Low Reel production", "No TikTok presence")
  - Score 0-100 representing overall channel health

Platforms to investigate: Instagram, TikTok, Facebook, YouTube, LinkedIn, Yelp.
If a platform is NOT found for the business, still include it with engagementLevel:"none" and score:0.

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation. Each element:
{
  "platform": "Instagram",
  "url": "https://...",
  "estimatedFollowers": "2,400",
  "postingFrequency": "2-3x per week",
  "engagementLevel": "medium",
  "topContentType": "Food photography & Stories",
  "weaknesses": ["No Reels", "Inconsistent posting"],
  "score": 42
}`,
    tools: [SocialSearchTool],
    outputKey: 'socialAudit'
});

// ── Agent 2: Competitor social profiler ───────────────────────────────────────

export const CompetitorSocialAgent = new LlmAgent({
    name: 'CompetitorSocialAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are a Competitive Social Media Intelligence Agent.
You will receive a list of 3 local competitors (name, url, address).

YOUR TASK:
Use 'socialSearch' to research each competitor's social media presence.
For each competitor find:
  - Which platforms they are active on, with URLs and estimated follower counts
  - Their dominant content style and strategy
  - Their strongest platform
  - Estimated total social following across all platforms
  - Threat level 1-10 (how much their social presence threatens our target)

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation. Each element:
{
  "name": "Competitor Name",
  "platforms": [
    { "platform": "Instagram", "url": "https://...", "estimatedFollowers": "5,200", "contentStyle": "Lifestyle Reels" }
  ],
  "strongestPlatform": "Instagram",
  "totalEstimatedFollowers": "7,800",
  "contentStrategy": "Heavy video-first with daily Stories",
  "threatLevel": 7
}`,
    tools: [SocialSearchTool],
    outputKey: 'competitorSocialProfiles'
});

// ── Agent 3: Social Strategist (synthesis) ────────────────────────────────────

export const SocialStrategistAgent = new LlmAgent({
    name: 'SocialStrategistAgent',
    model: AgentModels.DEEP_ANALYST_MODEL,
    instruction: `You are the Chief Social Media Strategist for Hephae.
You will receive:
  1. BUSINESS: The target restaurant's identity (name, address, social links)
  2. OWN AUDIT: A JSON array of SocialChannelAudit objects for the target
  3. COMPETITOR PROFILES: A JSON array of CompetitorSocialProfile objects

YOUR TASK:
Synthesise both datasets into a comprehensive SocialStrategyReport.

CRITICAL: Return ONLY valid JSON matching this structure exactly. No markdown fences.
{
  "business": { "name": "...", "address": "..." },
  "overallScore": 0-100,
  "executiveSummary": "2-3 sentence executive summary of their social media health vs competitors",
  "channelAudits": [ /* pass through the own audit array verbatim */ ],
  "competitorProfiles": [ /* pass through the competitor profiles array verbatim */ ],
  "gapAnalysis": [
    "Gap statement 1 (e.g. Competitors average 8k followers on TikTok; you have none)",
    "Gap statement 2",
    "Gap statement 3"
  ],
  "contentPillars": [
    {
      "name": "Behind-the-Kitchen Reels",
      "platform": "Instagram",
      "postingFrequency": "3x per week",
      "rationale": "Why this pillar will close the gap",
      "examplePrompt": "Film the chef plating your signature dish — show the flame, the sauce pour, the final garnish. Caption: [hook]"
    }
  ],
  "quickWins": [
    "Specific action to do THIS WEEK — e.g. Claim your TikTok handle before a competitor does"
  ],
  "thirtyDayPlan": [
    "Week 1: ...",
    "Week 2: ...",
    "Week 3: ...",
    "Week 4: ..."
  ],
  "generatedAt": "ISO timestamp"
}

RULES:
- contentPillars: exactly 4-5 pillars across different platforms
- quickWins: exactly 3-5 highly specific, actionable items
- thirtyDayPlan: exactly 4 weekly steps, ordered by priority
- overallScore: weighted average of channel scores, adjusted for competitive gap
- Be specific — reference the actual business name and competitor names throughout`,
    tools: [],
    outputKey: 'socialStrategyReport'
});
