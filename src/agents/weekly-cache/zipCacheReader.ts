/**
 * zipCacheReader — typed read from weekly_zip_cache/{zipCode}.
 *
 * Always returns null on any error (Firestore unavailable, doc missing,
 * expired, or schema mismatch). Callers fall back to live fetch.
 */
import { db } from '@/lib/firebase';
import type { ZipWeeklyCache, WeeklySynthesis, CommoditiesData, ZipRawData } from '@/lib/types';

const COLLECTION = 'weekly_zip_cache';
const SCHEMA_VERSION = 1;

export const ZipCacheReader = {
    /**
     * Returns the full cached document for a zip code, or null if the cache
     * is missing, expired, or on a different schema version.
     */
    async get(zipCode: string): Promise<ZipWeeklyCache | null> {
        if (!zipCode) return null;
        try {
            const snap = await db.collection(COLLECTION).doc(zipCode).get();
            if (!snap.exists) return null;

            const data = snap.data() as ZipWeeklyCache;
            if (data?.meta?.schemaVersion !== SCHEMA_VERSION) return null;
            if (new Date(data.meta.expiresAt) < new Date()) return null;

            return data;
        } catch (e) {
            console.warn(`[ZipCacheReader] Could not read ${zipCode}:`, e);
            return null;
        }
    },

    /** Convenience: return only the synthesis block. */
    async getSynthesis(zipCode: string): Promise<WeeklySynthesis | null> {
        const doc = await ZipCacheReader.get(zipCode);
        return doc?.synthesis ?? null;
    },

    /** Convenience: return only the commodities snapshot. */
    async getCommodities(zipCode: string): Promise<CommoditiesData | null> {
        const doc = await ZipCacheReader.get(zipCode);
        return doc?.raw?.commodities ?? null;
    },

    /** Convenience: return only the raw data block. */
    async getRaw(zipCode: string): Promise<ZipRawData | null> {
        const doc = await ZipCacheReader.get(zipCode);
        return doc?.raw ?? null;
    },
};
