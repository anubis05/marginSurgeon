/**
 * Unit tests for ZipCacheReader
 *
 * Mocks @/lib/firebase so no real Firestore connection is needed.
 * Covers: cache miss, expired doc, schema mismatch, valid doc, convenience methods.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ZipWeeklyCache } from '@/lib/types';

// ── Firebase mock ─────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('@/lib/firebase', () => ({
    db: { collection: mockCollection },
}));

import { ZipCacheReader } from '@/agents/weekly-cache/zipCacheReader';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeCacheDoc(overrides: Partial<ZipWeeklyCache> = {}): ZipWeeklyCache {
    const now = new Date();
    const refreshedAt = now.toISOString();
    const expiresAt   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return {
        meta: {
            zipCode: '07030',
            lat: 40.74,
            lng: -74.03,
            region: 'Northeast',
            schemaVersion: 1,
            refreshedAt,
            expiresAt,
        },
        raw: {
            weather:        { source: 'NWS', forecast: [] },
            events:         { items: [], fetchedAt: refreshedAt },
            venues:         { places: [], fetchedAt: refreshedAt },
            commodities:    { eggs: {} as any, beef: {} as any, poultry: {} as any, dairy: {} as any },
            macroeconomic:  { region: 'Northeast', cpiYoY: '3.2%', foodAwayFromHomeYoY: '4.1%', unemployment: '4.1', medianHHI: '74580', source: 'BLS+FRED', fetchedAt: refreshedAt },
        },
        synthesis: {
            zipCode: '07030',
            weekOf: '2026-03-02',
            synthesizedAt: refreshedAt,
            trafficOutlook: {
                overallRating: 'moderate',
                peakDay: 'Saturday',
                riskWindows: [],
                boostWindows: [],
                keyDrivers: [],
                weeklyHeadline: 'Steady week ahead.',
            },
            commodityAlerts:    [],
            economicContext:    { consumerPressure: 'moderate', priceIncreaseSafety: 'safe_small', unemploymentRate: 4.1, cpiYoY: 3.2, headline: 'Stable economy.' },
            competitorLandscape: { totalVenuesInRadius: 10, saturationLevel: 'medium', dominantCuisines: [], whiteSpaceOpportunities: [], averagePricePoint: '$15', threatLevel: 'medium', headline: 'Moderate competition.' },
            weeklyBullets:      ['Busy weekend expected'],
            agentHints:         { forecaster: 'hint', surgeon: 'hint', advisor: 'hint', seo: 'hint' },
        },
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.mockReturnValue({ doc: mockDoc });
    mockDoc.mockReturnValue({ get: mockGet });
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ZipCacheReader.get', () => {
    it('returns null when doc does not exist', async () => {
        mockGet.mockResolvedValue({ exists: false });
        expect(await ZipCacheReader.get('07030')).toBeNull();
    });

    it('returns null when expiresAt is in the past', async () => {
        const expired = makeCacheDoc();
        expired.meta.expiresAt = new Date(Date.now() - 1000).toISOString();
        mockGet.mockResolvedValue({ exists: true, data: () => expired });

        expect(await ZipCacheReader.get('07030')).toBeNull();
    });

    it('returns null when schemaVersion does not match', async () => {
        const doc = makeCacheDoc();
        (doc.meta as any).schemaVersion = 99;
        mockGet.mockResolvedValue({ exists: true, data: () => doc });

        expect(await ZipCacheReader.get('07030')).toBeNull();
    });

    it('returns the document when valid and fresh', async () => {
        const doc = makeCacheDoc();
        mockGet.mockResolvedValue({ exists: true, data: () => doc });

        const result = await ZipCacheReader.get('07030');
        expect(result).not.toBeNull();
        expect(result?.meta.zipCode).toBe('07030');
    });

    it('returns null on Firestore error (graceful degradation)', async () => {
        mockGet.mockRejectedValue(new Error('Firestore unavailable'));
        expect(await ZipCacheReader.get('07030')).toBeNull();
    });

    it('returns null for an empty zipCode', async () => {
        expect(await ZipCacheReader.get('')).toBeNull();
        expect(mockGet).not.toHaveBeenCalled();
    });
});

describe('ZipCacheReader.getSynthesis', () => {
    it('returns synthesis when cache is warm', async () => {
        const doc = makeCacheDoc();
        mockGet.mockResolvedValue({ exists: true, data: () => doc });

        const synthesis = await ZipCacheReader.getSynthesis('07030');
        expect(synthesis?.weeklyHeadline ?? synthesis?.trafficOutlook.weeklyHeadline).toBeTruthy();
    });

    it('returns null when cache is cold', async () => {
        mockGet.mockResolvedValue({ exists: false });
        expect(await ZipCacheReader.getSynthesis('07030')).toBeNull();
    });
});

describe('ZipCacheReader.getCommodities', () => {
    it('returns commodities when cache is warm', async () => {
        const doc = makeCacheDoc();
        mockGet.mockResolvedValue({ exists: true, data: () => doc });

        const commodities = await ZipCacheReader.getCommodities('07030');
        expect(commodities).not.toBeNull();
        expect(commodities).toHaveProperty('eggs');
    });

    it('returns null when cache is cold', async () => {
        mockGet.mockResolvedValue({ exists: false });
        expect(await ZipCacheReader.getCommodities('07030')).toBeNull();
    });
});
