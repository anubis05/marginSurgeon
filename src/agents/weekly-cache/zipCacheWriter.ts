/**
 * zipCacheWriter — writes a fully assembled ZipWeeklyCache document to Firestore
 * and updates the zip_registry entry for the refreshed zip code.
 */
import { db } from '@/lib/firebase';
import type { ZipWeeklyCache, ZipRegistryEntry } from '@/lib/types';

const CACHE_COLLECTION    = 'weekly_zip_cache';
const REGISTRY_COLLECTION = 'zip_registry';
const SEVEN_DAYS_MS       = 7 * 24 * 60 * 60 * 1000;

export async function writeZipCache(doc: Omit<ZipWeeklyCache, 'meta'> & {
    meta: Omit<ZipWeeklyCache['meta'], 'refreshedAt' | 'expiresAt' | 'schemaVersion'>;
}): Promise<void> {
    const now = new Date();
    const refreshedAt = now.toISOString();
    const expiresAt   = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString();

    const fullDoc: ZipWeeklyCache = {
        ...doc,
        meta: {
            ...doc.meta,
            schemaVersion: 1,
            refreshedAt,
            expiresAt,
        },
    };

    const { zipCode } = fullDoc.meta;

    await db.collection(CACHE_COLLECTION).doc(zipCode).set(fullDoc);
    console.log(`[ZipCacheWriter] Written weekly_zip_cache/${zipCode} (expires ${expiresAt})`);

    // Update registry timestamp
    try {
        await db.collection(REGISTRY_COLLECTION).doc(zipCode).set(
            { lastRefreshedAt: refreshedAt },
            { merge: true }
        );
    } catch (e) {
        console.warn(`[ZipCacheWriter] Could not update registry for ${zipCode}:`, e);
    }
}

/** Register a zip code so the cron job will include it in future runs. */
export async function registerZip(entry: ZipRegistryEntry): Promise<void> {
    await db.collection(REGISTRY_COLLECTION).doc(entry.zipCode).set(
        { ...entry, isActive: true },
        { merge: true }
    );
}

/** Read all active zip codes from the registry. */
export async function listActiveZips(): Promise<ZipRegistryEntry[]> {
    const snap = await db.collection(REGISTRY_COLLECTION)
        .where('isActive', '==', true)
        .get();
    return snap.docs.map(d => d.data() as ZipRegistryEntry);
}
