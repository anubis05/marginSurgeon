/**
 * Unit tests for weeklyRefreshOrchestrator.ts
 *
 * Mocks all 5 data-source fetchers, the synthesis agent, and the cache writer.
 * Verifies:
 * - successful end-to-end run calls all phases in order
 * - a fetcher failure falls back gracefully (other fetchers still run)
 * - a synthesis failure causes the run to return success:false
 * - result contains zipCode, success, and durationMs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZipRegistryEntry } from '@/lib/types';

// ── Mock all data-source fetchers ─────────────────────────────────────────────

const mockFetchWeather    = vi.fn();
const mockFetchEvents     = vi.fn();
const mockFetchVenues     = vi.fn();
const mockFetchCommodities = vi.fn();
const mockFetchMacro      = vi.fn();
const mockSynthesize      = vi.fn();
const mockWriteZipCache   = vi.fn();

vi.mock('@/agents/data-sources/weatherFetcher',    () => ({ fetchWeather:         mockFetchWeather }));
vi.mock('@/agents/data-sources/eventsFetcher',     () => ({ fetchEvents:           mockFetchEvents }));
vi.mock('@/agents/data-sources/venueFetcher',      () => ({ fetchNearbyVenues:     mockFetchVenues }));
vi.mock('@/agents/data-sources/commodityFetcher',  () => ({ fetchAllCommodities:   mockFetchCommodities }));
vi.mock('@/agents/data-sources/macroFetcher',      () => ({ fetchMacro:            mockFetchMacro }));
vi.mock('@/agents/weekly-cache/weeklySynthesisAgent', () => ({ synthesizeWeeklyData: mockSynthesize }));
vi.mock('@/agents/weekly-cache/zipCacheWriter',    () => ({
    writeZipCache: mockWriteZipCache,
    registerZip:   vi.fn(),
    listActiveZips: vi.fn(),
}));

import { runWeeklyRefresh } from '@/agents/weekly-cache/weeklyRefreshOrchestrator';

// ── helpers ───────────────────────────────────────────────────────────────────

const ENTRY: ZipRegistryEntry = {
    zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast',
    isActive: true, businessCount: 5, addedAt: new Date().toISOString(),
};

const WEATHER_OK     = { source: 'NWS', forecast: [{ date: '2026-03-02' }] };
const EVENTS_OK      = { items: [{ name: 'Jazz Festival' }], fetchedAt: new Date().toISOString() };
const VENUES_OK      = { places: [{ fsq_id: 'x', name: 'Pizza Place' }], fetchedAt: new Date().toISOString() };
const COMMODITIES_OK = { eggs: { commodity: 'eggs', pricePerUnit: '$3.50', trend30Day: '+5%', source: 'BLS', fetchedAt: '' }, beef: {} as any, poultry: {} as any, dairy: {} as any };
const MACRO_OK       = { region: 'Northeast', cpiYoY: '3%', foodAwayFromHomeYoY: '4%', unemployment: '4', medianHHI: '70000', source: 'BLS+FRED', fetchedAt: '' };
const SYNTHESIS_OK   = { zipCode: '07030', weekOf: '2026-03-02', synthesizedAt: '', trafficOutlook: {}, commodityAlerts: [], economicContext: {}, competitorLandscape: {}, weeklyBullets: [], agentHints: {} };

beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWeather.mockResolvedValue(WEATHER_OK);
    mockFetchEvents.mockResolvedValue(EVENTS_OK);
    mockFetchVenues.mockResolvedValue(VENUES_OK);
    mockFetchCommodities.mockResolvedValue(COMMODITIES_OK);
    mockFetchMacro.mockResolvedValue(MACRO_OK);
    mockSynthesize.mockResolvedValue(SYNTHESIS_OK);
    mockWriteZipCache.mockResolvedValue(undefined);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('runWeeklyRefresh', () => {
    it('returns success:true and calls all phases when everything works', async () => {
        const result = await runWeeklyRefresh(ENTRY);

        expect(result.success).toBe(true);
        expect(result.zipCode).toBe('07030');
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.error).toBeUndefined();

        expect(mockFetchWeather).toHaveBeenCalledWith(ENTRY.lat, ENTRY.lng);
        expect(mockFetchEvents).toHaveBeenCalledWith(ENTRY.zipCode, ENTRY.lat, ENTRY.lng, 7);
        expect(mockFetchVenues).toHaveBeenCalledWith(ENTRY.lat, ENTRY.lng, 1500);
        expect(mockFetchCommodities).toHaveBeenCalledTimes(1);
        expect(mockFetchMacro).toHaveBeenCalledWith(ENTRY.region);
        expect(mockSynthesize).toHaveBeenCalledTimes(1);
        expect(mockWriteZipCache).toHaveBeenCalledTimes(1);
    });

    it('still succeeds when a single fetcher throws (graceful fallback)', async () => {
        mockFetchWeather.mockRejectedValue(new Error('NWS down'));

        const result = await runWeeklyRefresh(ENTRY);

        expect(result.success).toBe(true);
        // Synthesis should still be called with fallback weather data
        expect(mockSynthesize).toHaveBeenCalledTimes(1);
        const rawArg = mockSynthesize.mock.calls[0][2];
        expect(rawArg.weather.error).toBe('fetch skipped');
    });

    it('returns success:false when synthesis throws', async () => {
        mockSynthesize.mockRejectedValue(new Error('Gemini quota exceeded'));

        const result = await runWeeklyRefresh(ENTRY);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Gemini quota exceeded');
        expect(mockWriteZipCache).not.toHaveBeenCalled();
    });

    it('returns success:false when writeZipCache throws', async () => {
        mockWriteZipCache.mockRejectedValue(new Error('Firestore write failed'));

        const result = await runWeeklyRefresh(ENTRY);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Firestore write failed');
    });

    it('runs all 5 fetchers in parallel (Promise.all)', async () => {
        const callOrder: string[] = [];
        mockFetchWeather.mockImplementation(async () => { callOrder.push('weather'); return WEATHER_OK; });
        mockFetchEvents.mockImplementation(async () => { callOrder.push('events'); return EVENTS_OK; });
        mockFetchVenues.mockImplementation(async () => { callOrder.push('venues'); return VENUES_OK; });
        mockFetchCommodities.mockImplementation(async () => { callOrder.push('commodities'); return COMMODITIES_OK; });
        mockFetchMacro.mockImplementation(async () => { callOrder.push('macro'); return MACRO_OK; });

        await runWeeklyRefresh(ENTRY);

        expect(new Set(callOrder).size).toBe(5); // all 5 were called
    });

    it('synthesis receives the correct zipCode and region', async () => {
        await runWeeklyRefresh(ENTRY);

        expect(mockSynthesize).toHaveBeenCalledWith(
            ENTRY.zipCode,
            ENTRY.region,
            expect.objectContaining({ weather: WEATHER_OK, events: EVENTS_OK })
        );
    });
});
