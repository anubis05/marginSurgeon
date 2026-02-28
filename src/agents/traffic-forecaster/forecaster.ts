import { AgentModels } from "../config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseIdentity } from '@/agents/types';
import { ForecastResponse } from "@/components/Chatbot/types";
import { FunctionTool, LlmAgent, ParallelAgent, Runner, InMemorySessionService } from "@google/adk";
import { z } from "zod";
import { db } from '@/lib/firebase';
import { fetchWeather } from '../data-sources/weatherFetcher';
import { ZipCacheReader } from '../weekly-cache/zipCacheReader';

// Create a deterministic Google Search Tool for context gatherers
const GoogleSearchTool = new FunctionTool({
    name: 'googleSearch',
    description: 'Search Google for a query to find factual information, weather, or local events.',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({
                model: AgentModels.DEFAULT_FAST_MODEL,
                tools: [{ googleSearch: {} } as any]
            });
            const result = await model.generateContent(`Execute this search and summarize the top facts related to: ${query}`);
            return { result: result.response.text() };
        } catch (e: any) {
            return { error: "Search failed." };
        }
    }
});

// NWS weather tool — delegates to the shared weatherFetcher, then caches in Firestore
// keyed by zip code (not business name) for better cache efficiency.
const WEATHER_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6-hour TTL for on-demand fallback

const getWeatherForecastTool = new FunctionTool({
    name: 'getWeatherForecast',
    description: 'Get a 3-day structured weather forecast from the National Weather Service (NWS) API using latitude/longitude coordinates. Use this for US locations whenever coordinates are available.',
    parameters: z.object({
        latitude:  z.number().describe('Latitude of the location'),
        longitude: z.number().describe('Longitude of the location'),
        zipCode:   z.string().optional().describe('5-digit US zip code — used as Firestore cache key'),
    }),
    execute: async ({ latitude, longitude, zipCode }) => {
        const cacheKey = zipCode ?? null;

        // Check short-lived Firestore cache first (keyed by zip, not business name)
        if (cacheKey) {
            try {
                const doc = await db.collection('cache_weather').doc(cacheKey).get();
                if (doc.exists) {
                    const cached = doc.data() as any;
                    const age = Date.now() - (cached.cachedAt?.toMillis?.() ?? 0);
                    if (age < WEATHER_CACHE_TTL_MS) {
                        console.log(`[WeatherTool] Cache HIT for zip ${zipCode}`);
                        return { ...cached.forecast, source: 'NWS (cached)' };
                    }
                }
            } catch (e) {
                console.warn('[WeatherTool] Firestore cache read failed:', e);
            }
        }

        // Delegate to the shared pure fetcher
        const result = await fetchWeather(latitude, longitude);

        // Write to Firestore cache
        if (cacheKey && !result.error) {
            try {
                await db.collection('cache_weather').doc(cacheKey).set({
                    zipCode: cacheKey,
                    forecast: result,
                    cachedAt: new Date(),
                });
            } catch (e) {
                console.warn('[WeatherTool] Firestore cache write failed:', e);
            }
        }

        return result;
    }
});

const poiGatherer = new LlmAgent({
    name: 'PoiGatherer',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are a Location Intelligence Agent. Use Google Search to find Surrounding POIs near the provided business.
    Find: 1. Business Category, 2. Opening Hours (7 days), 3. 5 specific nearby locations (2 Competitors, 2 Event Venues, 3 Traffic Drivers).
    Output exactly the intelligence report as clean markdown text.`,
    tools: [GoogleSearchTool],
    outputKey: 'poiDetails'
});

const weatherGatherer = new LlmAgent({
    name: 'WeatherGatherer',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are a Weather Intelligence Agent. Your task is to get a precise 3-day weather forecast for the provided location.

    **STRATEGY:**
    1. If the prompt contains numeric coordinates (latitude and longitude that are NOT 0,0), call 'getWeatherForecast' with those exact coordinates and pass the business name as 'businessName'.
    2. If 'getWeatherForecast' returns an error field (e.g. NWS unavailable), immediately fall back to 'googleSearch' with the query: "[Location] weather forecast next 3 days".
    3. Only skip 'getWeatherForecast' entirely if the coordinates are missing or both are 0.

    **OUTPUT:** A day-by-day summary for TODAY, TOMORROW, and the DAY AFTER TOMORROW. Include High/Low Temps (°F), precipitation chance (%), wind, and short forecast description. Output as clean markdown text.`,
    tools: [getWeatherForecastTool, GoogleSearchTool],
    outputKey: 'weatherData'
});

