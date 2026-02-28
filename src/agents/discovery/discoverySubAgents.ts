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
    Find the official social media profiles AND contact details for the business provided.
    Use Google Search to find this information from the business website or Google Maps listing.

    Return ONLY a valid JSON object with the following keys. Omit any key you cannot verify.
    CRITICAL: Do not write any markdown blocks or conversational text. ONLY raw JSON!
    {
        "instagram": "https://instagram.com/...",
        "facebook": "https://facebook.com/...",
        "twitter": "https://twitter.com/...",
        "phone": "+1 (555) 123-4567",
        "email": "info@restaurant.com",
        "hours": "Mon-Thu 11am-9pm, Fri-Sat 11am-10pm, Sun 12pm-8pm"
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
    tools: [GoogleSearchTool], // Allows grounding
    outputKey: 'googleMapsUrl'
});

export const competitorDiscoveryAgent = new LlmAgent({
    name: 'CompetitorDiscoveryAgent',
    model: AgentModels.DEEP_ANALYST_MODEL,
    instruction: `
    Find exactly 3 direct local competitors for the business provided. 
    They should be in the same geographic area serving similar cuisine or services.
    You must use Google Search to verify their existence and retrieve their data.
    
    SYSTEM COMMAND: YOU MUST RETURN ONLY A RAW JSON ARRAY. DO NOT WRITE ANY TEXT OUTSIDE THE ARRAY.
    Example output format:
    [
        {
            "name": "Competitor Name",
            "url": "https://competitor.com",
            "reason": "Why they are a competitor"
        }
    ]
    `,
    outputKey: 'competitors'
});

const ThemeScrapeTool = new FunctionTool({
    name: 'scrape_theme',
    description: 'Visit a restaurant homepage and extract brand theme assets: favicon, logo URL, primary/secondary colors, and persona.',
    parameters: z.object({
        officialUrl: z.string().describe("The official URL of the restaurant")
    }),
    execute: async ({ officialUrl }) => {
        let browser;
        try {
            console.log(`[ThemeScrapeTool] Extracting theme from ${officialUrl}...`);
            browser = await chromium.launch();
            const context = await browser.newContext({ ignoreHTTPSErrors: true });
            const page = await context.newPage();
            await page.goto(officialUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(1500);

            const origin = new URL(officialUrl).origin;

            const result = await page.evaluate((origin: string) => {
                // Favicon
                const faviconEl =
                    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
                    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]') ||
                    document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
                let favicon = faviconEl?.href || `${origin}/favicon.ico`;
                if (favicon.startsWith('/')) favicon = `${origin}${favicon}`;

                // Logo
                const logoEl =
                    document.querySelector<HTMLImageElement>('img[src*="logo"]') ||
                    document.querySelector<HTMLImageElement>('header img') ||
                    document.querySelector<HTMLImageElement>('[class*="logo"] img');
                let logoUrl = logoEl?.src || null;
                if (logoUrl && logoUrl.startsWith('/')) logoUrl = `${origin}${logoUrl}`;

                // Primary color — theme-color meta or header/nav background
                const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
                let primaryColor = themeColor || null;
                if (!primaryColor) {
                    const headerEl = document.querySelector('header') || document.querySelector('nav') || document.querySelector('.navbar');
                    if (headerEl) {
                        const bg = getComputedStyle(headerEl).backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') primaryColor = bg;
                    }
                }
                if (!primaryColor) primaryColor = '#4f46e5';

                // Secondary color — body background
                const bodyBg = getComputedStyle(document.body).backgroundColor;
                const secondaryColor = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent')
                    ? bodyBg : '#0f172a';

                // Persona — body text keyword scan
                const bodyText = document.body.innerText.toLowerCase();
                let persona = 'Local Business';
                if (/artisanal|craft|organic|farm.to|hand.crafted/.test(bodyText)) {
                    persona = 'Modern Artisan';
                } else if (/est\.|family.owned|since \d{4}|established/.test(bodyText)) {
                    persona = 'Classic Establishment';
                }

                return { logoUrl, favicon, primaryColor, secondaryColor, persona };
            }, origin);

            console.log("[ThemeScrapeTool] Theme extracted:", result);
            return result;
        } catch (error: any) {
            console.error("[ThemeScrapeTool] Failed:", error.message);
            return { logoUrl: null, favicon: null, primaryColor: '#4f46e5', secondaryColor: '#0f172a', persona: 'Local Business' };
        } finally {
            if (browser) await browser.close();
        }
    }
});

export const themeDiscoveryAgent = new LlmAgent({
    name: 'ThemeDiscoveryAgent',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are a Brand Theme Extractor. You will be given a business URL.

    You MUST call the 'scrape_theme' tool with the exact URL provided.

    CRITICAL: When the tool returns the JSON result, YOU MUST OUTPUT ONLY THE RAW JSON STRING returned by the tool.
    DO NOT PREFACE YOUR ANSWER. DO NOT SAY "Here is the JSON". JUST OUTPUT THE JSON AND NOTHING ELSE.`,
    tools: [ThemeScrapeTool],
    outputKey: 'themeData'
});

// --- ORCHESTRATOR ---

export const discoveryParallelAgent = new ParallelAgent({
    name: 'DiscoveryOrchestrator',
    description: 'Runs multiple specialized discovery agents concurrently.',
    subAgents: [menuDiscoveryAgent, socialDiscoveryAgent, mapsDiscoveryAgent, competitorDiscoveryAgent, themeDiscoveryAgent]
});
