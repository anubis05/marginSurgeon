/**
 * Unit tests for venueFetcher.ts
 *
 * Mocks global fetch and FOURSQUARE_API_KEY env var.
 * Verifies happy path, missing key, API error, and response shaping.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNearbyVenues } from '@/agents/data-sources/venueFetcher';

function makeFoursquareResult(overrides: Partial<any> = {}) {
    return {
        fsq_id: 'abc123',
        name: 'Test Venue',
        categories: [{ name: 'Italian Restaurant' }],
        distance: 450,
        geocodes: { main: { latitude: 40.71, longitude: -74.00 } },
        popularity: 0.85,
        ...overrides,
    };
}

let originalKey: string | undefined;
beforeEach(() => { originalKey = process.env.FOURSQUARE_API_KEY; vi.restoreAllMocks(); });
afterEach(() => {
    if (originalKey !== undefined) process.env.FOURSQUARE_API_KEY = originalKey;
    else delete process.env.FOURSQUARE_API_KEY;
});

describe('fetchNearbyVenues', () => {
    it('returns mapped venue list on success', async () => {
        process.env.FOURSQUARE_API_KEY = 'fsq-key';
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({ results: [makeFoursquareResult()] }),
        })));

        const result = await fetchNearbyVenues(40.71, -74.00, 1500);

        expect(result.places).toHaveLength(1);
        expect(result.places[0].fsq_id).toBe('abc123');
        expect(result.places[0].name).toBe('Test Venue');
        expect(result.places[0].category).toBe('Italian Restaurant');
        expect(result.places[0].distance).toBe(450);
        expect(result.places[0].popularity).toBe(0.85);
    });

    it('returns empty places when FOURSQUARE_API_KEY is not set', async () => {
        delete process.env.FOURSQUARE_API_KEY;
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const result = await fetchNearbyVenues(40.71, -74.00);

        expect(fetchMock).not.toHaveBeenCalled();
        expect(result.places).toHaveLength(0);
    });

    it('returns empty places when Foursquare returns non-ok status', async () => {
        process.env.FOURSQUARE_API_KEY = 'fsq-key';
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));

        const result = await fetchNearbyVenues(40.71, -74.00);
        expect(result.places).toHaveLength(0);
    });

    it('returns empty places on network exception', async () => {
        process.env.FOURSQUARE_API_KEY = 'fsq-key';
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));

        const result = await fetchNearbyVenues(40.71, -74.00);
        expect(result.places).toHaveLength(0);
    });

    it('uses "Unknown" category when categories array is absent', async () => {
        process.env.FOURSQUARE_API_KEY = 'fsq-key';
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({ results: [makeFoursquareResult({ categories: [] })] }),
        })));

        const result = await fetchNearbyVenues(40.71, -74.00);
        expect(result.places[0].category).toBe('Unknown');
    });

    it('falls back to search-centre coordinates when geocodes is missing', async () => {
        process.env.FOURSQUARE_API_KEY = 'fsq-key';
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: true,
            json: async () => ({ results: [makeFoursquareResult({ geocodes: undefined })] }),
        })));

        const result = await fetchNearbyVenues(40.71, -74.00);
        expect(result.places[0].lat).toBe(40.71);
        expect(result.places[0].lng).toBe(-74.00);
    });

    it('includes Authorization header with the API key', async () => {
        process.env.FOURSQUARE_API_KEY = 'my-fsq-key';
        let capturedHeaders: any;
        vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
            capturedHeaders = init.headers;
            return { ok: true, json: async () => ({ results: [] }) };
        }));

        await fetchNearbyVenues(40.71, -74.00);
        expect(capturedHeaders.Authorization).toBe('my-fsq-key');
    });

    it('passes the radius in the query string', async () => {
        process.env.FOURSQUARE_API_KEY = 'fsq-key';
        let capturedUrl = '';
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            capturedUrl = url;
            return { ok: true, json: async () => ({ results: [] }) };
        }));

        await fetchNearbyVenues(40.71, -74.00, 800);
        expect(capturedUrl).toContain('radius=800');
    });
});