const eventsGatherer = new LlmAgent({
    name: 'EventsGatherer',
    model: AgentModels.DEFAULT_FAST_MODEL,
    instruction: `You are an Events Intelligence Agent. Use Google Search to find UPCOMING local events in the provided location for the next 3 days that would drive foot traffic to nearby businesses.

    **INCLUDE ONLY:**
    - Community festivals, fairs, street markets
    - Concerts, live music, performances
    - Sporting events (games, races, tournaments)
    - Parades, cultural celebrations, holiday events
    - College/school events (graduation, game days)

    **STRICTLY EXCLUDE:**
    - News articles, crime reports, arrests, or police incidents
    - Weather alerts or emergency notices
    - Past events (anything that has already occurred)
    - Generic "things to do" listicles with no specific date
    - Political news or government announcements

    If no qualifying events are found, output "No major foot-traffic events scheduled in this area for the next 3 days."
    Output a day-by-day list of UPCOMING events only as clean markdown text.`,
    tools: [GoogleSearchTool],
    outputKey: 'eventsData'
});

const contextGatheringPipeline = new ParallelAgent({
    name: 'ContextGatherer',
    description: 'Gathers POIs, Weather, and Events in parallel.',
    subAgents: [poiGatherer, weatherGatherer, eventsGatherer]
});

export class ForecasterAgent {
    static async forecast(identity: BaseIdentity): Promise<ForecastResponse> {
        if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

        // ── Weekly cache fast path ────────────────────────────────────────────
        // If the weekly cache is warm for this zip code, use its pre-fetched raw
        // data and inject the synthesis hint into the forecast prompt, skipping
        // the expensive ParallelAgent entirely.
        if (identity.zipCode) {
            const cached = await ZipCacheReader.get(identity.zipCode).catch(() => null);
            if (cached) {
                console.log(`[ForecasterAgent] Cache HIT for zip ${identity.zipCode} — skipping ParallelAgent.`);
                const { weather, events, venues } = cached.raw;
                const synthesisHint = cached.synthesis?.agentHints?.forecaster ?? '';

                return ForecasterAgent.synthesizeForecast(identity, {
                    poiDetails:  JSON.stringify(venues),
                    weatherData: JSON.stringify(weather),
                    eventsData:  JSON.stringify(events),
                    extraContext: synthesisHint ? `\nWEEKLY SYNTHESIS CONTEXT: ${synthesisHint}` : '',
                });
            }
        }

        console.log(`[ForecasterAgent] Gathering Intelligence via ParallelAgent for: ${identity.name}...`);

        const today = new Date();
        const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const locationQuery = identity.address || `${identity.coordinates?.lat}, ${identity.coordinates?.lng}`;

        const sessionService = new InMemorySessionService();
        const runner = new Runner({ appName: 'hephae-hub', agent: contextGatheringPipeline, sessionService });

        const sessionId = "forecast-" + Date.now();
        await sessionService.createSession({ appName: 'hephae-hub', sessionId, userId: 'sys', state: {} });

        const lat = identity.coordinates?.lat ?? 0;
        const lng = identity.coordinates?.lng ?? 0;
        const prompt = `Business: ${identity.name}\nLocation: ${locationQuery}\nLatitude: ${lat}\nLongitude: ${lng}\nToday: ${dateString}\n\nPlease gather intelligence context.`;

        const stream = runner.runAsync({
            sessionId, userId: 'sys',
            newMessage: { role: 'user', parts: [{ text: prompt }] }
        });

        for await (const event of stream) { }

        const finalSession = await sessionService.getSession({ appName: 'hephae-hub', sessionId, userId: 'sys' });
        const state = finalSession?.state || {};

        const poiDetails = state.poiDetails || "No POI data found.";
        const weatherData = state.weatherData || "No weather data found.";
        const eventsData = state.eventsData || "No events data found.";

        return ForecasterAgent.synthesizeForecast(identity, { poiDetails, weatherData, eventsData });
    }

