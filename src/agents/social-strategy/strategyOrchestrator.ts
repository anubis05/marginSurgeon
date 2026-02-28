/**
 * Social Strategy Orchestrator
 *
 * Runs the 3-agent pipeline:
 *   Phase 1 (parallel): SocialAuditorAgent + CompetitorSocialAgent
 *   Phase 2 (sequential): SocialStrategistAgent synthesises both
 *
 * Stores the final report in Firestore social_strategy/{slug}.
 */
import { Runner, InMemorySessionService, ParallelAgent } from '@google/adk';
import { SocialAuditorAgent, CompetitorSocialAgent, SocialStrategistAgent } from './socialAuditor';
import { db } from '@/lib/firebase';
import type { EnrichedProfile } from '@/agents/types';
import type { SocialStrategyReport } from '@/lib/types';

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function safeParse<T>(raw: unknown, label: string): T | null {
    if (!raw) return null;
    if (typeof raw === 'object') return raw as T;
    try {
        return JSON.parse((raw as string).replace(/```json\n?|\n?```/g, '').trim()) as T;
    } catch (e) {
        console.error(`[SocialStrategy] Could not parse ${label}:`, String(raw).slice(0, 200));
        return null;
    }
}

async function runAgent(agent: any, prompt: string): Promise<string> {
    const sessionService = new InMemorySessionService();
    const sessionId = `social-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const runner = new Runner({ appName: 'hephae-social', agent, sessionService });
    await sessionService.createSession({ appName: 'hephae-social', sessionId, userId: 'sys', state: {} });

    const stream = runner.runAsync({
        sessionId, userId: 'sys',
        newMessage: { role: 'user', parts: [{ text: prompt }] }
    });

    let buf = '';
    for await (const ev of stream) {
        const e = ev as any;
        if (e.content?.parts) for (const p of e.content.parts) if (p.text) buf += p.text;
    }
    return buf;
}

async function runParallelPhase(identity: EnrichedProfile): Promise<{ ownAudit: any; competitorProfiles: any }> {
    // Run both auditors concurrently via ADK ParallelAgent
    const gatherPipeline = new ParallelAgent({
        name: 'SocialGatherPipeline',
        description: 'Audits own social and competitors simultaneously',
        subAgents: [SocialAuditorAgent, CompetitorSocialAgent]
    });

    const sessionService = new InMemorySessionService();
    const sessionId = `social-gather-${Date.now()}`;
    const runner = new Runner({ appName: 'hephae-social', agent: gatherPipeline, sessionService });
    await sessionService.createSession({ appName: 'hephae-social', sessionId, userId: 'sys', state: {} });

    const prompt = `
BUSINESS NAME: ${identity.name}
ADDRESS: ${identity.address ?? 'Unknown'}
OFFICIAL URL: ${identity.officialUrl}
KNOWN SOCIAL LINKS: ${JSON.stringify(identity.socialLinks ?? {})}
COMPETITORS: ${JSON.stringify(identity.competitors ?? [])}

Please audit the business's own social media channels AND profile each competitor's social presence.`;

    const stream = runner.runAsync({
        sessionId, userId: 'sys',
        newMessage: { role: 'user', parts: [{ text: prompt }] }
    });
    for await (const _ of stream) { }

    const session = await sessionService.getSession({ appName: 'hephae-social', sessionId, userId: 'sys' });
    const state = session?.state ?? {};

    return {
        ownAudit:          safeParse(state.socialAudit, 'socialAudit') ?? [],
        competitorProfiles: safeParse(state.competitorSocialProfiles, 'competitorSocialProfiles') ?? [],
    };
}

export async function runSocialStrategyAnalysis(identity: EnrichedProfile): Promise<SocialStrategyReport> {
    console.log(`[SocialStrategy] Starting analysis for: ${identity.name}`);

    // ── Phase 1: Parallel data gather ─────────────────────────────────────────
    const { ownAudit, competitorProfiles } = await runParallelPhase(identity);
    console.log(`[SocialStrategy] Phase 1 done — ${ownAudit.length} channels, ${competitorProfiles.length} competitors`);

    // ── Phase 2: Synthesis ────────────────────────────────────────────────────
    const synthesisPrompt = `
BUSINESS: ${JSON.stringify({ name: identity.name, address: identity.address })}

OWN SOCIAL AUDIT:
${JSON.stringify(ownAudit, null, 2)}

COMPETITOR SOCIAL PROFILES:
${JSON.stringify(competitorProfiles, null, 2)}

Generate the complete SocialStrategyReport JSON.`;

    const rawStrategy = await runAgent(SocialStrategistAgent, synthesisPrompt);
    console.log(`[SocialStrategy] Phase 2 synthesis done`);

    const report = safeParse<SocialStrategyReport>(rawStrategy, 'SocialStrategyReport');
    if (!report) throw new Error('SocialStrategistAgent returned unparseable output');

    report.generatedAt = new Date().toISOString();

    // ── Persist to Firestore ──────────────────────────────────────────────────
    try {
        const slug = slugify(identity.name);
        await db.collection('social_strategy').doc(slug).set(
            { ...report, updatedAt: new Date() },
            { merge: true }
        );
        console.log(`[SocialStrategy] Saved to Firestore social_strategy/${slug}`);
    } catch (e) {
        console.error('[SocialStrategy] Firestore write failed (non-fatal):', e);
    }

    return report;
}
