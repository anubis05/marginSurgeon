/**
 * POST /api/capabilities/social-strategy
 *
 * Runs the full Social Media Strategy analysis pipeline:
 *   1. SocialAuditorAgent   — audits the target business's own channels
 *   2. CompetitorSocialAgent — profiles each competitor's social presence
 *   3. SocialStrategistAgent — synthesises into a SocialStrategyReport
 *   4. exportReport          — generates interactive HTML, uploads to GCS
 *   5. generateAndDraftMarketingContent — fires off marketing swarm in background
 *
 * Requires the EnrichedProfile (from /api/discover) in the request body so
 * the agent already has competitor names, URLs, and known social links.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runSocialStrategyAnalysis } from '@/agents/social-strategy/strategyOrchestrator';
import { exportReport } from '@/lib/reportExporter';
import { generateAndDraftMarketingContent } from '@/agents/marketing-swarm/orchestrator';
import type { EnrichedProfile } from '@/agents/types';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const identity: EnrichedProfile = body.identity;

        if (!identity?.name) {
            return NextResponse.json({ error: 'Missing identity. Run discovery first.' }, { status: 400 });
        }

        if (!identity.competitors || identity.competitors.length === 0) {
            return NextResponse.json(
                { error: 'No competitors found. Run discovery first to populate competitor list.' },
                { status: 400 }
            );
        }

        console.log(`[API/SocialStrategy] Starting analysis for: ${identity.name}`);

        // ── Phase 1+2+3: Run the agent pipeline ───────────────────────────────
        const report = await runSocialStrategyAnalysis(identity);

        // ── Phase 4: Export to GCS ────────────────────────────────────────────
        const reportWithIdentity = { ...report, identity };
        const exported = await exportReport(
            'social-strategy',
            reportWithIdentity,
            { businessName: identity.name }
        ).catch(() => null);

        const reportUrl = exported?.publicUrl;
        if (reportUrl) {
            report.reportUrl = reportUrl;
        }

        // ── Phase 5: Trigger marketing swarm (background, non-blocking) ───────
        generateAndDraftMarketingContent(
            reportWithIdentity,
            'Social Strategy',
            reportUrl
        ).catch(console.error);

        console.log(`[API/SocialStrategy] Done for ${identity.name}. Score: ${report.overallScore}`);

        return NextResponse.json(report);

    } catch (e: any) {
        console.error('[API/SocialStrategy] Failed:', e.message);
        return NextResponse.json({ error: e.message || 'Social strategy analysis failed.' }, { status: 500 });
    }
}
