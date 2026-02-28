/**
 * eventsFetcher — structured event lookup via Gemini + Google Search grounding.
 *
 * Returns structured EventItem[] instead of the markdown text that the
 * on-demand eventsGatherer LlmAgent produces. This allows the weekly cache
 * to store events in a queryable format and lets on-demand agents consume
 * them without needing their own LLM reasoning pass.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentModels } from '../config';
import type { EventItem, EventsData } from '@/lib/types';

export async function fetchEvents(
    zipCode: string,
    lat: number,
    lng: number,
    daysAhead = 7
): Promise<EventsData> {
    if (!process.env.GEMINI_API_KEY) {
        return { items: [], fetchedAt: new Date().toISOString() };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: AgentModels.DEFAULT_FAST_MODEL,
            tools: [{ googleSearch: {} } as any],
        });

        const today = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const prompt = `Today is ${today}. Search for upcoming LOCAL events within the next ${daysAhead} days near zip code ${zipCode} (coordinates: ${lat}, ${lng}).

Include ONLY:
- Community festivals, fairs, street markets
- Concerts, live music, performances
- Sporting events (games, races, tournaments)
- Parades, cultural celebrations, holiday events
- College/school events (graduation, game days)

Return ONLY a JSON array of events. Each event must have:
- "date": "YYYY-MM-DD" (or best estimate)
- "name": event name
- "venue": venue name if known (optional)
- "category": one of "sports" | "music" | "community" | "festival" | "other"
- "estimatedAttendance": one of "small" | "medium" | "large"

If no qualifying events are found, return an empty array [].
Return ONLY valid JSON, no markdown fences, no explanation.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();

        let items: EventItem[] = [];
        try {
            const parsed = JSON.parse(text);
            items = Array.isArray(parsed) ? parsed : [];
        } catch {
            console.warn('[eventsFetcher] Could not parse Gemini JSON response:', text);
        }

        return { items, fetchedAt: new Date().toISOString() };

    } catch (e: any) {
        console.error('[eventsFetcher] Error:', e.message);
        return { items: [], fetchedAt: new Date().toISOString() };
    }
}
