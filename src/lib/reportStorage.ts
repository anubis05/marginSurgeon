import * as admin from 'firebase-admin';
import { storage, db } from './firebase';
import { StorageConfig } from '@/agents/config';
import { EnrichedProfile } from '@/agents/types';

export type ReportType = 'profile' | 'margin' | 'traffic' | 'seo' | 'competitive';

export interface SaveReportOptions {
    slug: string;
    type: ReportType;
    htmlContent: string;
    identity?: Partial<EnrichedProfile>;
    summary?: string;
    rawData?: unknown;
}

/**
 * Converts a business name to a URL-safe slug.
 * e.g. "Bosphorus Nutley" → "bosphorus-nutley"
 */
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/**
 * Uploads an HTML report to GCS and indexes its metadata in Firestore.
 * Returns the public URL. Wrapped in try/catch — failures only log a warning,
 * never throw to callers.
 */
export async function saveReport(opts: SaveReportOptions): Promise<string> {
    const { slug, type, htmlContent, identity, summary, rawData } = opts;
    const ts = Date.now();
    const fileName = `${type}-${ts}.html`;
    const objectPath = `${slug}/${fileName}`;
    const publicUrl = `${StorageConfig.BASE_URL}/${objectPath}`;

    try {
        // Upload to GCS
        const file = storage.file(objectPath);
        await file.save(htmlContent, {
            contentType: 'text/html; charset=utf-8',
            metadata: {
                cacheControl: 'public, max-age=3600',
            },
        });

        // Make object publicly readable
        await file.makePublic();

        console.log(`[ReportStorage] Uploaded ${objectPath} → ${publicUrl}`);

        // Upsert Firestore document
        const docRef = db.collection('businesses').doc(slug);
        const reportEntry = {
            type,
            url: publicUrl,
            createdAt: new Date(ts).toISOString(),
            summary: summary || '',
        };

        const updatePayload: Record<string, unknown> = {
            lastUpdated: new Date(ts).toISOString(),
            reports: admin.firestore.FieldValue.arrayUnion(reportEntry),
        };

        if (identity) {
            if (identity.name) updatePayload.name = identity.name;
            if (identity.address) updatePayload.address = identity.address;
            if (identity.officialUrl) updatePayload.officialUrl = identity.officialUrl;
            if (type === 'profile' && rawData) {
                updatePayload.profile = rawData;
            }
        }

        await docRef.set(updatePayload, { merge: true });
        console.log(`[ReportStorage] Firestore updated for businesses/${slug}`);

        return publicUrl;
    } catch (err) {
        console.warn(`[ReportStorage] Non-fatal: failed to save ${type} report for ${slug}:`, err);
        return '';
    }
}
