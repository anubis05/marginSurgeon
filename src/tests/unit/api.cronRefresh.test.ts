/**
 * Unit tests for /api/cron/weekly-refresh route
 *
 * Mocks listActiveZips and runWeeklyRefresh.
 * Verifies authorization guard, empty-registry early return, success tallies,
 * partial-failure handling, and fatal error response.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockListActiveZips  = vi.fn();
const mockRunWeeklyRefresh = vi.fn();

vi.mock('@/agents/weekly-cache/zipCacheWriter', () => ({
    listActiveZips: mockListActiveZips,
    writeZipCache:  vi.fn(),
    registerZip:    vi.fn(),
}));
vi.mock('@/agents/weekly-cache/weeklyRefreshOrchestrator', () => ({
    runWeeklyRefresh: mockRunWeeklyRefresh,
}));

import { GET } from '@/app/api/cron/weekly-refresh/route';

// ── helpers ───────────────────────────────────────────────────────────────────

const CRON_SECRET = 'supersecret';

function makeRequest(secret?: string): NextRequest {
    const url = 'https://app.test/api/cron/weekly-refresh';
    const headers: Record<string, string> = {};
    if (secret) headers['x-cron-secret'] = secret;
    return new NextRequest(url, { headers });
}

beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/cron/weekly-refresh', () => {
    it('returns 401 when no secret is provided', async () => {
        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when the wrong secret is provided', async () => {
        const res = await GET(makeRequest('wrongsecret'));
        expect(res.status).toBe(401);
    });

    it('returns early with message when no active zips exist', async () => {
        mockListActiveZips.mockResolvedValue([]);

        const res = await GET(makeRequest(CRON_SECRET));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.refreshed).toBe(0);
        expect(mockRunWeeklyRefresh).not.toHaveBeenCalled();
    });

    it('refreshes each zip sequentially and returns tallies', async () => {
        const zips = [
            { zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast', isActive: true, businessCount: 3, addedAt: '' },
            { zipCode: '10001', lat: 40.75, lng: -73.99, region: 'Northeast', isActive: true, businessCount: 7, addedAt: '' },
        ];
        mockListActiveZips.mockResolvedValue(zips);
        mockRunWeeklyRefresh
            .mockResolvedValueOnce({ zipCode: '07030', success: true, durationMs: 12000 })
            .mockResolvedValueOnce({ zipCode: '10001', success: true, durationMs: 9000 });

        const res = await GET(makeRequest(CRON_SECRET));
        const body = await res.json();

        expect(body.refreshed).toBe(2);
        expect(body.failed).toBe(0);
        expect(body.results).toHaveLength(2);
    });

    it('counts failed zip refreshes separately from successes', async () => {
        const zips = [
            { zipCode: '07030', isActive: true },
            { zipCode: '10001', isActive: true },
        ];
        mockListActiveZips.mockResolvedValue(zips);
        mockRunWeeklyRefresh
            .mockResolvedValueOnce({ zipCode: '07030', success: true, durationMs: 5000 })
            .mockResolvedValueOnce({ zipCode: '10001', success: false, error: 'Gemini down', durationMs: 1000 });

        const res = await GET(makeRequest(CRON_SECRET));
        const body = await res.json();

        expect(body.refreshed).toBe(1);
        expect(body.failed).toBe(1);
    });

    it('returns 500 when listActiveZips throws', async () => {
        mockListActiveZips.mockRejectedValue(new Error('Firestore unavailable'));

        const res = await GET(makeRequest(CRON_SECRET));
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toContain('Firestore unavailable');
    });

    it('accepts secret via query param as well as header', async () => {
        mockListActiveZips.mockResolvedValue([]);

        const url = `https://app.test/api/cron/weekly-refresh?secret=${CRON_SECRET}`;
        const req = new NextRequest(url);
        const res = await GET(req);
        expect(res.status).toBe(200);
    });
});
