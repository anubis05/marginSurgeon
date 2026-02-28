/**
 * Unit tests for commodityFetcher.ts
 *
 * Mocks global fetch and process.env.BLS_API_KEY.
 * Verifies live BLS path, fallback path, and per-commodity data shaping.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllCommodities } from '@/agents/data-sources/commodityFetcher';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeBLSSuccess(latest: number, previous: number) {
    return {
        status: 'REQUEST_SUCCEEDED',
        Results: {
            series: [{
                data: [
                    { value: String(latest) },
                    { value: String(previous) },
                ],
            }],
        },
    };
}

function makeBLSFailure() {
    return { status: 'REQUEST_FAILED', Results: {} };
}

let originalBLSKey: string | undefined;

beforeEach(() => {
    originalBLSKey = process.env.BLS_API_KEY;
    vi.restoreAllMocks();
});

afterEach(() => {
    if (originalBLSKey !== undefined) {
        process.env.BLS_API_KEY = originalBLSKey;
    } else {
        delete process.env.BLS_API_KEY;
    }
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('fetchAllCommodities', () => {
    it('returns live BLS data when key is present and request succeeds', async () => {
        process.env.BLS_API_KEY = 'test-key';

        // All 4 commodities succeed. Prices: latest=3.50, previous=3.00 → +16.7%
        vi.stubGlobal('fetch', vi.fn(async () => ({
            json: async () => makeBLSSuccess(3.50, 3.00),
        })));

        const result = await fetchAllCommodities();

        expect(result.eggs.pricePerUnit).toBe('$3.50/dozen');
        expect(result.eggs.trend30Day).toContain('+16.7%');
        expect(result.eggs.source).toContain('BLS Average Retail Prices');
    });

    it('falls back to static values when BLS_API_KEY is not set', async () => {
        delete process.env.BLS_API_KEY;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const result = await fetchAllCommodities();

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.eggs.source).toContain('Fallback');
        expect(result.beef.source).toContain('Fallback');
        expect(result.poultry.source).toContain('Fallback');
        expect(result.dairy.source).toContain('Fallback');
    });

    it('falls back to static values when BLS API returns an error status', async () => {
        process.env.BLS_API_KEY = 'test-key';
        vi.stubGlobal('fetch', vi.fn(async () => ({
            json: async () => makeBLSFailure(),
        })));

        const result = await fetchAllCommodities();

        expect(result.eggs.source).toContain('Fallback');
    });

    it('shows a negative trend when the price decreased', async () => {
        process.env.BLS_API_KEY = 'test-key';
        vi.stubGlobal('fetch', vi.fn(async () => ({
            json: async () => makeBLSSuccess(2.80, 3.00),  // -6.7%
        })));

        const result = await fetchAllCommodities();
        expect(result.eggs.trend30Day).toContain('-6.7%');
    });

    it('falls back on network exception', async () => {
        process.env.BLS_API_KEY = 'test-key';
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network error'); }));

        const result = await fetchAllCommodities();
        expect(result.eggs.source).toContain('Fallback');
    });

    it('returns all four commodities with correct commodity labels', async () => {
        delete process.env.BLS_API_KEY;

        const result = await fetchAllCommodities();

        expect(result.eggs.commodity).toBe('eggs');
        expect(result.beef.commodity).toBe('beef');
        expect(result.poultry.commodity).toBe('poultry');
        expect(result.dairy.commodity).toBe('dairy');
    });

    it('includes a fetchedAt ISO timestamp', async () => {
        delete process.env.BLS_API_KEY;

        const result = await fetchAllCommodities();

        const ts = new Date(result.eggs.fetchedAt);
        expect(ts.getFullYear()).toBeGreaterThanOrEqual(2024);
    });
});
