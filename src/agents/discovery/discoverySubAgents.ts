import { AgentModels } from "../config";
import { BaseIdentity, EnrichedProfile } from '@/agents/types';
import { chromium } from 'playwright';
import { FunctionTool, LlmAgent, ParallelAgent } from '@google/adk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// --- TOOLS ---

const googleSearchParams = z.object({
    query: z.string().describe("The search query to execute")
});

// Since we are running the discovery agents concurrently using ADK's ParallelAgent,
// we define a deterministic scrape Menu tool that will be triggered by the Menu Agent.
const ScrapeMenuTool = new FunctionTool({
    name: 'scrape_menu',
    description: 'Use this tool to navigate to a restaurant website and extract a full-page screenshot of its menu in base64 format.',
    parameters: z.object({
        officialUrl: z.string().describe("The official URL of the restaurant")
    }),
    execute: async ({ officialUrl }) => {
        let browser;
        try {
            console.log(`[ScrapeMenuTool] Crawling ${officialUrl}...`);
            browser = await chromium.launch();
            const context = await browser.newContext({ ignoreHTTPSErrors: true });
            const page = await context.newPage();

            await page.goto(officialUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            console.log("[ScrapeMenuTool] Looking for menu link...");
            const menuHref = await page.evaluate<string | null>(`(() => {
                const anchors = Array.from(document.querySelectorAll('a'));
                const menuLink = anchors.find(a =>
                    (a.innerText && a.innerText.toLowerCase().includes('menu')) ||
                    (a.href && a.href.toLowerCase().includes('menu'))
                );
                return menuLink ? menuLink.href : null;
            })()`);

            if (menuHref) {
                console.log("[ScrapeMenuTool] Found menu link:", menuHref);
                let finalMenuUrl = menuHref;
                if (menuHref.startsWith('/')) {
                    const baseUrl = new URL(officialUrl);
                    finalMenuUrl = `${baseUrl.origin}${menuHref}`;
                }
                await page.goto(finalMenuUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            } else {
                console.log("[ScrapeMenuTool] No menu link found, assuming homepage is the menu.");
            }

            await page.waitForTimeout(2000); // Allow dynamic rendering
            const buffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 60 });
            console.log("[ScrapeMenuTool] Menu screenshot captured.");
            return { screenshotBase64: buffer.toString('base64') };

        } catch (error: any) {
            console.error("[ScrapeMenuTool] Failed:", error.message);
            return { error: error.message };
        } finally {
            if (browser) await browser.close();
        }
    }
});

// Since the ADK TS package doesn't natively expose the Python Google Search tool,
// we build a deterministic internal query tool that uses pure Gemini Grounding.
const GoogleSearchTool = new FunctionTool({
    name: 'googleSearch',
    description: 'Search Google for a query to find factual information, URLs, or real-world entities.',
    parameters: googleSearchParams,
    execute: async ({ query }) => {
        try {
            console.log(`[GoogleSearchTool] Executing grounded query: ${query}`);
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({
                model: AgentModels.DEFAULT_FAST_MODEL,
                tools: [{
                    // @ts-ignore
                    googleSearch: {}
                }]
            });
            const result = await model.generateContent(`Execute this search and summarize the top facts and URLs precisely related to: ${query}`);
            return { result: result.response.text() };
        } catch (e: any) {
            console.error("[GoogleSearchTool] Failed:", e);
            return { error: "Search failed." };
        }
    }
});

// --- SUB-AGENTS ---