    /** Shared synthesis step — used by both the live path and the cache fast path. */
    private static async synthesizeForecast(
        identity: BaseIdentity,
        context: { poiDetails: string; weatherData: string; eventsData: string; extraContext?: string }
    ): Promise<ForecastResponse> {
        const dateString = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        console.log(`[ForecasterAgent] Intelligence gathered. Synthesizing report...`);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const synthesisModel = genAI.getGenerativeModel({
            model: AgentModels.DEFAULT_FAST_MODEL,
            systemInstruction: "You are an expert Local Foot Traffic Forecaster generating strict JSON based on Intelligence Data.",
        });

        const { poiDetails, weatherData, eventsData, extraContext = '' } = context;

        const analystPrompt = `
      **CURRENT DATE**: ${dateString}
      ${extraContext}

      Your task is to generate exactly a 3-day foot traffic forecast based STRICTLY on the gathered intelligence below for ${identity.name}. Never return more than 3 days in the array.

      ### 1. BUSINESS INTELLIGENCE
      ${poiDetails}

      ### 2. WEATHER INTELLIGENCE
      ${weatherData}

      ### 3. EVENT INTELLIGENCE
      ${eventsData}

      **ANALYSIS RULES**:
      1. **HOURS**: If the business is CLOSED, Traffic Level MUST be "Closed".
      2. **WEATHER**: If Severe Weather is detected, REDUCE traffic scores.
      3. **EVENTS & DISTANCE**: Major nearby events boost traffic scores significantly. Event Venues and Competitors must be added to nearbyPOIs.

      **OUTPUT**:
      Return ONLY valid JSON matching this structure perfectly. Do not include markdown \`\`\`json blocks.
      {
        "business": {
          "name": "${identity.name}",
          "address": "${identity.address || ""}",
          "coordinates": { "lat": ${identity.coordinates?.lat || 0}, "lng": ${identity.coordinates?.lng || 0} },
          "type": "String",
          "nearbyPOIs": [
              { "name": "String", "lat": Number, "lng": Number, "type": "String (e.g. 'Competitor', 'Event Venue', 'School')" }
          ]
        },
        "summary": "Executive summary of the week.",
        "forecast": [
          {
            "date": "YYYY-MM-DD",
            "dayOfWeek": "String",
            "localEvents": ["String"],
            "weatherNote": "String",
            "slots": [
               { "label": "Morning", "score": 0, "level": "Low/Medium/High/Closed", "reason": "String" },
               { "label": "Lunch", "score": 0, "level": "Low/Medium/High/Closed", "reason": "String" },
               { "label": "Afternoon", "score": 0, "level": "Low/Medium/High/Closed", "reason": "String" },
               { "label": "Evening", "score": 0, "level": "Low/Medium/High/Closed", "reason": "String" }
            ]
          }
        ]
      }
    `;

        const response = await synthesisModel.generateContent({
            contents: [{ role: "user", parts: [{ text: analystPrompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        });

        const text = response.response.text();
        try {
            return JSON.parse(text) as ForecastResponse;
        } catch (e) {
            console.error("[ForecasterAgent] Failed to parse Synthesis Output:", text);
            throw new Error("Forecaster API returned malformed JSON.");
        }
    }
}
