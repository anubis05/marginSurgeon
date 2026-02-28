import { NextRequest, NextResponse } from "next/server";
import { discoveryParallelAgent } from '@/agents/discovery/discoverySubAgents';
import { BaseIdentity, EnrichedProfile } from '@/agents/types';
import { Runner, InMemorySessionService } from "@google/adk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '@/lib/firebase';

export const maxDuration = 300;

/** Slug used as the Firestore document ID: lower-case, underscores, no special chars */
function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** Parse a JSON string produced by an LLM — handles markdown fences gracefully */
function safeParse<T>(raw: unknown, label: string): T | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'object') return raw as T;
    if (typeof raw !== 'string') return null;
    try {
        return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as T;
    } catch (e) {
        console.warn(`[API/Discover] Could not parse ${label}:`, e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const identity: BaseIdentity = body.identity;

        if (!identity || !identity.officialUrl) {
            return NextResponse.json({ error: "Missing BaseIdentity" }, { status: 400 });
        }

        console.log(`[API/Discover] Spawning ADK Orchestrator for: ${identity.name}`);
        const sessionService = new InMemorySessionService();
        const runner = new Runner({
            appName: 'hephae-hub',
            agent: discoveryParallelAgent,
            sessionService
        });

        const sessionId = "discovery-" + Date.now();
        const userId = "hub-user";

        await sessionService.createSession({
            appName: 'hephae-hub',
            userId,
            sessionId,
            state: {}
        });

        const prompt = `
            Please discover the menu, social links, contact info, Google Maps URL, and exactly 3 local competitors for:
            Name: ${identity.name}
            Address: ${identity.address ?? 'Unknown'}
            URL: ${identity.officialUrl}
        `;

        const stream = runner.runAsync({
            userId,
            sessionId,
            newMessage: { role: 'user', parts: [{ text: prompt }] }
        });

        // Drain the generator to await completion of all sub-agents
        for await (const event of stream) { }

        const finalSession = await sessionService.getSession({ appName: 'hephae-hub', userId, sessionId });
        const state = finalSession?.state || {};

        console.log("[API/Discover] ADK Pipeline Finished. State keys:", Object.keys(state));

        // ── Parse social links ───────────────────────────────────────────────
        const parsedSocials = safeParse<EnrichedProfile['socialLinks']>(state.socialLinks, 'socialLinks') ?? {};

        // ── Parse contact info ───────────────────────────────────────────────
        const parsedContactInfo = safeParse<EnrichedProfile['contactInfo']>(state.contactInfo, 'contactInfo') ?? undefined;

        // ── Parse competitors (with LLM fallback extraction) ─────────────────
        let parsedCompetitors: EnrichedProfile['competitors'] = [];
        const rawCompetitors = state.competitors;

        if (Array.isArray(rawCompetitors)) {
            parsedCompetitors = rawCompetitors;
        } else if (typeof rawCompetitors === 'string') {
            const attempt = safeParse<any[]>(rawCompetitors, 'competitors');
            if (attempt) {
                parsedCompetitors = attempt;
            } else {
                console.warn("[API/Discover] Competitors JSON parse failed — attempting forced Gemini extraction...");
                try {
                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                    const model = genAI.getGenerativeModel({
                        model: "gemini-2.5-flash",
                        generationConfig: { responseMimeType: "application/json" }
                    });
                    const res = await model.generateContent(
                        `Extract exactly 3 local competitors from the following text into a JSON array.
                        Each object must have: "name", "url", "address", "phone", "cuisineType", "priceRange", "reason".
                        Return ONLY the JSON array.
                        TEXT: ${rawCompetitors}`
                    );
                    parsedCompetitors = JSON.parse(res.response.text());
                } catch (extractErr) {
                    console.error("[API/Discover] Forced extraction failed", extractErr);
                }
            }
        }

        // ── Assemble enriched profile ────────────────────────────────────────
        const enrichedProfile: EnrichedProfile = {
            ...identity,
            menuScreenshotBase64: state.menuScreenshotBase64 as string | undefined,
            socialLinks: Object.keys(parsedSocials ?? {}).length > 0 ? parsedSocials : undefined,
            contactInfo: parsedContactInfo,
            googleMapsUrl: typeof state.googleMapsUrl === 'string' && state.googleMapsUrl.startsWith('http')
                ? state.googleMapsUrl
                : undefined,
            competitors: parsedCompetitors && parsedCompetitors.length > 0 ? parsedCompetitors : undefined,
            discoveredAt: new Date().toISOString(),
        };

        // ── Persist to Firestore profiles/{slug} ─────────────────────────────
        try {
            const slug = slugify(identity.name);
            // Strip the large base64 screenshot before storing — keep profile lean
            const { menuScreenshotBase64: _screenshot, ...profileToStore } = enrichedProfile;
            await db.collection('profiles').doc(slug).set(profileToStore, { merge: true });
            console.log(`[API/Discover] Profile saved to Firestore profiles/${slug}`);
        } catch (fsErr) {
            // Non-fatal — profile write failure should not fail the response
            console.error("[API/Discover] Firestore profile write failed:", fsErr);
        }

        return NextResponse.json(enrichedProfile);

    } catch (error) {
        console.error("[API/Discover] Orchestration Failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