export const menuDiscoveryAgent = new LlmAgent({
    name: 'MenuDiscoveryAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are an AI Web Scraper. You will be given a business URL. You MUST call the 'scrape_menu' tool with the exact URL provided.

    CRITICAL: When the tool returns the base64 screenshot, YOU MUST OUTPUT ONLY THE RAW BASE64 STRING.
    DO NOT PREFACE YOUR ANSWER. DO NOT SAY "Here is the base64". JUST OUTPUT THE BASE64 AND NOTHING ELSE.`,
    tools: [ScrapeMenuTool],
    outputKey: 'menuScreenshotBase64'
});

export const socialDiscoveryAgent = new LlmAgent({
    name: 'SocialDiscoveryAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `
    Find the exact, official social media profile URLs for the business provided.
    Use Google Search to verify each link. Search for each platform individually if needed.

    Platforms to find: Instagram, Facebook, Twitter/X, TikTok, YouTube, LinkedIn, Yelp, Google Business Profile.

    Return ONLY a valid JSON object. Include only platforms you find with confidence. Omit missing ones entirely.
    CRITICAL: Do not write any markdown blocks or conversational text. ONLY raw JSON!
    {
        "instagram": "https://instagram.com/...",
        "facebook": "https://facebook.com/...",
        "twitter": "https://twitter.com/...",
        "tiktok": "https://tiktok.com/@...",
        "youtube": "https://youtube.com/...",
        "linkedin": "https://linkedin.com/company/...",
        "yelp": "https://yelp.com/biz/...",
        "googleBusiness": "https://maps.google.com/..."
    }
    `,
    tools: [GoogleSearchTool],
    outputKey: 'socialLinks'
});

export const mapsDiscoveryAgent = new LlmAgent({
    name: 'MapsDiscoveryAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `
    Find the exact, official Google Maps Place URL for the business provided.
    You must use Google Search.

    CRITICAL: Return ONLY the raw URL string. If not found, return an empty string. DO NOT explain yourself. DO NOT say "Here is the URL". JUST THE URL.
    `,
    tools: [GoogleSearchTool],
    outputKey: 'googleMapsUrl'
});

export const contactInfoAgent = new LlmAgent({
    name: 'ContactInfoAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `
    Find the contact information for the business provided.
    Use Google Search to find the official email address, phone number, and business hours.

    Search strategies:
    1. Search for "{business name} {city} phone number email"
    2. Search for "{business name} hours of operation contact"
    3. Check the Google Business listing, official website, or Yelp page

    Return ONLY a valid JSON object. Omit any key you cannot confidently verify.
    CRITICAL: Do not write any markdown blocks or conversational text. ONLY raw JSON!
    {
        "email": "contact@business.com",
        "phone": "+1 (XXX) XXX-XXXX",
        "hours": "Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun 12pm-9pm"
    }

    For hours: produce a single compact string. Summarize clearly if different per day.
    If you cannot find a piece of information after searching, omit that key.
    `,
    tools: [GoogleSearchTool],
    outputKey: 'contactInfo'
});

export const competitorDiscoveryAgent = new LlmAgent({
    name: 'CompetitorDiscoveryAgent',
    model: AgentModels.DEEP_ANALYST_MODEL,
    instruction: `
    Find exactly 3 direct local competitors for the business provided.
    They must be in the same geographic area and serve similar cuisine or services.
    Use Google Search to verify their existence and retrieve their full details.

    For each competitor, find:
    - name: Business name
    - url: Official website (or Yelp/Google listing if no website exists)
    - address: Full street address including city and state
    - phone: Phone number formatted as "+1 (XXX) XXX-XXXX"
    - cuisineType: Type of cuisine or service (e.g. "Mediterranean", "American Diner", "Fast Casual Pizza")
    - priceRange: "$" (under $15 avg entree), "$$" ($15-$30), "$$$" (over $30)
    - reason: 1-2 sentences on why they are a direct competitor

    SYSTEM COMMAND: RETURN ONLY A RAW JSON ARRAY. NO TEXT OUTSIDE THE ARRAY.
    [
        {
            "name": "Competitor Name",
            "url": "https://competitor.com",
            "address": "123 Main St, City, NJ 07000",
            "phone": "+1 (201) 555-5678",
            "cuisineType": "Mediterranean",
            "priceRange": "$$",
            "reason": "Serves identical mezze-style Mediterranean cuisine 0.4 miles away."
        }
    ]
    `,
    tools: [GoogleSearchTool],
    outputKey: 'competitors'
});

// --- ORCHESTRATOR ---

export const discoveryParallelAgent = new ParallelAgent({
    name: 'DiscoveryOrchestrator',
    description: 'Runs multiple specialized discovery agents concurrently.',
    subAgents: [
        menuDiscoveryAgent,
        socialDiscoveryAgent,
        mapsDiscoveryAgent,
        contactInfoAgent,
        competitorDiscoveryAgent,
    ]
});
