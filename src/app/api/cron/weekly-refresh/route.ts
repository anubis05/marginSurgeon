/**
 * GET /api/cron/weekly-refresh
 *
 * Triggered weekly by Vercel Cron (vercel.json):
 *   { "crons": [{ "path": "/api/cron/weekly-refresh", "schedule": "0 3 * * 1" }] }
 *
 * Also callable manually from the admin dashboard with the CRON_SECRET header.
 * Reads all active entries from zip_registry, then refreshes each in sequence
 * (sequential to avoid Firestore write storms on large registries).
 *
 * A single zip failure does not abort the remaining zips.
 */
import { NextRequest, NextResponse } from 'next/server';
import { listActiveZips }    from '@/agents/weekly-cache/zipCacheWriter';
import { runWeeklyRefresh }  from '@/agents/weekly-cache/weeklyRefreshOrchestrator';

export const maxDuration = 300; // 5 minutes (Vercel Pro / Enterprise)

export async function GET(req: NextRequest) {
    // Verify CRON_SECRET so the endpoint is not publicly triggerable
    const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const zips = await listActiveZips();
        if (zips.length === 0) {
            return NextResponse.json({ message: 'No active zip codes in registry.', refreshed: 0 });
        }

        console.log(`[cron/weekly-refresh] Starting refresh for ${zips.length} zip(s)`);

        const results = [];
        for (const entry of zips) {
            const result = await runWeeklyRefresh(entry);
            results.push(result);
        }

        const succeeded = results.filter(r => r.success).length;
        const failed    = results.filter(r => !r.success).length;

        return NextResponse.json({
            message:   `Weekly refresh complete.`,
            refreshed: succeeded,
            failed,
            results,
        });

    } catch (e: any) {
        console.error('[cron/weekly-refresh] Fatal error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
