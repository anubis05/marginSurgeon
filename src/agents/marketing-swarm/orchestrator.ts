import { CreativeDirectorAgent } from "./creativeDirector";
import { PlatformRouterAgent } from "./platformRouter";
import {
    InstagramCopywriterAgent,
    BlogCopywriterAgent,
    SubstackCopywriterAgent,
    EmailCopywriterAgent,
} from "./copywriters";
import { Runner, InMemorySessionService } from "@google/adk";
import { db } from "@/lib/firebase";

async function runAdkAgent(agent: any, input: string): Promise<string> {
    const sessionService = new InMemorySessionService();
    const sessionId = "marketing-" + Date.now() + Math.random().toString(36).substring(7);
    const runner = new Runner({ appName: 'hephae-marketing', agent, sessionService });

    await sessionService.createSession({ appName: 'hephae-marketing', sessionId, userId: 'sys', state: {} });

    const stream = runner.runAsync({
        sessionId, userId: 'sys',
        newMessage: { role: 'user', parts: [{ text: input }] }
    });

    let textBuffer = "";
    for await (const rawEvent of stream) {
        const event = rawEvent as any;
        if (event.content?.parts) {
            for (const part of event.content.parts) {
                if (part.text) textBuffer += part.text;
            }
        }
    }
    return textBuffer;
}

function safeJsonParse(raw: string, label: string): any {
    try {
        return JSON.parse(raw.replace(/```json|```/gi, '').trim());
    } catch (e) {
        console.error(`[Marketing Swarm] Failed to parse ${label}:`, raw.slice(0, 200));
        throw new Error(`JSON parse failed for ${label}`);
    }
}

/**
 * Main marketing pipeline entry point.
 *
 * @param report     The full report object (SurgicalReport, ForecastResponse, etc.)
 * @param source     Human-readable capability name e.g. "Margin Surgery"
 * @param reportUrl  Optional public GCS URL for the interactive HTML report
 */
export async function generateAndDraftMarketingContent(
    report: any,
    source: string,
    reportUrl?: string
): Promise<void> {
    console.log(`[Marketing Swarm] 🚀 Background Generation Triggered for "${source}" report.`);

    try {
        // ── 1. Creative Director: find the hook ────────────────────────────
        console.log("[Marketing Swarm] Executing CreativeDirectorAgent...");
        const directorRaw = await runAdkAgent(CreativeDirectorAgent, JSON.stringify(report));
        const directorPayload = safeJsonParse(directorRaw, 'CreativeDirector');

        // ── 2. Platform Router: choose channel ─────────────────────────────
        console.log("[Marketing Swarm] Executing PlatformRouterAgent...");
        const routerInput = JSON.stringify({ ...directorPayload, source_capability: source });
        const routerRaw = await runAdkAgent(PlatformRouterAgent, routerInput);
        const routerPayload = safeJsonParse(routerRaw, 'PlatformRouter');
        const platform: string = routerPayload.platform;
        console.log(`[Marketing Swarm] Routing to ${platform} Copywriter...`);

        // ── 3. Copywriting: platform-specific agent ────────────────────────
        const businessName: string = report.identity?.name || "Unknown Business";
        const baseInput = {
            ...directorPayload,
            restaurant_name: businessName,
            report_url: reportUrl ?? null,
        };

        let finalCopy = "";
        let subject: string | undefined;

        if (platform === "Instagram" || platform === "Facebook") {
            const captionPayload = safeJsonParse(
                await runAdkAgent(InstagramCopywriterAgent, JSON.stringify({
                    ...baseInput,
                    social_handle: report.identity?.socialLinks?.instagram
                        || report.identity?.socialLinks?.facebook
                        || "",
                })),
                'InstagramCopywriter'
            );
            finalCopy = captionPayload.caption;

        } else if (platform === "Substack") {
            const substackPayload = safeJsonParse(
                await runAdkAgent(SubstackCopywriterAgent, JSON.stringify(baseInput)),
                'SubstackCopywriter'
            );
            subject  = substackPayload.subject;
            finalCopy = substackPayload.body;

        } else if (platform === "Email") {
            const emailPayload = safeJsonParse(
                await runAdkAgent(EmailCopywriterAgent, JSON.stringify({
                    ...baseInput,
                    contact_email: report.identity?.contactInfo?.email ?? null,
                })),
                'EmailCopywriter'
            );
            subject  = emailPayload.subject;
            finalCopy = emailPayload.body;

        } else {
            // Blog fallback
            const draftPayload = safeJsonParse(
                await runAdkAgent(BlogCopywriterAgent, JSON.stringify(baseInput)),
                'BlogCopywriter'
            );
            finalCopy = draftPayload.draft;
        }

        // ── 4. Persist draft to Firestore ──────────────────────────────────
        const dbRef = db.collection('marketing_drafts').doc();
        await dbRef.set({
            business_name: businessName,
            source_capability: source,
            platform,
            strategy_hook:  directorPayload.hook,
            data_point:     directorPayload.data_point,
            subject:        subject ?? null,
            copy:           finalCopy,
            report_url:     reportUrl ?? null,
            status:         'draft',
            created_at:     new Date(),
        });

        console.log(`[Marketing Swarm] ✅ Draft saved to Firestore (ID: ${dbRef.id}, platform: ${platform})`);

    } catch (e: any) {
        console.error("[Marketing Swarm] ❌ Pipeline Failed:", e.message);
    }
}
