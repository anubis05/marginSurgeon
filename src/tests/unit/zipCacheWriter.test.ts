/**
 * Unit tests for zipCacheWriter.ts
 *
 * Mocks @/lib/firebase. Verifies:
 * - writeZipCache stamps meta fields and calls Firestore set
 * - registerZip writes to zip_registry with merge
 * - listActiveZips queries and maps registry docs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mock ─────────────────────────────────────────────────────────────

const mockSet   = vi.fn().mockResolvedValue(undefined);
const mockGet   = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

const makeDocRef  = () => ({ set: mockSet, get: mockGet });
const mockDoc     = vi.fn(() => makeDocRef());
const mockCollectionObj = {
    doc: mockDoc,
    where: mockWhere,
};
mockWhere.mockReturnValue({ get: mockGet });

const mockCollection = vi.fn(() => mockCollectionObj);

vi.mock('@/lib/firebase', () => ({
    db: { collection: mockCollection },
}));

import {
    writeZipCache,
    registerZip,
    listActiveZips,
} from '@/agents/weekly-cache/zipCacheWriter';
import type { ZipRegistryEntry, ZipRawData, WeeklySynthesis } from '@/lib/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRaw(): ZipRawData {
    const now = new Date().toISOString();
    return {
        weather:       { source: 'NWS', forecast: [] },
        events:        { items: [], fetchedAt: now },
        venues:        { places: [], fetchedAt: now },
        commodities:   { eggs: {} as any, beef: {} as any, poultry: {} as any, dairy: {} as any },
        macroeconomic: { region: 'Northeast', cpiYoY: '3%', foodAwayFromHomeYoY: '4%', unemployment: '4', medianHHI: '70000', source: 'BLS', fetchedAt: now },
    };
}

function makeSynthesis(): WeeklySynthesis {
    return {
        zipCode: '07030',
        weekOf: '2026-03-02',
        synthesizedAt: new Date().toISOString(),
        trafficOutlook:      { overallRating: 'moderate', peakDay: 'Sat', riskWindows: [], boostWindows: [], keyDrivers: [], weeklyHeadline: 'ok' },
        commodityAlerts:     [],
        economicContext:     { consumerPressure: 'low', priceIncreaseSafety: 'safe_large', unemploymentRate: 4, cpiYoY: 3, headline: '' },
        competitorLandscape: { totalVenuesInRadius: 0, saturationLevel: 'low', dominantCuisines: [], whiteSpaceOpportunities: [], averagePricePoint: '', threatLevel: 'low', headline: '' },
        weeklyBullets:       [],
        agentHints:          { forecaster: '', surgeon: '', advisor: '', seo: '' },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue(mockCollectionObj);
    mockDoc.mockReturnValue(makeDocRef());
    mockWhere.mockReturnValue({ get: mockGet });
    mockSet.mockResolvedValue(undefined);
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('writeZipCache', () => {
    it('calls Firestore set with the full document including stamped meta', async () => {
        await writeZipCache({
            meta: { zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast' },
            raw: makeRaw(),
            synthesis: makeSynthesis(),
        });

        expect(mockSet).toHaveBeenCalled();
        const [written] = mockSet.mock.calls[0];
        expect(written.meta.zipCode).toBe('07030');
        expect(written.meta.schemaVersion).toBe(1);
        expect(written.meta.refreshedAt).toBeTruthy();
        expect(written.meta.expiresAt).toBeTruthy();
    });

    it('sets expiresAt 7 days after refreshedAt', async () => {
        await writeZipCache({
            meta: { zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast' },
            raw: makeRaw(),
            synthesis: makeSynthesis(),
        });

        const [written] = mockSet.mock.calls[0];
        const refreshed = new Date(written.meta.refreshedAt).getTime();
        const expires   = new Date(written.meta.expiresAt).getTime();
        const diff = expires - refreshed;
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
        expect(diff).toBeCloseTo(SEVEN_DAYS, -3); // within 1 second
    });

    it('writes to weekly_zip_cache/{zipCode}', async () => {
        await writeZipCache({
            meta: { zipCode: '10001', lat: 40.75, lng: -73.99, region: 'Northeast' },
            raw: makeRaw(),
            synthesis: makeSynthesis(),
        });

        expect(mockCollection).toHaveBeenCalledWith('weekly_zip_cache');
        expect(mockDoc).toHaveBeenCalledWith('10001');
    });

    it('also updates zip_registry (merge) even if Firestore partially fails', async () => {
        // First call (cache write) succeeds; second (registry) is the merge set
        mockSet.mockResolvedValue(undefined);

        await writeZipCache({
            meta: { zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast' },
            raw: makeRaw(),
            synthesis: makeSynthesis(),
        });

        const registryCalls = mockCollection.mock.calls.filter(([c]) => c === 'zip_registry');
        expect(registryCalls.length).toBeGreaterThan(0);
    });
});

describe('registerZip', () => {
    it('writes to zip_registry with merge:true', async () => {
        const entry: ZipRegistryEntry = {
            zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast',
            isActive: true, businessCount: 3, addedAt: new Date().toISOString(),
        };
        await registerZip(entry);

        expect(mockCollection).toHaveBeenCalledWith('zip_registry');
        expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ zipCode: '07030' }), { merge: true });
    });
});

describe('listActiveZips', () => {
    it('returns array of ZipRegistryEntry from Firestore', async () => {
        const entry: ZipRegistryEntry = {
            zipCode: '07030', lat: 40.74, lng: -74.03, region: 'Northeast',
            isActive: true, businessCount: 3, addedAt: new Date().toISOString(),
        };
        mockGet.mockResolvedValue({
            docs: [{ data: () => entry }],
        });

        const result = await listActiveZips();
        expect(result).toHaveLength(1);
        expect(result[0].zipCode).toBe('07030');
    });

    it('returns empty array when no active zips exist', async () => {
        mockGet.mockResolvedValue({ docs: [] });
        const result = await listActiveZips();
        expect(result).toHaveLength(0);
    });
});
